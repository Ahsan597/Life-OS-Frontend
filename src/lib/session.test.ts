import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { REFRESH_TOKEN_KEY, tokenStorage } from '@/lib/tokenStorage'
import { API, fakeBackend } from '@/test/fakeBackend'
import { server } from '@/test/setup'

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }))

/**
 * session.ts memoises the startup check at module level (that's what makes it
 * StrictMode-safe), so each test loads fresh copies of the session modules.
 */
async function load() {
  vi.resetModules()
  const session = await import('@/lib/session')
  const { useAuthStore } = await import('@/store/authStore')
  const { toast } = await import('sonner')
  return { ...session, useAuthStore, toast }
}

function storeSeededTokens() {
  const { user, accessToken, refreshToken } = fakeBackend.seedUser()
  tokenStorage.setTokens({ accessToken, refreshToken })
  return { user, accessToken, refreshToken }
}

describe('initSession (app load)', () => {
  it('logs the user out straight away when there is no stored refresh token', async () => {
    const { initSession, useAuthStore } = await load()

    await initSession()

    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(fakeBackend.requests()).toEqual([])
  })

  it('restores the user from /auth/me', async () => {
    const { user } = storeSeededTokens()
    const { initSession, useAuthStore } = await load()

    expect(useAuthStore.getState().status).toBe('loading')
    await initSession()

    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user })
  })

  it('runs only once even if called twice (StrictMode double effects)', async () => {
    storeSeededTokens()
    fakeBackend.expireAccessTokens()
    const { initSession } = await load()

    await Promise.all([initSession(), initSession()])

    expect(fakeBackend.count('GET /auth/me')).toBe(2) // first try + retry after refresh
    expect(fakeBackend.count('POST /auth/refresh')).toBe(1)
    expect(fakeBackend.reuseDetected).toBe(false)
  })

  it('refreshes silently when the access token has expired', async () => {
    const { user } = storeSeededTokens()
    fakeBackend.expireAccessTokens()
    const { initSession, useAuthStore } = await load()

    await initSession()

    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user })
    expect(fakeBackend.requests()).toEqual(['GET /auth/me', 'POST /auth/refresh', 'GET /auth/me'])
  })

  it('logs out and shows "session expired" when the refresh token is rejected', async () => {
    fakeBackend.seedUser()
    tokenStorage.setTokens({ accessToken: 'expired', refreshToken: 'revoked' })
    const { initSession, useAuthStore, toast } = await load()

    await initSession()

    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(tokenStorage.getRefreshToken()).toBeNull()
    expect(toast.info).toHaveBeenCalledWith('Your session expired, please log in again.', expect.anything())
  })

  it('keeps the tokens when the server is offline, so a later reload still works', async () => {
    const { refreshToken } = storeSeededTokens()
    server.use(http.get(`${API}/auth/me`, () => HttpResponse.error()))
    const { initSession, useAuthStore, toast } = await load()

    await initSession()

    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(tokenStorage.getRefreshToken()).toBe(refreshToken)
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/reach/), expect.anything())
  })
})

describe('startSession', () => {
  it('stores the tokens and marks the user as logged in', async () => {
    const { startSession, useAuthStore } = await load()
    const { user, accessToken, refreshToken } = fakeBackend.seedUser()

    startSession({ user, accessToken, refreshToken })

    expect(tokenStorage.getAccessToken()).toBe(accessToken)
    expect(tokenStorage.getRefreshToken()).toBe(refreshToken)
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user })
  })
})

describe('logout', () => {
  it('calls /auth/logout with the refresh token, then clears everything', async () => {
    const { refreshToken } = storeSeededTokens()
    const { initSession, logout, useAuthStore } = await load()
    await initSession()
    let sentToken: unknown
    server.use(
      http.post(`${API}/auth/logout`, async ({ request }) => {
        sentToken = ((await request.json()) as { refreshToken: string }).refreshToken
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await logout()

    expect(sentToken).toBe(refreshToken)
    expect(tokenStorage.getRefreshToken()).toBeNull()
    expect(useAuthStore.getState()).toMatchObject({ status: 'unauthenticated', user: null })
  })

  it('still logs out locally when the server call fails', async () => {
    storeSeededTokens()
    server.use(http.post(`${API}/auth/logout`, () => HttpResponse.json({ error: 'boom' }, { status: 500 })))
    const { initSession, logout, useAuthStore } = await load()
    await initSession()

    await logout()

    expect(tokenStorage.getRefreshToken()).toBeNull()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })
})

describe('syncSessionAcrossTabs', () => {
  function otherTabChangedStorage() {
    window.dispatchEvent(new StorageEvent('storage', { key: REFRESH_TOKEN_KEY }))
  }

  it('logs this tab out when another tab logs out', async () => {
    storeSeededTokens()
    const { initSession, syncSessionAcrossTabs, useAuthStore } = await load()
    await initSession()
    const stop = syncSessionAcrossTabs()

    tokenStorage.clear() // what the other tab's logout does
    otherTabChangedStorage()

    expect(useAuthStore.getState().status).toBe('unauthenticated')
    stop()
  })

  it('ignores token rotation by another tab', async () => {
    storeSeededTokens()
    const { initSession, syncSessionAcrossTabs, useAuthStore } = await load()
    await initSession()
    const stop = syncSessionAcrossTabs()

    tokenStorage.setTokens({ accessToken: 'new-access', refreshToken: 'new-refresh' })
    otherTabChangedStorage()

    expect(useAuthStore.getState().status).toBe('authenticated')
    stop()
  })

  it('logs this tab in when another tab logs in', async () => {
    const { initSession, syncSessionAcrossTabs, useAuthStore } = await load()
    await initSession()
    const stop = syncSessionAcrossTabs()

    const { user } = storeSeededTokens() // what the other tab's login does
    otherTabChangedStorage()

    await vi.waitFor(() => expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', user }))
    stop()
  })
})
