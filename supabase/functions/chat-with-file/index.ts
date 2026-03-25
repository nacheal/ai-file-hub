import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ─── T-417：全文截断（避免超出 token 限制） ────────────────────────────────────
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

    // ── 4. 获取文档全文（ai_results.full_text） ────────────────────────────────
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: aiResult } = await adminClient
      .from('ai_results')
      .select('full_text')
      .eq('document_id', document_id)
      .single()

    const rawFullText = aiResult?.full_text ?? ''
    const fullText = truncateText(rawFullText)

    // ── 5. 构建 Prompt 消息 ────────────────────────────────────────────────────
    const systemPrompt = `你是一个专业的文件内容助手。用户正在查看文件「${doc.name}」，以下是该文件的全文内容：

---
${fullText || '[该文件暂无可用全文内容]'}
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
