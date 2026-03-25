import UploadZone from '@/components/file/UploadZone'
import FileList from '@/components/file/FileList'
import { useDocuments } from '@/hooks/useDocuments'

export default function DashboardPage() {
  const { documents, loading, deleteDocument } = useDocuments()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">文件库</h1>
        <p className="mt-1 text-sm text-muted-foreground">上传文件，AI 自动分析生成摘要与标签</p>
      </div>

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
