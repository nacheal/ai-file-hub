import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpload } from '@/hooks/useUpload'

export default function UploadZone({ onUploaded }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const { upload, uploading, progress, error, setError } = useUpload()

  function handleFiles(files) {
    const file = files[0]
    if (!file) return
    upload(file).then(doc => {
      if (doc) onUploaded?.(doc)
    })
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleInputChange(e) {
    handleFiles(e.target.files)
    // 重置 input 以便重复上传同名文件
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {/* 拖拽区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Upload size={20} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {uploading ? '上传中…' : '拖拽文件到此处，或点击选择'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            支持 PDF、TXT、MD、PNG、JPG、WebP，最大 50MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
          onChange={handleInputChange}
        />
      </div>

      {/* 上传进度条 */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>上传中</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 mt-0.5 hover:opacity-70"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
