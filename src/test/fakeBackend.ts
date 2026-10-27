import { http, HttpResponse, type PathParams } from 'msw'

/*
 * In-memory fake of the backend API (Phase 0 auth, Phase 1 habits/check-ins, Phase 2 insights), used by MSW in tests.
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
  habits: [] as FakeHabit[],
  logs: [] as FakeLog[],
  checkIns: [] as FakeCheckIn[],
  recommendations: [] as FakeRecommendation[],
  correlations: null as Partial<Body> | null,
  accessTokens: new Map<string, string>(),
  refreshTokens: new Map<string, RefreshRecord>(),
  requests: [] as string[],
  reuseDetected: false,
  counter: 0,
  bodies: new Map<string, unknown>(),
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

/** Records "METHOD /path?query" (query only when present) */
function log(request: Request) {
  const url = new URL(request.url)
  state.requests.push(`${request.method} ${url.pathname.replace('/api/v1', '')}${url.search}`)
}

export const fakeBackend = {
  reset() {
    state.users = []
    state.habits = []
    state.logs = []
    state.checkIns = []
    state.recommendations = []
    state.correlations = null
    state.accessTokens.clear()
    state.refreshTokens.clear()
    state.requests = []
    state.reuseDetected = false
    state.counter = 0
    state.bodies.clear()
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

  /** Creates a habit for the most recently seeded user; `done` lists completed days */
  seedHabit(overrides: Partial<FakeHabit> = {}, { done = [] as string[] } = {}) {
    state.counter += 1
    const habit: FakeHabit = {
      id: String(100 + state.counter),
      userId: state.users.at(-1)!.id,
      title: 'Read',
      description: null,
      frequency: 'daily',
      targetDays: null,
      isActive: true,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      ...overrides,
    }
    state.habits.push(habit)
    for (const date of done) upsertLog(habit.id, date, { completed: true })
    return strip(habit)
  },

  seedLog(habitId: string, date: string, fields: { completed?: boolean; note?: string | null } = {}) {
    return upsertLog(habitId, date, { completed: true, ...fields }).log
  },

  seedCheckIn(fields: Partial<FakeCheckIn> & { date: string }) {
    state.counter += 1
    const checkIn: FakeCheckIn = {
      id: String(500 + state.counter),
      userId: state.users.at(-1)!.id,
      mood: null,
      energy: null,
      sleepHours: null,
      stressLevel: null,
      note: null,
      createdAt: `${fields.date}T12:00:00.000Z`,
      ...fields,
    }
    state.checkIns.push(checkIn)
    return strip(checkIn)
  },

  /**
   * The correlation maths lives in the backend; tests seed the parts of the response they need.
   * Anything left out comes back as "not enough data".
   */
  seedCorrelations(fields: Partial<Body>) {
    state.correlations = fields
  },

  seedRecommendation(fields: Partial<FakeRecommendation> & { message: string }) {
    state.counter += 1
    const recommendation: FakeRecommendation = {
      id: String(800 + state.counter),
      userId: state.users.at(-1)!.id,
      rule: 'missed_in_a_row',
      source: 'rule_based',
      habitId: null,
      habitTitle: null,
      reason: 'Because of a pattern in your recent logs.',
      status: 'pending',
      createdAt: `2026-10-${String(10 + state.recommendations.length).padStart(2, '0')}T10:00:00.000Z`,
      updatedAt: '2026-10-10T10:00:00.000Z',
      ...fields,
    }
    state.recommendations.push(recommendation)
    return strip(recommendation)
  },

  recommendation: (id: string) => state.recommendations.find((r) => r.id === id),
  habit: (id: string) => state.habits.find((h) => h.id === id),
  logs: () => state.logs.map((l) => ({ ...l })),
  checkIns: () => state.checkIns.map((c) => ({ ...c })),
  /** The last JSON body sent to an endpoint, e.g. "POST /checkins" */
  lastBody: (entry: string) => state.bodies.get(entry) as Record<string, unknown> | undefined,
}

export const handlers = [
  ...phase1Handlers(),
  ...phase2Handlers(),
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

// ===========================================================================
// Phase 1: habits, habit logs and check-ins
//
// Mirrors the backend's rules (habit.service, streak.service, checkIn.service):
// "today" is the current instant in the user's timezone, future dates are
// rejected, archived habits can't be logged, and streaks/stats are computed
// server-side. Written independently of the frontend's own date helpers.
// ===========================================================================

type Frequency = 'daily' | 'weekly' | 'custom'

interface FakeHabit {
  id: string
  userId: string
  title: string
  description: string | null
  frequency: Frequency
  targetDays: number[] | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface FakeLog {
  id: string
  habitId: string
  date: string
  completed: boolean
  note: string | null
  createdAt: string
}

interface FakeCheckIn {
  id: string
  userId: string
  date: string
  mood: number | null
  energy: number | null
  sleepHours: number | null
  stressLevel: number | null
  note: string | null
  createdAt: string
}

type Body = Record<string, any>
type FieldError = { field: string; message: string }

const DAY = 86_400_000
const plusDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10)
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()
const monday = (date: string) => plusDays(date, -((weekday(date) + 6) % 7))
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY)
const dayIn = (instant: Date | string, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(instant),
  )
const isDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))

