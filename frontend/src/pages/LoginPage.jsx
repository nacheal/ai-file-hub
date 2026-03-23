import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // 已登录则跳转主页
  useEffect(() => {
    if (!loading && user) navigate('/dashboard')
  }, [user, loading, navigate])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900">AI File Hub</h1>
          <p className="text-gray-500">你的私有 AI 文件助手</p>
        </div>
        <Button onClick={handleLogin} size="lg" className="gap-2">
          使用 GitHub 登录
        </Button>
      </div>
    </div>
  )
}
