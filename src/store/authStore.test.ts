import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types/auth'

const user = { id: 'u1', name: 'Ada', email: 'ada@example.com' } as User

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: 'loading' })
  })

  it('starts in the loading state with no user', () => {
    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'loading' })
  })

  it('setUser stores the user and marks the session authenticated', () => {
    useAuthStore.getState().setUser(user)

    expect(useAuthStore.getState()).toMatchObject({ user, status: 'authenticated' })
  })

  it('setLoggedOut clears the user and marks the session unauthenticated', () => {
    useAuthStore.getState().setUser(user)
    useAuthStore.getState().setLoggedOut()

    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'unauthenticated' })
  })
})
