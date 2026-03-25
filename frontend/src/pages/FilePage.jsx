import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  Eye,
  Calendar,
  HardDrive,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/file/StatusBadge'
import DeleteDialog from '@/components/file/DeleteDialog'
import AIResultPanel from '@/components/ai/AIResultPanel'
import FilePreview from '@/components/file/FilePreview'

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────
function FileIcon({ mimeType, size = 40 }) {
  const cls = `text-muted-foreground`
  if (mimeType === 'application/pdf' || mimeType?.startsWith('text/'))
    return <FileText size={size} className={cls} />
  if (mimeType?.startsWith('image/'))
    return <ImageIcon size={size} className={cls} />
  return <File size={size} className={cls} />
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────
export default function FilePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [doc, setDoc] = useState(null)
  const [aiResult, setAiResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  // ── 获取文档详情 ──────────────────────────────────────────────────────────────
  const fetchDoc = useCallback(async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) {
      setNotFound(true)
    } else {
      setDoc(data)
    }
  }, [id])

  // ── 获取 AI 结果 ──────────────────────────────────────────────────────────────
  const fetchAiResult = useCallback(async () => {
    const { data } = await supabase
      .from('ai_results')
      .select('summary, key_points, tags')
      .eq('document_id', id)
      .single()
    if (data) setAiResult(data)
  }, [id])

  // ── 初次加载 ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    Promise.all([fetchDoc(), fetchAiResult()]).finally(() => setLoading(false))
  }, [fetchDoc, fetchAiResult])

  // ── Realtime 订阅（documents 状态变化 + ai_results 新增）────────────────────
  useEffect(() => {
    const docChannel = supabase
      .channel(`doc-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents', filter: `id=eq.${id}` },
        (payload) => setDoc((prev) => ({ ...prev, ...payload.new })),
      )
      .subscribe()

    const aiChannel = supabase
      .channel(`ai-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_results',
          filter: `document_id=eq.${id}`,
        },
        () => fetchAiResult(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(docChannel)
      supabase.removeChannel(aiChannel)
    }
  }, [id, fetchAiResult])

  // ── 删除文件 ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!doc) return
    await supabase.storage.from('user-files').remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    navigate('/dashboard', { replace: true })
  }

  // ── 图片预览：生成签名 URL ────────────────────────────────────────────────────
  async function handlePreview() {
    const { data } = await supabase.storage
      .from('user-files')
      .createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) setPreviewUrl(data.signedUrl)
  }

  // ─── 渲染 ──────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (notFound || !doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-medium text-foreground">文件不存在</p>
        <p className="text-sm text-muted-foreground">该文件可能已被删除</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft size={14} />
          返回文件库
        </button>
      </div>
    )
  }

  const isImage = doc.mime_type?.startsWith('image/')

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          返回
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ── 左栏：文件信息 ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {/* 文件卡片 */}
            <div className="rounded-xl border border-border bg-card p-6">
              {/* 图标 + 名称 */}
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileIcon mimeType={doc.mime_type} size={24} />
                </div>
                <div className="min-w-0">
                  <h1 className="break-all text-sm font-semibold text-foreground leading-snug">
                    {doc.name}
                  </h1>
                  <div className="mt-1">
                    <StatusBadge status={doc.status} />
                  </div>
                </div>
              </div>

              {/* 元信息 */}
              <div className="space-y-2.5 border-t border-border pt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <HardDrive size={12} className="shrink-0" />
                  <span>{formatSize(doc.size)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <File size={12} className="shrink-0" />
                  <span className="truncate">{doc.mime_type}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar size={12} className="mt-0.5 shrink-0" />
                  <span>{formatDate(doc.created_at)}</span>
                </div>
              </div>
            </div>

            {/* 图片预览按钮 */}
            {isImage && (
              <button
                onClick={handlePreview}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/30 transition-colors"
              >
                <Eye size={16} />
                查看图片
              </button>
            )}

            {/* 删除按钮 */}
            <button
              onClick={() => setShowDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={16} />
              删除文件
            </button>
          </div>

          {/* ── 右栏：AI 分析结果 ───────────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <AIResultPanel
              document={doc}
              aiResult={aiResult}
              onRetry={() => {
                setDoc((d) => ({ ...d, status: 'processing' }))
                setAiResult(null)
              }}
            />
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <DeleteDialog
        open={showDelete}
        fileName={doc.name}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      {/* 图片预览模态框 */}
      {previewUrl && (
        <FilePreview
          url={previewUrl}
          name={doc.name}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  )
}
