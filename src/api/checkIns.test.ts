import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { getCheckIn, saveCheckIn } from '@/api/checkIns'
import { listHabits, logHabit } from '@/api/habits'
import { tokenStorage } from '@/lib/tokenStorage'
import { API, fakeBackend } from '@/test/fakeBackend'
import { server } from '@/test/setup'
import { TODAY, freezeTime } from '@/test/time'

beforeEach(() => {
  freezeTime()
  const { accessToken, refreshToken } = fakeBackend.seedUser()
  tokenStorage.setTokens({ accessToken, refreshToken })
})

describe('getCheckIn', () => {
  it('returns null on 404: "no check-in yet" is a normal state', async () => {
    await expect(getCheckIn(TODAY)).resolves.toBeNull()
  })

  it('returns the check-in when there is one', async () => {
    fakeBackend.seedCheckIn({ date: TODAY, mood: 4 })

    await expect(getCheckIn(TODAY)).resolves.toMatchObject({ date: TODAY, mood: 4 })
  })

  it('still throws on other errors', async () => {
    server.use(http.get(`${API}/checkins/:date`, () => HttpResponse.json({ error: 'Boom' }, { status: 500 })))

    await expect(getCheckIn(TODAY)).rejects.toMatchObject({ response: { status: 500 } })
  })
})

describe('saveCheckIn', () => {
  it('sends all four metrics so an update clears what was cleared', async () => {
    fakeBackend.seedCheckIn({ date: TODAY, mood: 4, energy: 3 })

    const saved = await saveCheckIn({ date: TODAY, mood: 5, energy: null, sleepHours: null, stressLevel: 2, note: null })

    expect(saved).toMatchObject({ mood: 5, energy: null, stressLevel: 2 })
  })
})

describe('habits API', () => {
  it('sends includeArchived and the bearer token', async () => {
    fakeBackend.seedHabit({ title: 'Read' })
    fakeBackend.seedHabit({ title: 'Old', isActive: false })

    expect((await listHabits(false)).map((h) => h.title)).toEqual(['Read'])
    expect((await listHabits(true)).map((h) => h.title)).toEqual(['Read', 'Old'])
    expect(fakeBackend.requests()).toEqual(['GET /habits?includeArchived=false', 'GET /habits?includeArchived=true'])
  })

  it('reports "today" from the server in the user timezone', async () => {
    fakeBackend.seedHabit()

    const [habit] = await listHabits()
    expect(habit.today.date).toBe(TODAY)
  })

  it('rejects future dates, like the real backend', async () => {
    const habit = fakeBackend.seedHabit()

    await expect(logHabit(habit.id, { date: '2026-10-21' })).rejects.toMatchObject({ response: { status: 400 } })
  })
})
