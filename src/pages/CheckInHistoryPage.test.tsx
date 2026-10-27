import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn } from '@/test/renderApp'
import { freezeTime } from '@/test/time'

function seedWeek() {
  // Mood and stress rise; energy stays flat; sleep was logged only once.
  fakeBackend.seedCheckIn({ date: '2026-10-14', mood: 2, energy: 3, stressLevel: 1, sleepHours: 6 })
  fakeBackend.seedCheckIn({ date: '2026-10-16', mood: 3, energy: 3, stressLevel: 2 })
  fakeBackend.seedCheckIn({ date: '2026-10-18', mood: 4, energy: 3, stressLevel: 3 })
  fakeBackend.seedCheckIn({ date: '2026-10-19', mood: 4, energy: 3, stressLevel: 3 })
  fakeBackend.seedCheckIn({ date: '2026-10-20', mood: 5, energy: 3, stressLevel: 4, note: 'Big deadline' })
}

async function metricCard(name: string) {
  const heading = await screen.findByRole('heading', { level: 2, name })
  return heading.closest('[data-slot=card]') as HTMLElement
}

beforeEach(() => {
  freezeTime()
  setLoggedIn()
})

describe('CheckInHistoryPage', () => {
  it('loads the last 30 days by default', async () => {
    seedWeek()
    renderApp('/history')

    expect(await screen.findByText(/of 30 days/)).toHaveTextContent('Checked in on 5 of 30 days.')
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(fakeBackend.requests()).toContain('GET /checkins/stats?from=2026-09-21&to=2026-10-20')
  })

  it('shows averages and trend direction, colouring rising stress as bad', async () => {
    seedWeek()
    renderApp('/history')

    const mood = await metricCard('Mood')
    expect(mood).toHaveTextContent('3.6 / 5average')
    expect(within(mood).getByText('Rising').closest('[data-tone]')).toHaveAttribute('data-tone', 'good')

    const stress = await metricCard('Stress')
    expect(stress).toHaveTextContent('2.6 / 5average')
    expect(within(stress).getByText('Rising').closest('[data-tone]')).toHaveAttribute('data-tone', 'bad')

    const energy = await metricCard('Energy')
    expect(within(energy).getByText('Steady').closest('[data-tone]')).toHaveAttribute('data-tone', 'neutral')

    const sleep = await metricCard('Sleep')
    expect(sleep).toHaveTextContent('6 haverage')
    expect(within(sleep).getByText('Not enough data')).toBeInTheDocument()
  })

  it('draws days without a check-in as gaps, not zeros', async () => {
    seedWeek()
    renderApp('/history')

    const mood = await metricCard('Mood')
    // 14th and 16th stand alone (dots); 18th–20th are consecutive (one line)
    expect(within(mood).getAllByTestId('trend-dot')).toHaveLength(2)
    expect(within(mood).getAllByTestId('trend-line')).toHaveLength(1)
  })

  it('switches between 7, 30 and 90 days', async () => {
    seedWeek()
    fakeBackend.seedCheckIn({ date: '2026-08-01', mood: 1 }) // only inside 90 days
    const { user } = renderApp('/history')
    await screen.findByText(/of 30 days/)

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }))
    expect(await screen.findByText(/of 7 days/)).toHaveTextContent('Checked in on 5 of 7 days.')
    expect(fakeBackend.requests()).toContain('GET /checkins/stats?from=2026-10-14&to=2026-10-20')

    await user.click(screen.getByRole('button', { name: 'Last 90 days' }))
    expect(await screen.findByText(/of 90 days/)).toHaveTextContent('Checked in on 6 of 90 days.')
    expect(fakeBackend.requests()).toContain('GET /checkins/stats?from=2026-07-23&to=2026-10-20')
  })

  it('shows an empty state with no check-ins in range', async () => {
    renderApp('/history?days=7')

    expect(await screen.findByText('No check-ins in the last 7 days')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Check in now' })).toHaveAttribute('href', '/check-ins')
  })

  it('lists entries newest first, linking to edit each day', async () => {
    seedWeek()
    renderApp('/history')

    const entries = await screen.findByRole('list', { name: 'Check-in entries' })
    const links = within(entries).getAllByRole('link')
    expect(links).toHaveLength(5)
    expect(links[0]).toHaveAttribute('href', '/check-ins')
    expect(links[0]).toHaveTextContent('Big deadline')
    expect(links[1]).toHaveAttribute('href', '/check-ins?date=2026-10-19')
    expect(links[1]).toHaveAccessibleName('Yesterday: Mood 4, Energy 3, Stress 3')
  })

  it('opens a past entry in the check-in form', async () => {
    seedWeek()
    const { user } = renderApp('/history')

    await user.click(await screen.findByRole('link', { name: /^Yesterday:/ }))

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Past check-in' })).toBeInTheDocument())
    expect(await screen.findByRole('button', { name: 'Mood 4: Good' })).toHaveAttribute('aria-pressed', 'true')
  })
})
