import type { AuthTokens } from '@/types/auth'

/*
 * Tokens live directly in localStorage (not in React/Zustand state) so every read is fresh.
 * That matters for refresh-token rotation across tabs: another tab may have rotated the
 * tokens a moment ago, and we must never send the old (already used) refresh token.
 */
const ACCESS_TOKEN_KEY = 'lifeos.accessToken'
export const REFRESH_TOKEN_KEY = 'lifeos.refreshToken'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const tokenStorage = {
  getAccessToken: () => read(ACCESS_TOKEN_KEY),
  getRefreshToken: () => read(REFRESH_TOKEN_KEY),

  setTokens({ accessToken, refreshToken }: AuthTokens) {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } catch {
      // Storage unavailable (private mode / blocked); the session just won't survive a reload.
    }
  },

  clear() {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    } catch {
      // ignore
    }
  },
}

// Clean up the persisted Zustand auth blob from the initial setup.
try {
  localStorage.removeItem('life-os-auth')
} catch {
  // ignore
}
