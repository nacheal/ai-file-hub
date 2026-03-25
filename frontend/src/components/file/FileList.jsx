import { useState } from 'react'
import { Search, Inbox } from 'lucide-react'
import FileCard from './FileCard'
import { cn } from '@/lib/utils'

export default function FileList({ documents, loading, onDelete }) {
  const [keyword, setKeyword] = useState('')

  const filtered = keyword.trim()
    ? documents.filter(doc =>
        doc.name.toLowerCase().includes(keyword.toLowerCase())
      )
    : documents

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 搜索过滤 */}
      {documents.length > 0 && (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="过滤文件名…"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className={cn(
              'w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
          />
        </div>
      )}

      {/* 文件列表 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Inbox size={40} strokeWidth={1.5} />
          <p className="text-sm">
            {keyword ? '没有匹配的文件' : '还没有文件，上传第一个文件吧'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <FileCard key={doc.id} doc={doc} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
