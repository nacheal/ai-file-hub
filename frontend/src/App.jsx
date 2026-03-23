import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/guards/ProtectedRoute'
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

          {/* 受保护路由 */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/file/:id"  element={<FilePage />} />
            <Route path="/search"    element={<SearchPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
