import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Search, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/utils'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: '文件库', icon: LayoutDashboard },
  { to: '/search',    label: '搜索',   icon: Search },
]

export default function Sidebar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <aside className="w-56 flex flex-col border-r border-border bg-card shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border">
        <span className="text-base font-semibold tracking-tight">AI File Hub</span>
      </div>

      {/* 导航链接 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* 用户区域 */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              className="w-7 h-7 rounded-full shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs">
              {user?.email?.[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-sm text-foreground truncate flex-1">
            {user?.user_metadata?.user_name || user?.email}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut size={16} />
          退出登录
        </button>
      </div>
    </aside>
  )
}
