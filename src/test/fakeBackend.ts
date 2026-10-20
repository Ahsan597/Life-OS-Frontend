import { http, HttpResponse } from 'msw'

/*
 * In-memory fake of the backend's Phase 0 auth API, used by MSW in tests.
 * It mirrors the real contract, including refresh-token rotation and reuse
 * detection: sending an already-used refresh token revokes all of that user's
 * sessions and sets `reuseDetected`, so tests can assert the frontend never does it.
 */

export const API = 'http://localhost:3000/api/v1'

interface FakeUser {
  id: string
  email: string
  password: string
  name: string | null
  timezone: string
  createdAt: string
}

interface RefreshRecord {
  userId: string
  used: boolean
}

const state = {
  users: [] as FakeUser[],
  accessTokens: new Map<string, string>(),
  refreshTokens: new Map<string, RefreshRecord>(),
  requests: [] as string[],
  reuseDetected: false,
  counter: 0,
}

function publicUser({ password: _password, ...user }: FakeUser) {
  return user
}

function issueTokens(userId: string) {
  state.counter += 1
  const accessToken = `access-${state.counter}`
  const refreshToken = `refresh-${state.counter}`
  state.accessTokens.set(accessToken, userId)
  state.refreshTokens.set(refreshToken, { userId, used: false })
  return { accessToken, refreshToken }
}

function revokeAllSessions(userId: string) {
  for (const [token, id] of state.accessTokens) if (id === userId) state.accessTokens.delete(token)
  for (const record of state.refreshTokens.values()) if (record.userId === userId) record.used = true
}

function log(request: Request) {
  state.requests.push(`${request.method} ${new URL(request.url).pathname.replace('/api/v1', '')}`)
}

export const fakeBackend = {
  reset() {
    state.users = []
    state.accessTokens.clear()
    state.refreshTokens.clear()
    state.requests = []
    state.reuseDetected = false
    state.counter = 0
  },

  /** Creates a user directly in the "database" and returns a fresh token pair for them */
  seedUser(overrides: Partial<FakeUser> = {}) {
    const user: FakeUser = {
      id: String(state.users.length + 12),
      email: 'ahsan@example.com',
      password: 'Passw0rd!',
      name: 'Ahsan',
      timezone: 'Asia/Karachi',
      createdAt: '2026-10-17T13:03:30.000Z',
      ...overrides,
    }
    state.users.push(user)
    return { user: publicUser(user), ...issueTokens(user.id) }
  },

  /** Simulates the 15-minute access-token expiry */
  expireAccessTokens() {
    state.accessTokens.clear()
  },

  /** Requests made so far, e.g. "POST /auth/refresh" */
  requests: () => [...state.requests],
  count: (entry: string) => state.requests.filter((r) => r === entry).length,
  clearRequests() {
    state.requests = []
  },
  get reuseDetected() {
    return state.reuseDetected
  },
}

export const handlers = [
  http.get(`${API}/health`, () => HttpResponse.json({ status: 'ok', database: 'connected' })),

  http.post(`${API}/auth/register`, async ({ request }) => {
    log(request)
    const body = (await request.json()) as Record<string, string | undefined>
    const email = (body.email ?? '').trim().toLowerCase()
    const details = []
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) details.push({ field: 'email', message: 'Invalid email address' })
    if ((body.password ?? '').length < 8) {
      details.push({ field: 'password', message: 'Password must be at least 8 characters' })
    }
    if (details.length) return HttpResponse.json({ error: 'Validation failed', details }, { status: 400 })
    if (state.users.some((u) => u.email === email)) {
      return HttpResponse.json({ error: 'Email is already registered' }, { status: 409 })
    }
    const { user, ...tokens } = fakeBackend.seedUser({
      email,
      password: body.password,
      name: body.name ?? null,
      timezone: body.timezone ?? 'UTC',
    })
    return HttpResponse.json({ user, ...tokens }, { status: 201 })
  }),

  http.post(`${API}/auth/login`, async ({ request }) => {
    log(request)
    const body = (await request.json()) as { email: string; password: string }
    const user = state.users.find((u) => u.email === body.email.trim().toLowerCase())
    if (!user || user.password !== body.password) {
      return HttpResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    return HttpResponse.json({ user: publicUser(user), ...issueTokens(user.id) })
  }),

  http.post(`${API}/auth/refresh`, async ({ request }) => {
    log(request)
    const { refreshToken } = (await request.json()) as { refreshToken: string }
    const record = state.refreshTokens.get(refreshToken)
    if (!record) return HttpResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
    if (record.used) {
      state.reuseDetected = true
      revokeAllSessions(record.userId)
      return HttpResponse.json({ error: 'Refresh token reuse detected' }, { status: 401 })
    }
    record.used = true
    return HttpResponse.json(issueTokens(record.userId))
  }),

  http.post(`${API}/auth/logout`, async ({ request }) => {
    log(request)
    const { refreshToken } = (await request.json()) as { refreshToken: string }
    const record = state.refreshTokens.get(refreshToken)
    if (record) record.used = true
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/auth/me`, ({ request }) => {
    log(request)
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
    const userId = state.accessTokens.get(token)
    const user = state.users.find((u) => u.id === userId)
    if (!user) return HttpResponse.json({ error: 'Authentication required' }, { status: 401 })
    return HttpResponse.json({ user: publicUser(user) })
  }),
]
