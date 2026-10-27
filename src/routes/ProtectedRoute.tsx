import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export interface RedirectState {
  from?: { pathname: string; search: string; hash: string }
}

/** Logged-in only. Remembers where the user was going so login can send them back. */
export function ProtectedRoute() {
  const location = useLocation()
  const status = useAuthStore((state) => state.status)

  if (status !== 'authenticated') {
    const state: RedirectState = { from: location }
    return <Navigate to="/login" replace state={state} />
  }

  return <Outlet />
}
