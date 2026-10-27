import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn } from '@/test/renderApp'
import { freezeTime } from '@/test/time'

/** Created Sat 10 Oct (Karachi), done every day since except Thu 15 Oct. Today is Tue 20 Oct. */
function seedReadingHabit(overrides = {}) {
  return fakeBackend.seedHabit(
    { title: 'Read', description: '20 pages a day', createdAt: '2026-10-10T03:00:00.000Z', ...overrides },
    { done: ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'] },
  )
}

function tile(label: string) {
  return screen.getByText(label).closest('dl') as HTMLElement
}

beforeEach(() => {
  freezeTime()
  setLoggedIn()
})

describe('HabitDetailPage', () => {
  it('shows the habit with streak and completion-rate tiles', async () => {
    const habit = seedReadingHabit()
    renderApp(`/habits/${habit.id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Read' })).toBeInTheDocument()
    expect(screen.getByText('20 pages a day')).toBeInTheDocument()
    expect(screen.getByText('Every day')).toBeInTheDocument()

    expect(tile('Current streak')).toHaveTextContent('4days')
    expect(tile('Longest streak')).toHaveTextContent('5days')
    // 10 Oct – 19 Oct: 9 of 10 done; today isn't a miss until it's over
    await waitFor(() => expect(tile('Completion, last 12 weeks')).toHaveTextContent('90%9 of 10 days'))
  })

  it('draws the calendar with done, missed, not-scheduled and today, and no future days', async () => {
    const habit = seedReadingHabit()
    renderApp(`/habits/${habit.id}`)

    expect(await screen.findByRole('button', { name: 'Mon, 19 Oct: Done' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thu, 15 Oct: Missed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fri, 9 Oct: Not scheduled' })).toBeInTheDocument() // before it started
    expect(screen.getByRole('button', { name: 'Today, Tue, 20 Oct: Not done yet' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /21 Oct/ })).not.toBeInTheDocument()
  })

  it('backfills a missed day from the calendar, and the server recomputes the streak', async () => {
    const habit = seedReadingHabit()
    const { user } = renderApp(`/habits/${habit.id}`)

    await user.click(await screen.findByRole('button', { name: 'Thu, 15 Oct: Missed' }))

    expect(fakeBackend.lastBody(`POST /habits/${habit.id}/logs`)).toEqual({ date: '2026-10-15', completed: true })
    expect(await screen.findByRole('button', { name: 'Thu, 15 Oct: Done' })).toBeInTheDocument()
    await waitFor(() => expect(tile('Current streak')).toHaveTextContent('10days'))
  })

  it('marks today done from the calendar and can undo it', async () => {
    const habit = seedReadingHabit()
    const { user } = renderApp(`/habits/${habit.id}`)

    await user.click(await screen.findByRole('button', { name: 'Today, Tue, 20 Oct: Not done yet' }))
    await waitFor(() => expect(tile('Current streak')).toHaveTextContent('5days'))

    await user.click(screen.getByRole('button', { name: 'Today, Tue, 20 Oct: Done' }))
    expect(fakeBackend.lastBody(`POST /habits/${habit.id}/logs`)).toEqual({ date: '2026-10-20', completed: false })
    await waitFor(() => expect(tile('Current streak')).toHaveTextContent('4days'))
  })

  it('charts the weekly completion rate', async () => {
    const habit = seedReadingHabit()
    renderApp(`/habits/${habit.id}`)

    expect(await screen.findByRole('img', { name: 'Week of 5 Oct: 100%, 2 of 2 done' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Week of 12 Oct: 86%, 6 of 7 done' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Week of 19 Oct: 100%, 1 of 1 done' })).toBeInTheDocument()
    expect(
      fakeBackend.requests().some((r) => r.startsWith(`GET /habits/${habit.id}/stats?from=2026-08-03&to=2026-10-20`)),
    ).toBe(true)
  })

  it('lists the log history newest first, with notes', async () => {
    const habit = seedReadingHabit()
    fakeBackend.seedLog(habit.id, '2026-10-19', { note: 'Finished the book' })
    renderApp(`/habits/${habit.id}`)

    const history = await screen.findByRole('list', { name: 'Log history' })
    const rows = within(history).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Yesterday')
    expect(rows[0]).toHaveTextContent('Finished the book')
    expect(rows[1]).toHaveTextContent('Sun, 18 Oct')
  })

  it('edits a note', async () => {
    const habit = seedReadingHabit()
    const entry = fakeBackend.seedLog(habit.id, '2026-10-19', { note: 'Finished the book' })
    const { user } = renderApp(`/habits/${habit.id}`)

    await user.click(await screen.findByRole('button', { name: 'Edit note for Yesterday' }))
    const box = screen.getByRole('textbox', { name: 'Note for Yesterday' })
    expect(box).toHaveValue('Finished the book')
    await user.clear(box)
    await user.type(box, 'Started a new one')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByText('Started a new one')).toBeInTheDocument()
    expect(fakeBackend.lastBody(`PATCH /logs/${entry.id}`)).toEqual({ note: 'Started a new one' })
  })

  it('clears a note by saving it empty', async () => {
    const habit = seedReadingHabit()
    const entry = fakeBackend.seedLog(habit.id, '2026-10-19', { note: 'Finished the book' })
    const { user } = renderApp(`/habits/${habit.id}`)

    await user.click(await screen.findByRole('button', { name: 'Edit note for Yesterday' }))
    await user.clear(screen.getByRole('textbox', { name: 'Note for Yesterday' }))
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByRole('button', { name: 'Add note for Yesterday' })).toBeInTheDocument()
    expect(fakeBackend.lastBody(`PATCH /logs/${entry.id}`)).toEqual({ note: null })
  })

  it('makes an archived habit read-only until it is restored', async () => {
    const habit = seedReadingHabit({ isActive: false })
    const { user } = renderApp(`/habits/${habit.id}`)

    expect(await screen.findByText(/This habit is archived/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Mon, 19 Oct: Done' })).toBeInTheDocument() // calendar is not clickable
    expect(screen.queryByRole('button', { name: /Edit note/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restore' }))

    expect(await screen.findByRole('link', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByText(/This habit is archived/)).not.toBeInTheDocument()
    expect(fakeBackend.habit(habit.id)?.isActive).toBe(true)
  })

  it('archives from the detail page and returns to the list', async () => {
    const habit = seedReadingHabit()
    const { user } = renderApp(`/habits/${habit.id}`)

    await user.click(await screen.findByRole('button', { name: 'Archive' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Archive habit' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Habits' })).toBeInTheDocument()
    expect(fakeBackend.habit(habit.id)?.isActive).toBe(false)
  })

  it('counts weekly habits in weeks', async () => {
    const habit = fakeBackend.seedHabit(
      { title: 'Long run', frequency: 'weekly', createdAt: '2026-09-01T03:00:00.000Z' },
      { done: ['2026-09-30', '2026-10-07', '2026-10-15'] },
    )
    renderApp(`/habits/${habit.id}`)

    await screen.findByRole('heading', { level: 1, name: 'Long run' })
    expect(tile('Current streak')).toHaveTextContent('3weeks')
    expect(await screen.findByRole('button', { name: 'Mon, 19 Oct: Not done yet' })).toBeInTheDocument() // this week is still open
  })

  it.each(['999', 'not-a-number'])('shows "not found" for /habits/%s', async (id) => {
    renderApp(`/habits/${id}`)

    expect(await screen.findByText('Habit not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to habits' })).toBeInTheDocument()
  })

  it('shows a pending recommendation for this habit as a banner', async () => {
    const habit = seedReadingHabit()
    fakeBackend.seedRecommendation({ habitId: habit.id, habitTitle: 'Read', message: 'Try 5 pages for now.' })
    fakeBackend.seedRecommendation({ habitId: '999', habitTitle: 'Gym', message: 'Not about this habit' })
    const { user } = renderApp(`/habits/${habit.id}`)

    const banner = await screen.findByRole('list', { name: 'Suggestions for this habit' })
    const card = within(banner).getByRole('article', { name: 'Try 5 pages for now.' })
    expect(within(card).queryByRole('link', { name: 'Read' })).not.toBeInTheDocument()
    expect(screen.queryByText('Not about this habit')).not.toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: 'Dismiss' }))

    await waitFor(() => expect(screen.queryByRole('list', { name: 'Suggestions for this habit' })).not.toBeInTheDocument())
  })

  it('shows the forecast with the chance, target day, risk chip, confidence and reasons', async () => {
    const habit = seedReadingHabit()
    fakeBackend.seedForecast(habit.id, {
      target: { period: 'day', date: '2026-10-23', current: false },
      completionProbability: 0.72,
      riskScore: 0.28,
      riskLevel: 'low',
      confidence: 'medium',
      factors: [{ factor: 'streak', effect: 'lowers_risk', detail: 'On a 4-day streak.' }],
    })
    renderApp(`/habits/${habit.id}`)

    const card = (await screen.findByRole('heading', { name: 'Forecast' })).closest('[data-slot=card]') as HTMLElement
    expect(await within(card).findByText('72%')).toBeInTheDocument()
    expect(card).toHaveTextContent('likely to get done on Fri, 23 Oct')
    expect(within(card).getByText('On track')).toBeInTheDocument()
    expect(card).toHaveTextContent('Based on some history')
    expect(card).toHaveTextContent('Lowers risk: On a 4-day streak.')
  })

  it('asks for more logs instead of a forecast when there is not enough history', async () => {
    const habit = seedReadingHabit()
    renderApp(`/habits/${habit.id}`)

    expect(await screen.findByText('Log this habit for a few more days to unlock forecasts.')).toBeInTheDocument()
    const card = screen.getByRole('heading', { name: 'Forecast' }).closest('[data-slot=card]') as HTMLElement
    expect(within(card).queryByText(/%/)).not.toBeInTheDocument()
  })
})
