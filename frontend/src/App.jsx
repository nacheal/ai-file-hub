import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/guards/ProtectedRoute'
import AppLayout     from '@/components/layout/AppLayout'
import LoginPage     from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import FilePage      from '@/pages/FilePage'
import SearchPage    from '@/pages/SearchPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 公开路由 */}
          <Route path="/" element={<LoginPage />} />

          {/* 受保护路由（套 AppLayout） */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/file/:id"  element={<FilePage />} />
              <Route path="/search"    element={<SearchPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
