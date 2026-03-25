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
  MessageCircle,
  Trash,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/file/StatusBadge'
import DeleteDialog from '@/components/file/DeleteDialog'
import AIResultPanel from '@/components/ai/AIResultPanel'
import FilePreview from '@/components/file/FilePreview'
import ChatInput from '@/components/ai/ChatInput'
import ChatOutput from '@/components/ai/ChatOutput'
import { useChat } from '@/hooks/useChat'

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

  const { messages, streaming, error: chatError, sendMessage, clearMessages } = useChat()

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

          {/* ── 右栏：AI 分析结果 + AI 问答 ─────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            <AIResultPanel
              document={doc}
              aiResult={aiResult}
              onRetry={() => {
                setDoc((d) => ({ ...d, status: 'processing' }))
                setAiResult(null)
              }}
            />

            {/* ── AI 问答模块（分析完成后展示） ─────────────────────────────────── */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* 标题栏 */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageCircle size={15} className="text-primary" />
                  AI 问答
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={clearMessages}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Trash size={11} />
                    清空对话
                  </button>
                )}
              </div>

              {/* 对话区 */}
              <div className="px-4 pt-3 pb-2 max-h-96 overflow-y-auto">
                {messages.length === 0 && !streaming ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {doc.status === 'done'
                      ? '基于文件内容提问，AI 将给出针对性回答'
                      : 'AI 分析完成后即可开始问答'}
                  </p>
                ) : (
                  <ChatOutput messages={messages} streaming={streaming} />
                )}
                {/* 错误提示 */}
                {chatError && (
                  <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {chatError}
                  </p>
                )}
              </div>

              {/* 输入区 */}
              <div className="border-t border-border px-4 py-3">
                <ChatInput
                  onSend={(text) => sendMessage(id, text)}
                  streaming={streaming}
                  disabled={doc.status !== 'done'}
                />
              </div>
            </div>
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
