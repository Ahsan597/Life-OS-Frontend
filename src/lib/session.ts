import { toast } from 'sonner'
import { getMe, logout as logoutRequest } from '@/api/auth'
import { onSessionExpired, toApiError } from '@/api/client'
import { queryClient } from '@/lib/queryClient'
import { REFRESH_TOKEN_KEY, tokenStorage } from '@/lib/tokenStorage'
import { useAuthStore } from '@/store/authStore'
import type { AuthResponse } from '@/types/auth'

function endSession() {
  tokenStorage.clear()
  queryClient.clear()
  useAuthStore.getState().setLoggedOut()
}

onSessionExpired(() => {
  const wasLoggedIn = useAuthStore.getState().status !== 'unauthenticated'
  endSession()
  if (wasLoggedIn) {
    // Fixed id so several failing requests only produce one toast.
    toast.info('Your session expired, please log in again.', { id: 'session-expired' })
  }
})

let startupCheck: Promise<void> | null = null

/**
 * Restores the session on app load. Memoised so it runs once per page load even when
 * StrictMode double-invokes effects (and is called outside React in main.tsx anyway).
 */
export function initSession(): Promise<void> {
  startupCheck ??= restoreSession()
  return startupCheck
}

async function restoreSession() {
  const { setUser, setLoggedOut } = useAuthStore.getState()

  if (!tokenStorage.getRefreshToken()) {
    setLoggedOut()
    return
  }

  try {
    // A 401 here is refreshed + retried once by the API client interceptor.
    setUser(await getMe())
  } catch (error) {
    const apiError = toApiError(error)
    if (apiError.status === null) {
      // Server unreachable: keep the tokens so a reload works once it's back.
      toast.error(apiError.message, { id: 'server-offline' })
    } else if (apiError.status === 401) {
      tokenStorage.clear()
    }
    setLoggedOut()
  }
}

/** Saves the tokens from a login/register response and marks the user as logged in */
export function startSession({ user, accessToken, refreshToken }: AuthResponse) {
  tokenStorage.setTokens({ accessToken, refreshToken })
  useAuthStore.getState().setUser(user)
}

export async function logout() {
  const refreshToken = tokenStorage.getRefreshToken()
  if (refreshToken) {
    try {
      await logoutRequest(refreshToken)
    } catch {
      // Logging out locally matters more than the server call succeeding.
    }
  }
  endSession()
  toast.success('Logged out', { id: 'logged-out' })
}

/**
 * Keeps open tabs in sync: logout in one tab logs out the others, login in one logs in the others.
 * Returns a function that removes the listener.
 */
export function syncSessionAcrossTabs(): () => void {
  function handleStorage(event: StorageEvent) {
    // key === null means localStorage.clear() was called
    if (event.key !== REFRESH_TOKEN_KEY && event.key !== null) return

    const { status } = useAuthStore.getState()
    const hasToken = !!tokenStorage.getRefreshToken()

    if (!hasToken && status === 'authenticated') {
      queryClient.clear()
      useAuthStore.getState().setLoggedOut()
      toast.info('You were logged out.', { id: 'logged-out' })
    } else if (hasToken && status === 'unauthenticated') {
      startupCheck = null
      void initSession()
    }
  }

  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}
