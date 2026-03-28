import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { embedSingleText } from '../_shared/embed.ts'

// ─── 全局 RAG 检索配置 ──────────────────────────────────────────────────────────
const GLOBAL_RAG_CONFIG = {
  TOP_K: 8,                    // 检索最相关的 8 个 chunks（可能来自不同文件）
  MIN_SIMILARITY: 0.5,         // 最小相似度阈值
} as const

// ─── 全局向量检索函数 ──────────────────────────────────────────────────────────
interface GlobalChunkResult {
  content: string
  chunk_index: number
  similarity: number
  document_id: string
  document_name: string
}

async function retrieveGlobalChunks(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  questionEmbedding: number[],
  topK = GLOBAL_RAG_CONFIG.TOP_K,
): Promise<GlobalChunkResult[]> {
  // 1. 获取当前用户所有文件的 chunks
  const { data: chunks, error: chunksError } = await supabaseClient
    .from('document_chunks')
    .select(`
      content,
      chunk_index,
      embedding,
      document_id,
      documents!inner(name, user_id)
    `)
    .eq('documents.user_id', userId)

  if (chunksError) {
    console.error('[retrieveGlobalChunks] 查询失败:', chunksError)
    throw new Error(`全局向量检索失败: ${chunksError.message}`)
  }

  if (!chunks || chunks.length === 0) {
    console.log('[retrieveGlobalChunks] 用户暂无任何 chunks')
    return []
  }

  // 2. 计算余弦相似度并排序
  const results = chunks
    .map((row) => {
      const embedding = typeof row.embedding === 'string'
        ? JSON.parse(row.embedding)
        : Array.isArray(row.embedding)
        ? row.embedding
        : []

      const similarity = cosineSimilarity(questionEmbedding, embedding)

      return {
        content: row.content,
        chunk_index: row.chunk_index,
        similarity,
        document_id: row.document_id,
        document_name: (row.documents as { name: string }).name,
      }
    })
    .filter((r) => r.similarity >= GLOBAL_RAG_CONFIG.MIN_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)

  console.log(`[retrieveGlobalChunks] 从 ${chunks.length} 个 chunks 中检索到 ${results.length} 个相关片段`)

  return results
}

// 计算余弦相似度
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

// ─── 主处理函数 ────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')!

  try {
    // ── 1. JWT 验证 ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '缺少 Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
    const { message, history = [] } = body as {
      message: string
      history: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'message 必填' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. 全局 RAG 向量检索 ───────────────────────────────────────────────────
    console.log('[chat-global] 开始对问题进行向量化...')
    const questionEmbedding = await embedSingleText(message)
    console.log('[chat-global] 问题向量化完成')

    console.log('[chat-global] 开始全局检索相关 chunks...')
    const chunks = await retrieveGlobalChunks(userClient, user.id, questionEmbedding)
    console.log(`[chat-global] 检索到 ${chunks.length} 个相关 chunks`)

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: '未找到相关内容，请先上传文件并完成分析' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ── 4. 拼装上下文（标注来源文件） ────────────────────────────────────────
    const contextText = chunks
      .map((chunk) => {
        return `[来源: ${chunk.document_name} - 段落 ${chunk.chunk_index}]\n${chunk.content}`
      })
      .join('\n\n')

    // 提取引用的文件列表（去重）
    const sourceDocuments = Array.from(
      new Map(
        chunks.map((chunk) => [chunk.document_id, chunk.document_name])
      ).entries()
    ).map(([id, name]) => ({ id, name }))

    // ── 5. 构建 Prompt 消息 ────────────────────────────────────────────────────
    const systemPrompt = `你是一个专业的知识助手。用户正在查询自己上传的所有文件，以下是从这些文件中检索到的与问题最相关的内容片段：

---
${contextText}
---

请根据以上内容片段回答用户的问题。回答时：
1. 如果内容片段中有相关信息，给出准确清晰的回答
2. 如果需要引用特定文件，可以提及文件名
3. 如果内容片段中没有相关信息，请如实告知「未找到相关内容」，不要编造答案
4. 回答要简洁、准确、有帮助`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ]

    // ── 6. 调用 DeepSeek（stream: true） ──────────────────────────────────────
    const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!deepseekRes.ok) {
      const errText = await deepseekRes.text()
      throw new Error(`DeepSeek API 错误: ${deepseekRes.status} ${errText}`)
    }

    // ── 7. 创建自定义 SSE 流（追加 SOURCES 事件） ─────────────────────────────
    const sseHeaders = {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    }

    // 创建 TransformStream 来拦截并追加 SOURCES 事件
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    // 异步处理 DeepSeek 流
    ;(async () => {
      try {
        const reader = deepseekRes.body!.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // 透传原始 SSE 数据
          await writer.write(value)
        }

        // 在流结束后追加 SOURCES 事件
        const sourcesEvent = `event: sources\ndata: ${JSON.stringify(sourceDocuments)}\n\n`
        await writer.write(encoder.encode(sourcesEvent))

        await writer.close()
      } catch (error) {
        console.error('[chat-global] SSE stream error:', error)
        await writer.abort(error)
      }
    })()

    return new Response(readable, { headers: sseHeaders })
  } catch (error) {
    console.error('chat-global error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '服务器内部错误' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
