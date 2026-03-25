import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Image, File, Trash2 } from 'lucide-react'
import StatusBadge from './StatusBadge'
import DeleteDialog from './DeleteDialog'
import { cn } from '@/lib/utils'

function FileIcon({ mimeType }) {
  if (mimeType === 'application/pdf' || mimeType?.startsWith('text/')) {
    return <FileText size={20} className="text-muted-foreground" />
  }
  if (mimeType?.startsWith('image/')) {
    return <Image size={20} className="text-muted-foreground" />
  }
  return <File size={20} className="text-muted-foreground" />
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function FileCard({ doc, onDelete }) {
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/30 cursor-pointer'
        )}
        onClick={() => navigate(`/file/${doc.id}`)}
      >
        {/* 文件图标 */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <FileIcon mimeType={doc.mime_type} />
        </div>

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatSize(doc.size)} · {formatDate(doc.created_at)}
          </p>
        </div>

        {/* 状态 + 删除 */}
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={doc.status} />
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDelete(true)
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <DeleteDialog
        open={showDelete}
        fileName={doc.name}
        onConfirm={async () => {
          await onDelete(doc)
          setShowDelete(false)
        }}
        onCancel={() => setShowDelete(false)}
      />
    </>
  )
}
