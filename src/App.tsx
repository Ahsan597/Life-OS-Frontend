import { lazy, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SplashScreen } from '@/components/SplashScreen'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { GuestRoute } from '@/routes/GuestRoute'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'

// The dashboard and auth pages ship in the main bundle (they're the first thing anyone sees);
// every other page is its own chunk, loaded on first visit.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })))

const HabitsPage = page(() => import('@/pages/HabitsPage'), 'HabitsPage')
const HabitDetailPage = page(() => import('@/pages/HabitDetailPage'), 'HabitDetailPage')
const NewHabitPage = page(() => import('@/pages/HabitFormPage'), 'NewHabitPage')
const EditHabitPage = page(() => import('@/pages/HabitFormPage'), 'EditHabitPage')
const CheckInPage = page(() => import('@/pages/CheckInPage'), 'CheckInPage')
const CheckInHistoryPage = page(() => import('@/pages/CheckInHistoryPage'), 'CheckInHistoryPage')
const InsightsPage = page(() => import('@/pages/InsightsPage'), 'InsightsPage')
const PredictionsPage = page(() => import('@/pages/PredictionsPage'), 'PredictionsPage')
const NotificationsPage = page(() => import('@/pages/NotificationsPage'), 'NotificationsPage')
const SettingsPage = page(() => import('@/pages/SettingsPage'), 'SettingsPage')

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
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
