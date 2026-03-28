import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import UploadZone from '@/components/file/UploadZone'
import FileList from '@/components/file/FileList'
import GlobalChatPanel from '@/components/ai/GlobalChatPanel'
import { useDocuments } from '@/hooks/useDocuments'

export default function DashboardPage() {
  const { documents, loading, deleteDocument } = useDocuments()
  const [showGlobalChat, setShowGlobalChat] = useState(false)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">文件库</h1>
          <p className="mt-1 text-sm text-muted-foreground">上传文件，AI 自动分析生成摘要与标签</p>
        </div>

        {/* 全局问答入口按钮 */}
        <button
          onClick={() => setShowGlobalChat(!showGlobalChat)}
          className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <MessageSquare size={16} />
          问所有文件
        </button>
      </div>

      {/* 全局问答面板 */}
      {showGlobalChat && (
        <GlobalChatPanel onClose={() => setShowGlobalChat(false)} />
      )}

      <UploadZone />

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          我的文件（{documents.length}）
        </h2>
        <FileList
          documents={documents}
          loading={loading}
          onDelete={deleteDocument}
        />
      </section>
    </div>
  )
}
