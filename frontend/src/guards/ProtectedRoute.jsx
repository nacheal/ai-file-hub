import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  // 认证状态加载中，暂不跳转
  if (loading) return null

  // 未登录，跳转登录页
  if (!user) return <Navigate to="/" replace />

  // 已登录，渲染子路由
  return <Outlet />
}
