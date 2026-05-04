import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('tdg_token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('youtube_connected') === 'true') {
    window.history.replaceState({}, '', '/')
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
