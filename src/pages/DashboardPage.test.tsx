import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { API, fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn } from '@/test/renderApp'
import { server } from '@/test/setup'
import { TODAY, freezeTime } from '@/test/time'

beforeEach(() => {
  freezeTime()
  setLoggedIn()
})

describe('DashboardPage – today\'s habits', () => {
  it('invites the first habit when there are none', async () => {
    renderApp('/dashboard')

    expect(await screen.findByText('No habits yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add habit' })).toHaveAttribute('href', '/habits/new')
  })

  it('lists habits scheduled today with streaks, and the others separately', async () => {
    fakeBackend.seedHabit({ title: 'Read' }, { done: ['2026-10-18', '2026-10-19'] })
    fakeBackend.seedHabit({ title: 'Gym', frequency: 'custom', targetDays: [1, 3, 5] }) // not on Tuesdays
    fakeBackend.seedHabit({ title: 'Call mum', frequency: 'weekly' })
    renderApp('/dashboard')

    const scheduled = await screen.findByRole('list', { name: 'Scheduled today' })
    expect(within(scheduled).getAllByRole('checkbox').map((c) => c.getAttribute('aria-label'))).toEqual([
      'Read',
      'Call mum',
    ])
    expect(within(scheduled).getByText(/2 days/)).toBeInTheDocument()
    expect(within(scheduled).getByText(/0 weeks/)).toBeInTheDocument()
    expect(screen.getByText('0 of 2 done')).toBeInTheDocument()

    const unscheduled = screen.getByRole('list', { name: 'Not scheduled today' })
    expect(unscheduled).toHaveTextContent('Gym · Mon, Wed, Fri')
  })

  it('marks a habit done for the server\'s today and shows the new streak', async () => {
    const habit = fakeBackend.seedHabit({ title: 'Read' }, { done: ['2026-10-18', '2026-10-19'] })
    const { user } = renderApp('/dashboard')

    await user.click(await screen.findByRole('checkbox', { name: 'Read' }))

    expect(screen.getByRole('checkbox', { name: 'Read' })).toBeChecked() // optimistic
    expect(fakeBackend.lastBody(`POST /habits/${habit.id}/logs`)).toEqual({ date: TODAY, completed: true })
    const scheduled = screen.getByRole('list', { name: 'Scheduled today' })
    expect(await within(scheduled).findByText(/3 days/)).toBeInTheDocument() // streak recomputed by the server
    expect(screen.getByText('1 of 1 done')).toBeInTheDocument()
  })

  it('undoes with completed: false', async () => {
    const habit = fakeBackend.seedHabit({ title: 'Read' }, { done: [TODAY] })
    const { user } = renderApp('/dashboard')

    await user.click(await screen.findByRole('checkbox', { name: 'Read', checked: true }))

    await waitFor(() => expect(fakeBackend.logs().find((l) => l.date === TODAY)?.completed).toBe(false))
    expect(fakeBackend.lastBody(`POST /habits/${habit.id}/logs`)).toEqual({ date: TODAY, completed: false })
    expect(screen.getByRole('checkbox', { name: 'Read' })).not.toBeChecked()
  })

  it('rolls the checkbox back when the server refuses', async () => {
    fakeBackend.seedHabit({ title: 'Read' })
    server.use(
      http.post(`${API}/habits/:id/logs`, () =>
        HttpResponse.json({ error: 'Habit is archived; unarchive it before logging' }, { status: 409 }),
      ),
    )
    const { user } = renderApp('/dashboard')

    await user.click(await screen.findByRole('checkbox', { name: 'Read' }))

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Read' })).not.toBeChecked())
  })

  it('shows the best current streak', async () => {
    fakeBackend.seedHabit({ title: 'Read' }, { done: ['2026-10-19'] })
    fakeBackend.seedHabit({ title: 'Walk' }, { done: ['2026-10-17', '2026-10-18', '2026-10-19'] })
    renderApp('/dashboard')

    const card = (await screen.findByText('Your best streak')).closest('[data-slot=card]') as HTMLElement
    expect(await within(card).findByText('3 days')).toBeInTheDocument()
    expect(within(card).getByText('Walk')).toBeInTheDocument()
  })

  it('shows a retry when habits fail to load', async () => {
    server.use(http.get(`${API}/habits`, () => HttpResponse.json({ error: 'Database unavailable' }, { status: 500 })))
    renderApp('/dashboard')

    expect(await screen.findAllByText('Database unavailable')).not.toHaveLength(0)
    expect(screen.getAllByRole('button', { name: 'Try again' })).not.toHaveLength(0)
  })
})

