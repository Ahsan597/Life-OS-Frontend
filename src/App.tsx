import { Navigate, Route, Routes } from 'react-router-dom'
import { SplashScreen } from '@/components/SplashScreen'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { GuestRoute } from '@/routes/GuestRoute'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'

function App() {
  const status = useAuthStore((state) => state.status)

  // The session check runs once from main.tsx; hold every route until it settles.
  if (status === 'loading') return <SplashScreen />

  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Phase 1 features: placeholders until the backend ships them */}
          <Route path="/habits" element={<ComingSoonPage />} />
          <Route path="/check-ins" element={<ComingSoonPage />} />
          <Route path="/history" element={<ComingSoonPage />} />
          <Route path="/insights" element={<ComingSoonPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
