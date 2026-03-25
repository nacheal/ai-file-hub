import { Loader2, RefreshCw, AlertCircle, Tag, List, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

// ─── 骨架屏 ────────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

function ProcessingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-blue-600">
        <Loader2 size={14} className="animate-spin" />
        <span>AI 正在分析文件内容，请稍候…</span>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-10/12" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-14 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  )
}

// ─── 主组件 ────────────────────────────────────────────────────────────────────
export default function AIResultPanel({ document, aiResult, onRetry }) {
  const [retrying, setRetrying] = useState(false)

  async function handleRetry() {
    setRetrying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.functions.invoke('analyze-file', {
        body: { document_id: document.id },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      })
    } catch (err) {
      console.error('retry error:', err)
    } finally {
      setRetrying(false)
    }
    if (onRetry) onRetry()
  }

  // 待处理 / 正在分析
  if (document.status === 'pending' || document.status === 'processing') {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">AI 分析结果</h2>
        <ProcessingSkeleton />
      </div>
    )
  }

  // 分析失败
  if (document.status === 'error') {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">AI 分析失败</p>
            <p className="mt-1 text-xs text-muted-foreground">
              文件解析或 AI 调用时发生错误，可以点击重试。
            </p>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="mt-3 flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
            >
              {retrying ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              {retrying ? '重试中…' : '重新分析'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 分析完成但无数据
  if (!aiResult) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">暂无分析结果</p>
      </div>
    )
  }

  // 分析完成 — 展示结果
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <h2 className="text-sm font-semibold text-foreground">AI 分析结果</h2>

      {/* 摘要 */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <FileText size={12} />
          摘要
        </div>
        <p className="text-sm text-foreground leading-relaxed">{aiResult.summary}</p>
      </div>

      {/* 要点 */}
      {aiResult.key_points?.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <List size={12} />
            核心要点
          </div>
          <ul className="space-y-1.5">
            {aiResult.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 标签 */}
      {aiResult.tags?.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Tag size={12} />
            标签
          </div>
          <div className="flex flex-wrap gap-1.5">
            {aiResult.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