describe('DashboardPage – check-in prompt', () => {
  it('prompts for a check-in when today has none (404 is not an error)', async () => {
    renderApp('/dashboard')

    expect(await screen.findByText("You haven't checked in today.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Check in' })).toHaveAttribute('href', '/check-ins')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it("summarises today's check-in instead, once there is one", async () => {
    fakeBackend.seedCheckIn({ date: TODAY, mood: 4, energy: 3, sleepHours: 7.5 })
    renderApp('/dashboard')

    expect(await screen.findByText('Checked in today')).toBeInTheDocument()
    expect(screen.queryByText("You haven't checked in today.")).not.toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument() // mood 4
    expect(screen.getByText('7.5 h')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Edit today's check-in" })).toBeInTheDocument()
  })

  it("uses the server's today, not the browser's date", async () => {
    // 20:00 UTC on the 20th is already 01:00 on the 21st in Karachi.
    freezeTime('2026-10-20T20:00:00.000Z')
    fakeBackend.seedHabit()
    renderApp('/dashboard')

    await screen.findByRole('checkbox', { name: 'Read' })
    await waitFor(() => expect(fakeBackend.requests()).toContain('GET /checkins/2026-10-21'))
  })
})

describe('DashboardPage – suggestions', () => {
  it('shows the two top-ranked pending recommendations, in server order, and links to the rest', async () => {
    fakeBackend.seedRecommendation({ message: 'Low score', score: 20, createdAt: '2026-10-19T10:00:00.000Z' })
    fakeBackend.seedRecommendation({ message: 'Top score', score: 80, createdAt: '2026-10-15T10:00:00.000Z' })
    fakeBackend.seedRecommendation({ message: 'Mid score', score: 50, createdAt: '2026-10-17T10:00:00.000Z' })
    fakeBackend.seedRecommendation({ message: 'Already handled', status: 'dismissed', createdAt: '2026-10-20T01:00:00.000Z' })
    renderApp('/dashboard')

    const list = await screen.findByRole('list', { name: 'Suggestions' })
    expect(within(list).getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual([
      'Top score',
      'Mid score',
    ])
    expect(fakeBackend.requests()).toContain('GET /insights/recommendations?status=pending&sort=rank')
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/insights')
  })

  it('accepts a suggestion from the dashboard', async () => {
    const rec = fakeBackend.seedRecommendation({ message: 'Try a shorter session' })
    const { user } = renderApp('/dashboard')

    const card = await screen.findByRole('article', { name: 'Try a shorter session' })
    await user.click(within(card).getByRole('button', { name: 'Accept' }))

    expect(await screen.findByText(/No suggestions right now/)).toBeInTheDocument()
    expect(fakeBackend.recommendation(rec.id)?.status).toBe('accepted')
  })

  it('refetches suggestions after a habit is ticked off', async () => {
    fakeBackend.seedHabit({ title: 'Read' })
    const { user } = renderApp('/dashboard')
    await screen.findByText(/No suggestions right now/)

    await user.click(await screen.findByRole('checkbox', { name: 'Read' }))

    await waitFor(() => expect(fakeBackend.count('GET /insights/recommendations?status=pending&sort=rank')).toBe(2))
  })
})

describe('DashboardPage – streak risk', () => {
  const GYM_FORECAST = {
    currentStreak: 5,
    completionProbability: 0.095,
    riskScore: 0.905,
    riskLevel: 'high',
    factors: [
      { factor: 'miss_run', effect: 'raises_risk', detail: 'Missed the last 2 scheduled days in a row.' },
      { factor: 'day_of_week', effect: 'lowers_risk', detail: 'Usually done on Tuesdays.' },
    ],
  }

  it('lists high-risk streaks for today in a strip, linked to the habit', async () => {
    const gym = fakeBackend.seedHabit({ title: 'Gym' })
    fakeBackend.seedForecast(gym.id, GYM_FORECAST)
    renderApp('/dashboard')

    const strip = await screen.findByRole('list', { name: 'Streaks at risk today' })
    const link = within(strip).getByRole('link')
    expect(link).toHaveAttribute('href', `/habits/${gym.id}`)
    expect(link).toHaveTextContent('Gym· 🔥 5 · ~91% miss chance')
  })

  it('hides the strip when nothing is at risk today', async () => {
    const read = fakeBackend.seedHabit({ title: 'Read' })
    fakeBackend.seedForecast(read.id, { ...GYM_FORECAST, riskLevel: 'medium', riskScore: 0.4 })
    renderApp('/dashboard')

    await screen.findByRole('button', { name: /^Watch: Read/ })
    expect(screen.queryByRole('heading', { name: 'Streaks at risk today' })).not.toBeInTheDocument()
  })

  it('badges habit rows: "At risk" with the streak at stake, "Watch" for medium, nothing otherwise', async () => {
    const gym = fakeBackend.seedHabit({ title: 'Gym' })
    fakeBackend.seedForecast(gym.id, GYM_FORECAST)
    const read = fakeBackend.seedHabit({ title: 'Read' })
    fakeBackend.seedForecast(read.id, { ...GYM_FORECAST, riskLevel: 'medium', riskScore: 0.4 })
    const walk = fakeBackend.seedHabit({ title: 'Walk' })
    fakeBackend.seedForecast(walk.id, { ...GYM_FORECAST, riskLevel: 'low', riskScore: 0.1 })
    fakeBackend.seedHabit({ title: 'Stretch' }) // insufficient_data
    renderApp('/dashboard')

    const scheduled = await screen.findByRole('list', { name: 'Scheduled today' })
    const gymBadge = await within(scheduled).findByRole('button', { name: 'At risk: Gym. Show why' })
    expect(gymBadge).toHaveTextContent('🔥 5 at risk')
    expect(within(scheduled).getByRole('button', { name: 'Watch: Read. Show why' })).toHaveTextContent('Watch')
    expect(within(scheduled).getAllByRole('button', { name: /Show why/ })).toHaveLength(2)
  })

  it('opens the badge to show the miss chance and the reasons', async () => {
    const gym = fakeBackend.seedHabit({ title: 'Gym' })
    fakeBackend.seedForecast(gym.id, GYM_FORECAST)
    const { user } = renderApp('/dashboard')

    await user.click(await screen.findByRole('button', { name: 'At risk: Gym. Show why' }))

    expect(await screen.findByText('~91% chance of a miss today')).toBeInTheDocument()
    expect(screen.getByText('Based on your recent pattern.')).toBeInTheDocument()
    const reasons = screen.getByRole('list', { name: 'Reasons' })
    expect(reasons).toHaveTextContent('Raises risk: Missed the last 2 scheduled days in a row.')
    expect(reasons).toHaveTextContent('Lowers risk: Usually done on Tuesdays.')
  })

  it('clears the badge and strip when the risky habit is ticked off, and refetches the forecast', async () => {
    const gym = fakeBackend.seedHabit({ title: 'Gym' })
    fakeBackend.seedForecast(gym.id, GYM_FORECAST)
    const { user } = renderApp('/dashboard')
    await screen.findByRole('button', { name: 'At risk: Gym. Show why' })

    await user.click(screen.getByRole('checkbox', { name: 'Gym' }))

    // Gone straight away (optimistic), and the forecast moves on to tomorrow on refetch.
    expect(screen.queryByRole('button', { name: /At risk: Gym/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Streaks at risk today' })).not.toBeInTheDocument()
    await waitFor(() => expect(fakeBackend.count('GET /predictions/streak-risk')).toBe(2))
    expect(screen.queryByRole('button', { name: /At risk: Gym/ })).not.toBeInTheDocument()
  })
})
