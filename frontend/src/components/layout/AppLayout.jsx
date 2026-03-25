import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 左侧边栏（桌面端） */}
      <Sidebar />

      {/* 主内容区 */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
