import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, login } from '@/api/auth'
import { SessionExpiredError, apiClient, onSessionExpired, toApiError } from '@/api/client'
import { tokenStorage } from '@/lib/tokenStorage'
import { API, fakeBackend } from '@/test/fakeBackend'
import { server } from '@/test/setup'

const sessionExpired = vi.fn()

beforeEach(() => {
  sessionExpired.mockReset()
  onSessionExpired(sessionExpired)
})

/** Seeds a user and stores their tokens, as if they had logged in */
function loggedIn() {
  const { user, accessToken, refreshToken } = fakeBackend.seedUser()
  tokenStorage.setTokens({ accessToken, refreshToken })
  return { user, accessToken, refreshToken }
}

describe('apiClient', () => {
  it('sends the stored access token as a Bearer header', async () => {
    const { user } = loggedIn()
    await expect(getMe()).resolves.toEqual(user)
    expect(fakeBackend.requests()).toEqual(['GET /auth/me'])
  })

  it('keeps user ids as strings', async () => {
    loggedIn()
    const user = await getMe()
    expect(typeof user.id).toBe('string')
  })
})

describe('token refresh', () => {
  it('refreshes once and retries when the access token has expired', async () => {
    const { user, refreshToken } = loggedIn()
    fakeBackend.expireAccessTokens()

    await expect(getMe()).resolves.toEqual(user)

    expect(fakeBackend.requests()).toEqual(['GET /auth/me', 'POST /auth/refresh', 'GET /auth/me'])
    // The rotated pair was saved, so the old refresh token is never sent again.
    expect(tokenStorage.getRefreshToken()).not.toBe(refreshToken)
  })

  it('makes exactly ONE refresh call when several requests get 401 at the same time', async () => {
    const { user } = loggedIn()
    fakeBackend.expireAccessTokens()

    const results = await Promise.all([getMe(), getMe(), getMe()])

    expect(results).toEqual([user, user, user])
    expect(fakeBackend.count('POST /auth/refresh')).toBe(1)
    expect(fakeBackend.reuseDetected).toBe(false)
  })

  it('works after the stored access token is deleted', async () => {
    const { user } = loggedIn()
    localStorage.removeItem('lifeos.accessToken')

    await expect(getMe()).resolves.toEqual(user)
    expect(fakeBackend.count('POST /auth/refresh')).toBe(1)
  })

  it('handles sequential expiries, always sending the newest refresh token', async () => {
    loggedIn()
    for (let i = 0; i < 3; i += 1) {
      fakeBackend.expireAccessTokens()
      await getMe()
    }
    expect(fakeBackend.count('POST /auth/refresh')).toBe(3)
    expect(fakeBackend.reuseDetected).toBe(false)
  })

  it('reuses tokens another tab already rotated instead of refreshing again', async () => {
    const { user } = loggedIn() // storage now holds a valid, newer pair
    // This request was sent with an older access token before the other tab refreshed.
    const { data } = await apiClient.get('/auth/me', { headers: { Authorization: 'Bearer stale-token' } })

    expect(data.user).toEqual(user)
    expect(fakeBackend.count('POST /auth/refresh')).toBe(0)
  })

  it('serialises the refresh with a Web Lock when the browser supports it', async () => {
    const request = vi.fn((_name: string, callback: () => Promise<unknown>) => callback())
    vi.stubGlobal('navigator', { ...navigator, locks: { request } })
    loggedIn()
    fakeBackend.expireAccessTokens()

    await getMe()

    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('lifeos-refresh', expect.any(Function))
  })

  it('retries the original request only once', async () => {
    loggedIn()
    server.use(http.get(`${API}/auth/me`, () => HttpResponse.json({ error: 'nope' }, { status: 401 })))

    await expect(getMe()).rejects.toMatchObject({ response: { status: 401 } })
    expect(fakeBackend.count('POST /auth/refresh')).toBe(1)
  })
})

describe('when the refresh fails', () => {
  it('clears the tokens and reports the session as expired', async () => {
    loggedIn()
    fakeBackend.expireAccessTokens()
    tokenStorage.setTokens({ accessToken: 'expired', refreshToken: 'revoked-token' })

    await expect(getMe()).rejects.toBeInstanceOf(SessionExpiredError)

    expect(tokenStorage.getRefreshToken()).toBeNull()
    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(sessionExpired).toHaveBeenCalledTimes(1)
  })

  it('keeps the tokens when the server is unreachable (not a real logout)', async () => {
    const { refreshToken } = loggedIn()
    fakeBackend.expireAccessTokens()
    server.use(http.post(`${API}/auth/refresh`, () => HttpResponse.error()))

    await expect(getMe()).rejects.toThrow()

    expect(tokenStorage.getRefreshToken()).toBe(refreshToken)
    expect(sessionExpired).not.toHaveBeenCalled()
  })

  it('does not try to refresh when there is no refresh token', async () => {
    await expect(getMe()).rejects.toMatchObject({ response: { status: 401 } })
    expect(fakeBackend.count('POST /auth/refresh')).toBe(0)
  })
})

describe('auth endpoints', () => {
  it('never refreshes on a 401 from /auth/login', async () => {
    loggedIn()
    await expect(login({ email: 'ahsan@example.com', password: 'wrong-password' })).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(fakeBackend.requests()).toEqual(['POST /auth/login'])
  })
})

describe('toApiError', () => {
  it('extracts the message and validation details', async () => {
    const error = await apiClient.post('/auth/register', { email: 'bad', password: '1' }).catch((e) => e)
    expect(toApiError(error)).toEqual({
      status: 400,
      message: 'Validation failed',
      details: [
        { field: 'email', message: 'Invalid email address' },
        { field: 'password', message: 'Password must be at least 8 characters' },
      ],
    })
  })

  it('reports an unreachable server with status null', async () => {
    server.use(http.get(`${API}/health`, () => HttpResponse.error()))
    const error = await apiClient.get('/health').catch((e) => e)
    expect(toApiError(error)).toMatchObject({ status: null, message: expect.stringMatching(/reach/) })
  })
})
