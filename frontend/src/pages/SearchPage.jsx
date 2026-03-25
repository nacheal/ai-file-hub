import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, FileText, Image as ImageIcon, File, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── 文件图标 ──────────────────────────────────────────────────────────────────
function FileIcon({ mimeType }) {
  const cls = 'text-muted-foreground shrink-0'
  if (mimeType === 'application/pdf' || mimeType?.startsWith('text/'))
    return <FileText size={16} className={cls} />
  if (mimeType?.startsWith('image/'))
    return <ImageIcon size={16} className={cls} />
  return <File size={16} className={cls} />
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ─── 高亮关键词 ────────────────────────────────────────────────────────────────
function HighlightText({ text, query }) {
  if (!query || !text) return <span>{text}</span>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-100 text-yellow-900 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [inputValue, setInputValue] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(!!initialQuery)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  // ── 自动聚焦 ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // ── 执行搜索 ──────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('search-documents', {
        body: { query: trimmed },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      })
      if (error) throw error
      setResults(data?.results ?? [])
    } catch (err) {
      console.error('search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // ── 输入防抖（300ms） ──────────────────────────────────────────────────────────
  function handleInputChange(e) {
    const val = e.target.value
    setInputValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQuery(val)
      setSearchParams(val.trim() ? { q: val.trim() } : {}, { replace: true })
      doSearch(val)
    }, 300)
  }

  // ── 回车立即搜索 ───────────────────────────────────────────────────────────────
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      const val = inputValue
      setQuery(val)
      setSearchParams(val.trim() ? { q: val.trim() } : {}, { replace: true })
      doSearch(val)
    }
  }

  // ── 清除搜索 ───────────────────────────────────────────────────────────────────
  function handleClear() {
    setInputValue('')
    setQuery('')
    setResults([])
    setSearched(false)
    setSearchParams({}, { replace: true })
    inputRef.current?.focus()
  }

  // ── 初始查询（URL 带 ?q= 参数时） ─────────────────────────────────────────────
  useEffect(() => {
    if (initialQuery) doSearch(initialQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* 标题 */}
        <h1 className="mb-6 text-xl font-semibold text-foreground">搜索文件</h1>

        {/* 搜索输入框 */}
        <div className="relative mb-8">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入关键词搜索文件名称或 AI 分析内容…"
            className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
          {inputValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 加载中 */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span>搜索中…</span>
          </div>
        )}

        {/* 搜索结果 */}
        {!loading && searched && (
          <>
            {results.length > 0 ? (
              <div className="space-y-2">
                <p className="mb-3 text-xs text-muted-foreground">
                  找到 {results.length} 个相关文件
                </p>
                {results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/file/${item.id}`)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-left hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <FileIcon mimeType={item.mime_type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          <HighlightText text={item.name} query={query} />
                        </p>
                        {item.snippet && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                            <HighlightText text={item.snippet} query={query} />
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatSize(item.size)}</span>
                          <span>·</span>
                          <span>{formatDate(item.created_at)}</span>
                          {item.matchType === 'content' && (
                            <>
                              <span>·</span>
                              <span className="text-primary">内容匹配</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* 空状态 */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Search size={24} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">未找到相关文件</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  尝试用其他关键词搜索，或检查文件是否已上传并完成 AI 分析
                </p>
              </div>
            )}
          </>
        )}

        {/* 初始未搜索状态 */}
        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Search size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">输入关键词开始搜索</p>
          </div>
        )}
      </div>
    </div>
  )
}