function upsertLog(habitId: string, date: string, fields: { completed?: boolean; note?: string | null }) {
  let entry = state.logs.find((l) => l.habitId === habitId && l.date === date)
  const created = !entry
  if (!entry) {
    state.counter += 1
    entry = { id: String(1000 + state.counter), habitId, date, completed: true, note: null, createdAt: new Date().toISOString() }
    state.logs.push(entry)
  }
  if (fields.completed !== undefined) entry.completed = fields.completed
  if (fields.note !== undefined) entry.note = fields.note
  return { log: { ...entry }, created }
}

const validationFailed = (details: FieldError[]) =>
  HttpResponse.json({ error: 'Validation failed', details }, { status: 400 })
const notFound = (what: string) => HttpResponse.json({ error: `${what} not found` }, { status: 404 })
const archived = () => HttpResponse.json({ error: 'Habit is archived; unarchive it before logging' }, { status: 409 })
const strip = <T extends { userId: string }>({ userId: _userId, ...rest }: T) => rest

interface Ctx {
  request: Request
  params: Record<string, string>
  user: FakeUser
  /** The user's "today", from the (possibly frozen) clock and their timezone */
  today: string
  body: Body
}

/** Wraps a handler: logs it, requires a valid access token, records the JSON body */
function authed(handler: (ctx: Ctx) => Response | Promise<Response>) {
  return async ({ request, params }: { request: Request; params: PathParams }) => {
    log(request)
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
    const user = state.users.find((u) => u.id === state.accessTokens.get(token))
    if (!user) return HttpResponse.json({ error: 'Authentication required' }, { status: 401 })
    let body: Body = {}
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      body = (await request.json()) as Body
      state.bodies.set(`${request.method} ${new URL(request.url).pathname.replace('/api/v1', '')}`, body)
    }
    return handler({ request, params: params as Record<string, string>, user, today: dayIn(new Date(), user.timezone), body })
  }
}

// --- streaks (port of streak.service) --------------------------------------

function scheduledOn(habit: FakeHabit, day: string) {
  return habit.frequency !== 'custom' || (habit.targetDays ?? []).includes(weekday(day))
}

function periods(habit: FakeHabit, done: Set<string>, start: string, end: string, today: string) {
  const out: { key: string; completed: boolean; pending: boolean }[] = []
  if (start > end) return out
  if (habit.frequency === 'weekly') {
    for (let week = monday(start); week <= end; week = plusDays(week, 7)) {
      let completed = false
      for (let i = 0; i < 7; i++) completed ||= done.has(plusDays(week, i))
      out.push({ key: week, completed, pending: !completed && week === monday(today) })
    }
    return out
  }
  for (let day = start; day <= end; day = plusDays(day, 1)) {
    if (!scheduledOn(habit, day)) continue
    const completed = done.has(day)
    out.push({ key: day, completed, pending: !completed && day === today })
  }
  return out
}

