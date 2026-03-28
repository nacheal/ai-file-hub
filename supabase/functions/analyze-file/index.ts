import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { chunkText } from '../_shared/chunk.ts'
import { embedChunks } from '../_shared/embed.ts'

// ─── PDF 文本提取（简单实现，覆盖大部分文本型 PDF）───────────────────────────
async function extractPdfText(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const raw = new TextDecoder('latin1').decode(bytes)

    // 提取 PDF 文本流中的字符串内容
    const lines: string[] = []

    // 匹配 (text) Tj 和 [(text)] TJ 两种格式
    const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g
    let m: RegExpExecArray | null
    while ((m = tjRegex.exec(raw)) !== null) {
      const t = m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\\\/g, '\\')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .trim()
      if (t.length > 1) lines.push(t)
    }

    const result = lines.join(' ').replace(/\s+/g, ' ').trim()
    return result.length > 50 ? result : '[PDF 内容无法提取，请使用文本格式文件]'
  } catch {
    return '[PDF 内容无法提取]'
  }
}

// ─── 调用 DeepSeek API ────────────────────────────────────────────────────────
async function analyzeWithDeepSeek(params: {
  apiKey: string
  filename: string
  mimeType: string
  textContent: string
  imageBase64?: string
}): Promise<{ summary: string; key_points: string[]; tags: string[] }> {
  const { apiKey, filename, mimeType, textContent, imageBase64 } = params

  const isImage = mimeType.startsWith('image/')

  const systemPrompt = `你是一个专业的文件分析助手。用户上传了文件，请对其内容进行分析，并严格按照以下 JSON 格式返回结果（不要包含任何其他文字）：
{
  "summary": "文件的核心内容摘要，2-4句话",
  "key_points": ["要点1", "要点2", "要点3"],
  "tags": ["标签1", "标签2", "标签3"]
}

要求：
- summary：简洁准确，突出核心内容
- key_points：3-5个要点，每个要点一句话
- tags：3-5个关键词标签，简短精炼
- 全部使用中文回答`

  let messages: unknown[]

  if (isImage && imageBase64) {
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpeg'
    const imageType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `请分析这张图片（文件名：${filename}），描述其内容并按格式返回分析结果。`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:${imageType};base64,${imageBase64}` },
          },
        ],
      },
    ]
  } else {
    const truncated =
      textContent.length > 6000 ? textContent.slice(0, 6000) + '\n...[内容已截断]' : textContent
    messages = [
      {
        role: 'user',
        content: `请分析以下文件内容（文件名：${filename}）并按格式返回结果：\n\n${truncated}`,
      },
    ]
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`DeepSeek API 错误: ${response.status} ${err}`)
  }

  const data = await response.json()
  const rawContent: string = data.choices?.[0]?.message?.content ?? ''

  // 提取 JSON（兼容 markdown 代码块包裹）
  const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/) ??
    rawContent.match(/```\s*([\s\S]*?)```/) ??
    rawContent.match(/(\{[\s\S]*\})/)

  const jsonStr = jsonMatch ? jsonMatch[1] ?? jsonMatch[0] : rawContent

  try {
    const parsed = JSON.parse(jsonStr.trim())
    return {
      summary: parsed.summary ?? '分析完成',
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    }
  } catch {
    // JSON 解析失败时降级处理
    return {
      summary: rawContent.slice(0, 200) || '内容分析完成',
      key_points: [],
      tags: [filename.split('.').pop() ?? 'file'],
    }
  }
}

// ─── 主处理函数 ────────────────────────────────────────────────────────────────
serve(async (req) => {
  // 处理 CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')!

  // 管理员客户端（绕过 RLS，写 ai_results 和更新 status 用）
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  let documentId: string | null = null

  try {
    // ── 1. JWT 验证 ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '缺少 Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 用户客户端（自动应用 RLS，确保只能访问自己的文件）
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. 解析请求体 ──────────────────────────────────────────────────────────
    const body = await req.json()
    documentId = body.document_id as string

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'document_id 必填' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. 查询文档（RLS 自动验证归属权）──────────────────────────────────────
    const { data: doc, error: docError } = await userClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: '文档不存在或无权访问' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 4. 更新状态为 processing ───────────────────────────────────────────────
    await adminClient
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    // ── 5. 从 Storage 下载文件 ─────────────────────────────────────────────────
    const { data: fileBlob, error: downloadError } = await adminClient
      .storage
      .from('user-files')
      .download(doc.storage_path)

    if (downloadError || !fileBlob) {
      throw new Error(`文件下载失败: ${downloadError?.message}`)
    }

    // ── 6. 提取文件内容 ────────────────────────────────────────────────────────
    const isImage = (doc.mime_type as string).startsWith('image/')
    let textContent = ''
    let imageBase64: string | undefined

    if (isImage) {
      const ab = await fileBlob.arrayBuffer()
      const uint8 = new Uint8Array(ab)
      // 分块 btoa，避免大文件栈溢出
      let binary = ''
      const chunkSize = 8192
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize))
      }
      imageBase64 = btoa(binary)
    } else if (doc.mime_type === 'application/pdf') {
      textContent = await extractPdfText(fileBlob)
    } else {
      // TXT / MD
      textContent = await fileBlob.text()
    }

    // ── 7. 调用 DeepSeek 分析 ──────────────────────────────────────────────────
    const analysisResult = await analyzeWithDeepSeek({
      apiKey: deepseekApiKey,
      filename: doc.name,
      mimeType: doc.mime_type,
      textContent,
      imageBase64,
    })

    // ── 8. 写入 ai_results 表 ──────────────────────────────────────────────────
    const { error: upsertError } = await adminClient.from('ai_results').upsert({
      document_id: documentId,
      summary: analysisResult.summary,
      key_points: analysisResult.key_points,
      tags: analysisResult.tags,
      full_text: textContent || `[图片文件: ${doc.name}]`,
    })

    if (upsertError) {
      throw new Error(`写入 ai_results 失败: ${upsertError.message}`)
    }

    // ── 8.5 分块与向量化（阶段六新增，失败不影响主流程）────────────────────────
    try {
      // 仅对有文本内容的文件进行分块（图片文件跳过）
      if (textContent && textContent.length > 0 && !isImage) {
        console.log(`[analyze-file] 开始为文档 ${documentId} 进行分块和向量化...`)

        // 1. 文本分块
        const chunks = chunkText(textContent)
        console.log(`[analyze-file] 文本分块完成，共 ${chunks.length} 个块`)

        if (chunks.length > 0) {
          // 2. 生成向量
          const embeddings = await embedChunks(chunks)
          console.log(`[analyze-file] 向量生成完成，共 ${embeddings.length} 个向量`)

          // 3. 准备批量插入数据
          const chunkRecords = chunks.map((content, index) => ({
            document_id: documentId,
            content,
            chunk_index: index,
            embedding: JSON.stringify(embeddings[index]), // pgvector 接受 JSON 数组格式
          }))

          // 4. 批量写入 document_chunks 表（使用 adminClient 绕过 RLS）
          const { error: chunksError } = await adminClient
            .from('document_chunks')
            .insert(chunkRecords)

          if (chunksError) {
            throw new Error(`写入 document_chunks 失败: ${chunksError.message}`)
          }

          console.log(`[analyze-file] 成功写入 ${chunkRecords.length} 条 chunk 记录`)
        } else {
          console.log(`[analyze-file] 文本过短，未生成 chunks`)
        }
      } else {
        console.log(`[analyze-file] 图片文件或无文本内容，跳过分块流程`)
      }
    } catch (chunkingError) {
      // 分块/向量化失败不影响主流程，仅记录日志
      console.error(
        '[analyze-file] 分块/向量化失败（不影响主流程）:',
        chunkingError instanceof Error ? chunkingError.message : String(chunkingError)
      )
    }

    // ── 9. 更新 status 为 done ─────────────────────────────────────────────────
    await adminClient.from('documents').update({ status: 'done' }).eq('id', documentId)

    return new Response(JSON.stringify({ success: true, result: analysisResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('analyze-file error:', error)

    // 有 documentId 时更新状态为 error
    if (documentId) {
      await adminClient
        .from('documents')
        .update({ status: 'error' })
        .eq('id', documentId)
        .catch(() => {})
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '服务器内部错误' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
