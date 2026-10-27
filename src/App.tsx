import { Navigate, Route, Routes } from 'react-router-dom'
import { SplashScreen } from '@/components/SplashScreen'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { CheckInHistoryPage } from '@/pages/CheckInHistoryPage'
import { CheckInPage } from '@/pages/CheckInPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { HabitDetailPage } from '@/pages/HabitDetailPage'
import { EditHabitPage, NewHabitPage } from '@/pages/HabitFormPage'
import { HabitsPage } from '@/pages/HabitsPage'
import { InsightsPage } from '@/pages/InsightsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PredictionsPage } from '@/pages/PredictionsPage'
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
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/habits/new" element={<NewHabitPage />} />
          <Route path="/habits/:id" element={<HabitDetailPage />} />
          <Route path="/habits/:id/edit" element={<EditHabitPage />} />
          <Route path="/check-ins" element={<CheckInPage />} />
          <Route path="/history" element={<CheckInHistoryPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/predictions" element={<PredictionsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