function progress(habit: FakeHabit, timeZone: string, today: string) {
  const done = new Set(state.logs.filter((l) => l.habitId === habit.id && l.completed).map((l) => l.date))
  let start = dayIn(habit.createdAt, timeZone)
  for (const day of done) if (day < start) start = day
  const all = periods(habit, done, start, today, today)

  let longest = 0
  let run = 0
  for (const p of all) {
    if (p.completed) longest = Math.max(longest, ++run)
    else if (!p.pending) run = 0
  }
  let current = 0
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].pending) continue
    if (!all[i].completed) break
    current += 1
  }
  return { done, start, currentStreak: current, longestStreak: longest }
}

function withProgress(habit: FakeHabit, user: FakeUser, today: string) {
  const { done, currentStreak, longestStreak } = progress(habit, user.timezone, today)
  return {
    ...strip(habit),
    today: { date: today, scheduled: scheduledOn(habit, today), completed: done.has(today) },
    currentStreak,
    longestStreak,
  }
}

const rate = (completed: number, scheduled: number) =>
  scheduled === 0 ? null : Math.round((completed / scheduled) * 1000) / 1000

function validateHabit(body: Body, partial: boolean) {
  const details: FieldError[] = []
  if (!partial || body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) details.push({ field: 'title', message: 'Title is required' })
    else if (title.length > 150) details.push({ field: 'title', message: 'Too big: expected string to have <=150 characters' })
  }
  if (body.frequency !== undefined && !['daily', 'weekly', 'custom'].includes(body.frequency)) {
    details.push({ field: 'frequency', message: 'Invalid option' })
  }
  if (Array.isArray(body.targetDays) && body.targetDays.length === 0) {
    details.push({ field: 'targetDays', message: 'Pick at least one day' })
  }
  return details
}

function scheduleIssues({ frequency, targetDays }: Pick<FakeHabit, 'frequency' | 'targetDays'>): FieldError[] {
  if (frequency === 'custom' && !targetDays) {
    return [{ field: 'targetDays', message: "targetDays is required when frequency is 'custom'" }]
  }
  if (frequency !== 'custom' && targetDays) {
    return [{ field: 'targetDays', message: "targetDays is only allowed when frequency is 'custom'" }]
  }
  return []
}

const sortDays = (days: number[] | null | undefined) => (days ? [...new Set(days)].sort((a, b) => a - b) : null)

function ownedHabit(user: FakeUser, id: string) {
  return state.habits.find((h) => h.id === id && h.userId === user.id) ?? null
}

// --- check-in stats (port of checkIn.service) ------------------------------

const METRIC_KEYS = ['mood', 'energy', 'sleepHours', 'stressLevel'] as const

function resolveRange(url: URL, today: string) {
  const to = url.searchParams.get('to') ?? today
  const from = url.searchParams.get('from') ?? plusDays(to, -29)
  return { from, to }
}

function summarize(series: Body[], metric: string, from: string) {
  const points = series
    .filter((c) => c[metric] !== null)
    .map((c) => ({ x: daysBetween(from, c.date), y: c[metric] as number }))
  if (points.length === 0) return { count: 0, average: null, min: null, max: null, slopePerDay: null, trend: null }
  const n = points.length
  const meanX = points.reduce((s, p) => s + p.x, 0) / n
  const meanY = points.reduce((s, p) => s + p.y, 0) / n
  let num = 0
  let den = 0
  for (const { x, y } of points) {
    num += (x - meanX) * (y - meanY)
    den += (x - meanX) ** 2
  }
  const slope = n < 2 || den === 0 ? null : num / den
  const trend = slope === null ? null : Math.abs(slope) < 0.01 ? 'flat' : slope > 0 ? 'rising' : 'falling'
  const values = points.map((p) => p.y)
  return {
    count: n,
    average: Math.round(meanY * 100) / 100,
    min: Math.min(...values),
    max: Math.max(...values),
    slopePerDay: slope === null ? null : Math.round(slope * 1000) / 1000,
    trend,
  }
}

