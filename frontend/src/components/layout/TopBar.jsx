import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

export default function TopBar() {
  const navigate = useNavigate()

  return (
    <header className="h-14 flex items-center px-6 border-b border-border bg-card shrink-0">
      <button
        onClick={() => navigate('/search')}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-muted-foreground text-sm hover:bg-accent hover:text-accent-foreground transition-colors w-64"
      >
        <Search size={14} />
        搜索文件…
      </button>
    </header>
  )
}
