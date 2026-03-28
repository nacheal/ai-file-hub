import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { embedSingleText } from '../_shared/embed.ts'

// ─── RAG 检索配置（阶段六）──────────────────────────────────────────────────────
const RAG_CONFIG = {
  TOP_K: 5,                    // 检索最相关的 5 个 chunks
  MIN_SIMILARITY: 0.5,         // 最小相似度阈值
} as const

// ─── 向量检索函数 ──────────────────────────────────────────────────────────────
interface ChunkResult {
  content: string
  chunk_index: number
  similarity: number
}

async function retrieveChunks(
  supabaseClient: ReturnType<typeof createClient>,
  documentId: string,
  questionEmbedding: number[],
  topK = RAG_CONFIG.TOP_K,
): Promise<ChunkResult[]> {
  // pgvector 相似度查询（余弦距离）
  // 注意：我们需要直接查询，因为 pgvector 的相似度需要特殊操作符
  // 这里使用普通查询 + 客户端排序（临时方案，生产环境建议使用 RPC）

  const { data, error } = await supabaseClient
    .from('document_chunks')
    .select('content, chunk_index, embedding')
    .eq('document_id', documentId)

  if (error) {
    console.error('[retrieveChunks] 查询失败:', error)
    throw new Error(`向量检索失败: ${error.message}`)
  }

  if (!data || data.length === 0) {
    console.log('[retrieveChunks] 未找到任何 chunks')
    return []
  }

  // 计算余弦相似度并排序
  const results = data
    .map((row: { content: string; chunk_index: number; embedding: unknown }) => {
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
      }
    })
    .filter((r: ChunkResult) => r.similarity >= RAG_CONFIG.MIN_SIMILARITY)
    .sort((a: ChunkResult, b: ChunkResult) => b.similarity - a.similarity)
    .slice(0, topK)

  return results
}

// 计算余弦相似度（临时实现，与 embed.ts 中的函数相同）
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

// ─── 旧版全文截断（降级方案）────────────────────────────────────────────────────
const MAX_FULL_TEXT_CHARS = 8000

function truncateText(text: string): string {
  if (text.length <= MAX_FULL_TEXT_CHARS) return text
  return text.slice(0, MAX_FULL_TEXT_CHARS) + '\n...[内容已截断，仅展示前 8000 字符]'
}

// ─── 主处理函数 ────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
    const { document_id, message, history = [] } = body as {
      document_id: string
      message: string
      history: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!document_id || !message) {
      return new Response(JSON.stringify({ error: 'document_id 和 message 必填' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. 验证文档归属权（RLS 自动过滤） ────────────────────────────────────
    const { data: doc, error: docError } = await userClient
      .from('documents')
      .select('id, name')
      .eq('id', document_id)
      .single()

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: '文档不存在或无权访问' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 4. RAG 向量检索（阶段六）──────────────────────────────────────────────
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    let contextText = ''
    let useRag = false

    try {
      // 4.1 对用户问题进行向量化
      console.log('[chat-with-file] 开始对问题进行向量化...')
      const questionEmbedding = await embedSingleText(message)
      console.log('[chat-with-file] 问题向量化完成')

      // 4.2 检索最相关的 chunks
      console.log('[chat-with-file] 开始检索相关 chunks...')
      const chunks = await retrieveChunks(userClient, document_id, questionEmbedding)
      console.log(`[chat-with-file] 检索到 ${chunks.length} 个相关 chunks`)

      // 4.3 拼装上下文
      if (chunks.length > 0) {
        useRag = true
        contextText = chunks
          .map((chunk, index) => {
            return `[段落 ${chunk.chunk_index}]\n${chunk.content}`
          })
          .join('\n\n')
        console.log('[chat-with-file] 使用 RAG 模式，基于检索到的 chunks 回答')
      } else {
        console.log('[chat-with-file] 未检索到相关内容，降级到全文模式')
        throw new Error('无相关 chunks，降级到全文模式')
      }
    } catch (ragError) {
      // RAG 失败时降级到旧版全文注入
      console.warn(
        '[chat-with-file] RAG 检索失败，降级到全文模式:',
        ragError instanceof Error ? ragError.message : String(ragError)
      )

      const { data: aiResult } = await adminClient
        .from('ai_results')
        .select('full_text')
        .eq('document_id', document_id)
        .single()

      const rawFullText = aiResult?.full_text ?? ''
      contextText = truncateText(rawFullText)
      useRag = false
    }

    // ── 5. 构建 Prompt 消息 ────────────────────────────────────────────────────
    const systemPrompt = useRag
      ? `你是一个专业的文件内容助手。用户正在查看文件「${doc.name}」，以下是从该文件中检索到的与问题最相关的内容片段：

---
${contextText || '[未找到相关内容]'}
---

请根据以上内容片段回答用户的问题。如果内容片段中没有相关信息，请如实告知用户「文档中未找到相关内容」，不要编造答案。`
      : `你是一个专业的文件内容助手。用户正在查看文件「${doc.name}」，以下是该文件的全文内容：

---
${contextText || '[该文件暂无可用全文内容]'}
---

请根据以上文件内容回答用户的问题。回答要准确、简洁、有帮助。如果问题与文件内容无关，请礼貌地引导用户聚焦于文件内容。`

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
        max_tokens: 1500,
      }),
    })

    if (!deepseekRes.ok) {
      const errText = await deepseekRes.text()
      throw new Error(`DeepSeek API 错误: ${deepseekRes.status} ${errText}`)
    }

    // ── 7. 透传 SSE 流 ─────────────────────────────────────────────────────────
    const sseHeaders = {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    }

    return new Response(deepseekRes.body, { headers: sseHeaders })
  } catch (error) {
    console.error('chat-with-file error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '服务器内部错误' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
