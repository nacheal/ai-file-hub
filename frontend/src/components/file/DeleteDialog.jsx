import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function DeleteDialog({ open, fileName, onConfirm, onCancel }) {
  const [deleting, setDeleting] = useState(false)

  if (!open) return null

  async function handleConfirm() {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    /* 遮罩层 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      {/* 弹窗 */}
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground">确认删除</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          确定要删除文件{' '}
          <span className="font-medium text-foreground">「{fileName}」</span>
          {' '}吗？此操作不可撤销，相关 AI 分析结果也会一并删除。
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={deleting}>
            取消
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={deleting}>
            {deleting ? '删除中…' : '确认删除'}
          </Button>
        </div>
      </div>
    </div>
  )
}
