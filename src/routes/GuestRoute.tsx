import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { RedirectState } from '@/routes/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'

/**
 * Logged-out only (login, register). Once the user is authenticated — including right
 * after a successful login/register — send them where they were going, or the dashboard.
 */
export function GuestRoute() {
  const location = useLocation()
  const status = useAuthStore((state) => state.status)

  if (status === 'authenticated') {
    const from = (location.state as RedirectState | null)?.from
    const to = from ? `${from.pathname}${from.search}${from.hash}` : '/dashboard'
    return <Navigate to={to} replace />
  }

  return <Outlet />
}
