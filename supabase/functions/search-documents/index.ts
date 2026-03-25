import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ─── 提取高亮片段 ──────────────────────────────────────────────────────────────
function extractSnippet(text: string, query: string, maxLen = 120): string {
  if (!text) return ''
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerText.indexOf(lowerQuery)
  if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '')
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + query.length + 80)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

// ─── 主处理函数 ────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

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
    const query: string = (body.query ?? '').trim()

    if (!query || query.length < 1) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. 按文件名搜索（ILIKE） ───────────────────────────────────────────────
    const { data: nameMatches } = await userClient
      .from('documents')
      .select('id, name, size, mime_type, status, created_at')
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    // ── 4. 按 AI 分析内容搜索（summary ILIKE） ────────────────────────────────
    const { data: summaryMatches } = await userClient
      .from('ai_results')
      .select('document_id, summary, tags')
      .ilike('summary', `%${query}%`)
      .limit(20)

    // ── 5. 获取内容匹配的文档详情 ──────────────────────────────────────────────
    const contentDocIds = (summaryMatches ?? []).map((r) => r.document_id)
    let contentDocs: Array<{
      id: string; name: string; size: number; mime_type: string;
      status: string; created_at: string
    }> = []

    if (contentDocIds.length > 0) {
      const { data } = await userClient
        .from('documents')
        .select('id, name, size, mime_type, status, created_at')
        .in('id', contentDocIds)
      contentDocs = data ?? []
    }

    // ── 6. 合并去重，构建结果 ──────────────────────────────────────────────────
    const resultMap = new Map<string, {
      id: string; name: string; size: number; mime_type: string;
      status: string; created_at: string; snippet: string | null; matchType: string
    }>()

    for (const doc of (nameMatches ?? [])) {
      resultMap.set(doc.id, { ...doc, snippet: null, matchType: 'name' })
    }

    for (const doc of contentDocs) {
      if (!resultMap.has(doc.id)) {
        const aiMatch = summaryMatches?.find((m) => m.document_id === doc.id)
        const snippet = extractSnippet(aiMatch?.summary ?? '', query)
        resultMap.set(doc.id, { ...doc, snippet, matchType: 'content' })
      }
    }

    const results = Array.from(resultMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('search-documents error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '服务器内部错误' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
