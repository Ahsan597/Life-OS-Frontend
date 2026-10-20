import { create } from 'zustand'
import type { User } from '@/types/auth'

/** loading = still checking the stored session on app start */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  user: User | null
  status: AuthStatus
  setUser: (user: User) => void
  setLoggedOut: () => void
}

// Tokens are kept in localStorage via tokenStorage (see src/lib/tokenStorage.ts);
// this store only holds who is logged in, which is re-fetched from /auth/me on load.
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: 'loading',
  setUser: (user) => set({ user, status: 'authenticated' }),
  setLoggedOut: () => set({ user: null, status: 'unauthenticated' }),
}))
