import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  pending:    { label: '待分析',  className: 'bg-muted text-muted-foreground' },
  processing: { label: '分析中',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  done:       { label: '已完成',  className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  error:      { label: '失败',    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.className)}>
      {status === 'processing' && (
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
      )}
      {config.label}
    </span>
  )
}