function checkInsInRange(user: FakeUser, from: string, to: string) {
  return state.checkIns
    .filter((c) => c.userId === user.id && c.date >= from && c.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(strip)
}

function phase1Handlers() {
  return [
    // --- habits ---
    http.get(
      `${API}/habits`,
      authed(({ request, user, today }) => {
        const includeArchived = new URL(request.url).searchParams.get('includeArchived') === 'true'
        const habits = state.habits
          .filter((h) => h.userId === user.id && (includeArchived || h.isActive))
          .map((h) => withProgress(h, user, today))
        return HttpResponse.json({ habits })
      }),
    ),

    http.post(
      `${API}/habits`,
      authed(({ user, body }) => {
        const input: Body = { frequency: 'daily', targetDays: null, ...body }
        const details = [...validateHabit(input, false), ...scheduleIssues(input as FakeHabit)]
        if (details.length) return validationFailed(details)
        state.counter += 1
        const now = new Date().toISOString()
        const habit: FakeHabit = {
          id: String(100 + state.counter),
          userId: user.id,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          frequency: input.frequency,
          targetDays: sortDays(input.targetDays),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }
        state.habits.push(habit)
        return HttpResponse.json({ habit: strip(habit) }, { status: 201 })
      }),
    ),

    http.get(
      `${API}/habits/:id`,
      authed(({ params, user, today }) => {
        if (!/^[1-9]\d*$/.test(params.id)) return validationFailed([{ field: 'id', message: 'Must be a positive integer id' }])
        const habit = ownedHabit(user, params.id)
        return habit ? HttpResponse.json({ habit: withProgress(habit, user, today) }) : notFound('Habit')
      }),
    ),

    http.put(
      `${API}/habits/:id`,
      authed(({ params, user, body }) => {
        const habit = ownedHabit(user, params.id)
        if (!habit) return notFound('Habit')
        const details = validateHabit(body, true)
        if (details.length) return validationFailed(details)
        const changes: Body = { ...body }
        if (changes.title !== undefined) changes.title = changes.title.trim()
        if (changes.targetDays) changes.targetDays = sortDays(changes.targetDays)
        if (changes.frequency && changes.frequency !== 'custom' && changes.targetDays === undefined) changes.targetDays = null
        const issues = scheduleIssues({ ...habit, ...changes })
        if (issues.length) return validationFailed(issues)
        Object.assign(habit, changes, { updatedAt: new Date().toISOString() })
        return HttpResponse.json({ habit: strip(habit) })
      }),
    ),

    http.delete(
      `${API}/habits/:id`,
      authed(({ params, user }) => {
        const habit = ownedHabit(user, params.id)
        if (!habit) return notFound('Habit')
        habit.isActive = false
        return new HttpResponse(null, { status: 204 })
      }),
    ),

    // --- logs ---
    http.post(
      `${API}/habits/:id/logs`,
      authed(({ params, user, today, body }) => {
        const habit = ownedHabit(user, params.id)
        if (!habit) return notFound('Habit')
        if (body.date !== undefined && !isDate(body.date)) {
          return validationFailed([{ field: 'date', message: 'Must be a valid date (YYYY-MM-DD)' }])
        }
        if (!habit.isActive) return archived()
        const date = body.date ?? today
        if (date > today) return HttpResponse.json({ error: 'Cannot log a habit for a future date' }, { status: 400 })
        const { log: entry, created } = upsertLog(habit.id, date, { completed: body.completed ?? true, note: body.note })
        return HttpResponse.json({ log: entry }, { status: created ? 201 : 200 })
      }),
    ),

    http.get(
      `${API}/habits/:id/logs`,
      authed(({ request, params, user }) => {
        const habit = ownedHabit(user, params.id)
        if (!habit) return notFound('Habit')
        const url = new URL(request.url)
        const from = url.searchParams.get('from') ?? '0000-01-01'
        const to = url.searchParams.get('to') ?? '9999-12-31'
        const logs = state.logs
          .filter((l) => l.habitId === habit.id && l.date >= from && l.date <= to)
          .sort((a, b) => a.date.localeCompare(b.date))
        return HttpResponse.json({ logs })
      }),
    ),

    http.patch(
      `${API}/logs/:id`,
      authed(({ params, user, body }) => {
        const entry = state.logs.find((l) => l.id === params.id)
        const habit = entry && ownedHabit(user, entry.habitId)
        if (!entry || !habit) return notFound('Log')
        if (!habit.isActive) return archived()
        if (body.completed !== undefined) entry.completed = body.completed
        if (body.note !== undefined) entry.note = typeof body.note === 'string' ? body.note.trim() || null : null
        return HttpResponse.json({ log: { ...entry } })
      }),
    ),

    http.get(
      `${API}/habits/:id/stats`,
      authed(({ request, params, user, today }) => {
        const habit = ownedHabit(user, params.id)
        if (!habit) return notFound('Habit')
        const url = new URL(request.url)
        const { done, start, currentStreak, longestStreak } = progress(habit, user.timezone, today)
        const qFrom = url.searchParams.get('from')
        const qTo = url.searchParams.get('to')
        const from = qFrom && qFrom > start ? qFrom : start
        const to = qTo && qTo < today ? qTo : today
        const counted = periods(habit, done, from, to, today).filter((p) => !p.pending)
        const weeks = new Map<string, { weekStart: string; scheduled: number; completed: number }>()
        for (const p of counted) {
          const key = monday(p.key)
          const week = weeks.get(key) ?? { weekStart: key, scheduled: 0, completed: 0 }
          week.scheduled += 1
          if (p.completed) week.completed += 1
          weeks.set(key, week)
        }
        const completed = counted.filter((p) => p.completed).length
        return HttpResponse.json({
          stats: {
            habitId: habit.id,
            frequency: habit.frequency,
            currentStreak,
            longestStreak,
            from,
            to,
            scheduled: counted.length,
            completed,
            completionRate: rate(completed, counted.length),
            weekly: [...weeks.values()].map((w) => ({ ...w, rate: rate(w.completed, w.scheduled) })),
          },
        })
      }),
    ),

    // --- check-ins (/stats before /:date, like the real router) ---
    http.get(
      `${API}/checkins/stats`,
      authed(({ request, user, today }) => {
        const { from, to } = resolveRange(new URL(request.url), today)
        const series = checkInsInRange(user, from, to).map(({ date, mood, energy, sleepHours, stressLevel }) => ({
          date,
          mood,
          energy,
          sleepHours,
          stressLevel,
        }))
        return HttpResponse.json({
          stats: {
            from,
            to,
            daysInRange: daysBetween(from, to) + 1,
            daysCheckedIn: series.length,
            metrics: Object.fromEntries(METRIC_KEYS.map((m) => [m, summarize(series, m, from)])),
            series,
          },
        })
      }),
    ),

    http.get(
      `${API}/checkins`,
      authed(({ request, user, today }) => {
        const { from, to } = resolveRange(new URL(request.url), today)
        return HttpResponse.json({ from, to, checkIns: checkInsInRange(user, from, to) })
      }),
    ),

    http.get(
      `${API}/checkins/:date`,
      authed(({ params, user }) => {
        if (!isDate(params.date)) return validationFailed([{ field: 'date', message: 'Must be a valid date (YYYY-MM-DD)' }])
        const found = state.checkIns.find((c) => c.userId === user.id && c.date === params.date)
        if (!found) return HttpResponse.json({ error: 'No check-in for this date' }, { status: 404 })
        return HttpResponse.json({ checkIn: strip(found) })
      }),
    ),

    http.post(
      `${API}/checkins`,
      authed(({ user, today, body }) => {
        const details: FieldError[] = []
        for (const m of ['mood', 'energy', 'stressLevel']) {
          const v = body[m]
          if (v != null && !(Number.isInteger(v) && v >= 1 && v <= 5)) details.push({ field: m, message: 'Must be 1-5' })
        }
        if (body.sleepHours != null && !(body.sleepHours >= 0 && body.sleepHours <= 24)) {
          details.push({ field: 'sleepHours', message: 'Too big: expected number to be <=24' })
        }
        if (!METRIC_KEYS.some((m) => body[m] != null)) {
          details.push({ field: '', message: 'Provide at least one of: mood, energy, sleepHours, stressLevel' })
        }
        if (details.length) return validationFailed(details)
        const date: string = body.date ?? today
        if (date > today) return HttpResponse.json({ error: 'Cannot check in for a future date' }, { status: 400 })

        let found = state.checkIns.find((c) => c.userId === user.id && c.date === date)
        const created = !found
        if (!found) {
          state.counter += 1
          found = {
            id: String(500 + state.counter),
            userId: user.id,
            date,
            mood: null,
            energy: null,
            sleepHours: null,
            stressLevel: null,
            note: null,
            createdAt: new Date().toISOString(),
          }
          state.checkIns.push(found)
        }
        // Fields left out keep their value; null clears one.
        const record = found as unknown as Body
        for (const key of [...METRIC_KEYS, 'note']) if (body[key] !== undefined) record[key] = body[key]
        if (found.sleepHours != null) found.sleepHours = Math.round(found.sleepHours * 10) / 10
        return HttpResponse.json({ checkIn: strip(found) }, { status: created ? 201 : 200 })
      }),
    ),
  ]
}

// ===========================================================================
// Phase 2: insights (correlations + recommendations)
//
// Recommendations are stored and filtered like the real API; correlations are
// whatever the test seeded, wrapped in the real response shape and range rules.
// ===========================================================================

interface FakeRecommendation {
  id: string
  userId: string
  rule: string
  source: string
  habitId: string | null
  habitTitle: string | null
  message: string
  reason: string
  status: 'pending' | 'accepted' | 'dismissed'
  createdAt: string
  updatedAt: string
}

const DEFAULT_BUCKETS: Record<string, string[]> = {
  sleepHours: ['<6h', '6-7h', '7-8h', '8h+'],
  mood: ['1', '2', '3', '4', '5'],
  energy: ['1', '2', '3', '4', '5'],
  stressLevel: ['1', '2', '3', '4', '5'],
}

function noData(metric: string) {
  return {
    metric,
    r: null,
    sampleSize: 0,
    strength: 'insufficient_data',
    direction: null,
    summary: 'Not enough data yet to spot a pattern.',
    buckets: DEFAULT_BUCKETS[metric].map((label) => ({ label, days: 0, averageCompletionRate: null })),
  }
}

function phase2Handlers() {
  return [
    http.get(
      `${API}/insights/correlations`,
      authed(({ request, today }) => {
        const url = new URL(request.url)
        const yesterday = plusDays(today, -1)
        const qTo = url.searchParams.get('to')
        const to = qTo && qTo < yesterday ? qTo : yesterday
        const from = url.searchParams.get('from') ?? plusDays(to, -89)
        if (daysBetween(from, to) + 1 > 366) {
          return validationFailed([{ field: 'from', message: 'Range can be at most 366 days' }])
        }
        const seeded = state.correlations ?? {}
        const overall = METRIC_KEYS.map(
          (m) => (seeded.overall as Body[] | undefined)?.find((o) => o.metric === m) ?? noData(m),
        )
        return HttpResponse.json({ minSampleSize: 7, habits: [], highlights: [], ...seeded, from, to, overall })
      }),
    ),

    http.get(
      `${API}/insights/recommendations`,
      authed(({ request, user }) => {
        const status = new URL(request.url).searchParams.get('status') ?? 'pending'
        if (!['pending', 'accepted', 'dismissed', 'all'].includes(status)) {
          return validationFailed([{ field: 'status', message: 'Invalid option' }])
        }
        const recommendations = state.recommendations
          .filter((r) => r.userId === user.id && (status === 'all' || r.status === status))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(strip)
        return HttpResponse.json({ recommendations })
      }),
    ),

    http.patch(
      `${API}/insights/recommendations/:id`,
      authed(({ params, user, body }) => {
        if (!['accepted', 'dismissed'].includes(body.status)) {
          return validationFailed([{ field: 'status', message: "Must be 'accepted' or 'dismissed'" }])
        }
        const found = state.recommendations.find((r) => r.id === params.id && r.userId === user.id)
        if (!found) return notFound('Recommendation')
        found.status = body.status
        found.updatedAt = new Date().toISOString()
        return HttpResponse.json({ recommendation: strip(found) })
      }),
    ),
  ]
}
