import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API, fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn } from '@/test/renderApp'
import { server } from '@/test/setup'
import { freezeTime } from '@/test/time'

// Toasts aren't rendered in page tests (no <Toaster />); record the calls instead.
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast }))

const SLEEP = {
  metric: 'sleepHours',
  r: 0.353,
  sampleSize: 37,
  strength: 'moderate',
  direction: 'positive',
  summary: 'On days you sleep more, you complete more of your habits.',
  buckets: [
    { label: '<6h', days: 9, averageCompletionRate: 0.463 },
    { label: '6-7h', days: 9, averageCompletionRate: 0.593 },
    { label: '7-8h', days: 14, averageCompletionRate: 0.607 },
    { label: '8h+', days: 0, averageCompletionRate: null },
  ],
}

const MOOD = {
  metric: 'mood',
  r: 0.21,
  sampleSize: 37,
  strength: 'weak',
  direction: 'positive',
  summary: 'On better-mood days you complete slightly more habits.',
  buckets: ['1', '2', '3', '4', '5'].map((label, i) => ({ label, days: 5, averageCompletionRate: 0.1 * (i + 3) })),
}

const GYM_STRESS = {
  scope: 'habit',
  habitId: '19',
  habitTitle: 'Gym',
  metric: 'stressLevel',
  r: -0.525,
  sampleSize: 16,
  strength: 'strong',
  direction: 'negative',
  summary: 'On days you\'re more stressed, you\'re less likely to complete "Gym".',
}

function correlation(metric: string, summary: string, strength = 'weak') {
  return { metric, r: 0.2, sampleSize: 30, strength, direction: 'positive', summary }
}

function seedPatterns() {
  fakeBackend.seedCorrelations({
    overall: [SLEEP, MOOD],
    habits: [
      {
        habitId: '18',
        title: 'Read 20 pages',
        correlations: [
          correlation('sleepHours', 'On days you sleep more, you\'re more likely to complete "Read 20 pages".', 'moderate'),
          correlation('mood', 'Mood barely changes "Read 20 pages".', 'negligible'),
          correlation('energy', 'Energy and reading go together.'),
          correlation('stressLevel', 'Stress barely matters for reading.', 'negligible'),
        ],
      },
      {
        habitId: '19',
        title: 'Gym',
        correlations: [
          correlation('sleepHours', 'Gym: sleep link'),
          correlation('mood', 'Gym: mood link'),
          correlation('energy', 'Gym: energy link'),
          { ...GYM_STRESS, scope: undefined },
        ],
      },
    ],
    highlights: [GYM_STRESS, { ...SLEEP, scope: 'overall', buckets: undefined }],
  })
}

beforeEach(() => {
  freezeTime()
  setLoggedIn()
})

describe('InsightsPage – patterns', () => {
  it('loads the last 90 days ending yesterday, with the disclaimer', async () => {
    renderApp('/insights')

    expect(await screen.findByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText(/Correlation, not causation\./)).toBeInTheDocument()
    await waitFor(() =>
      expect(fakeBackend.requests()).toContain('GET /insights/correlations?from=2026-07-22&to=2026-10-19'),
    )
  })

  it('switches between 30, 90 and 180 days', async () => {
    const { user } = renderApp('/insights')
    await screen.findByText('Key findings')

    await user.click(screen.getByRole('button', { name: '30 days' }))
    await waitFor(() =>
      expect(fakeBackend.requests()).toContain('GET /insights/correlations?from=2026-09-20&to=2026-10-19'),
    )
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '180 days' }))
    await waitFor(() =>
      expect(fakeBackend.requests()).toContain('GET /insights/correlations?from=2026-04-23&to=2026-10-19'),
    )
  })

  it('shows the empty state when nothing stands out yet', async () => {
    renderApp('/insights')

    expect(
      await screen.findByText('Keep logging. Patterns appear after about a week of check-ins and habits.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No daily habits to compare')).toBeInTheDocument()
  })

  it('lists key findings with their summary, strength and habit link', async () => {
    seedPatterns()
    renderApp('/insights')

    const findings = await screen.findByRole('list', { name: 'Key findings' })
    const [gym, sleep] = within(findings).getAllByRole('listitem')

    expect(gym).toHaveTextContent('On days you\'re more stressed, you\'re less likely to complete "Gym".')
    expect(within(gym).getByRole('link', { name: 'Gym' })).toHaveAttribute('href', '/habits/19')
    expect(within(gym).getByText('Strong')).toHaveAttribute('data-emphasis', 'bold')
    expect(within(gym).getByRole('img', { name: 'r = −0.53' })).toBeInTheDocument()
    expect(within(gym).getByTestId('r-fill')).toHaveAttribute('data-effect', 'hurts')

    expect(within(sleep).getByText('Moderate')).toHaveAttribute('data-emphasis', 'normal')
    expect(within(sleep).getByTestId('r-fill')).toHaveAttribute('data-effect', 'helps')
    expect(within(sleep).queryByRole('link')).not.toBeInTheDocument()
  })

  it('charts completion by sleep, with empty buckets as outlines, and switches metric', async () => {
    seedPatterns()
    const { user } = renderApp('/insights')

    expect(await screen.findByRole('heading', { name: 'Habit completion by sleep' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sleep <6h: 46%, 9 days' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sleep 8h+: no data, 0 days' })).toBeInTheDocument()
    expect(screen.getAllByTestId('bucket-bar')).toHaveLength(3)
    expect(screen.getAllByTestId('empty-bucket')).toHaveLength(1)

    await user.click(within(screen.getByRole('group', { name: 'Metric' })).getByRole('button', { name: 'Mood' }))

    expect(screen.getByRole('heading', { name: 'Habit completion by mood' })).toBeInTheDocument()
    expect(screen.getByText('On better-mood days you complete slightly more habits.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mood 5 (Great): 70%, 5 days' })).toBeInTheDocument()
    expect(screen.getAllByTestId('bucket-bar')).toHaveLength(5)
  })

  it('shows a tooltip with the day count on hover', async () => {
    seedPatterns()
    const { user } = renderApp('/insights')

    await user.hover(await screen.findByRole('img', { name: 'Sleep 7-8h: 61%, 14 days' }))

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('61%Sleep 7-8h · 14 days')
  })

  it('shows one habit\'s four correlations and switches habit', async () => {
    seedPatterns()
    const { user } = renderApp('/insights')

    const read = await screen.findByRole('list', { name: 'Correlations for Read 20 pages' })
    expect(within(read).getAllByRole('listitem')).toHaveLength(4)
    expect(read).toHaveTextContent('On days you sleep more, you\'re more likely to complete "Read 20 pages".')

    await user.selectOptions(screen.getByLabelText('Habit'), 'Gym')

    const gym = screen.getByRole('list', { name: 'Correlations for Gym' })
    expect(gym).toHaveTextContent('Gym: energy link')
    expect(within(gym).getByText('Strong')).toBeInTheDocument()
  })
})

describe('InsightsPage – recommendations', () => {
  it('shows pending recommendations with icon, habit link and reason', async () => {
    fakeBackend.seedRecommendation({
      rule: 'missed_in_a_row',
      habitId: '19',
      habitTitle: 'Gym',
      message: 'You\'ve missed "Gym" 3 times in a row.',
      reason: 'The last 3 days it was scheduled were all missed.',
      score: 40,
    })
    fakeBackend.seedRecommendation({ rule: 'streak_milestone', message: 'Seven days straight!', score: 45 })
    const { user } = renderApp('/insights')

    const list = await screen.findByRole('list', { name: 'Pending recommendations' })
    const [streak, gym] = within(list).getAllByRole('article')
    expect(streak).toHaveAccessibleName('Seven days straight!')
    expect(streak).toHaveAttribute('data-tone', 'positive')
    expect(streak).toHaveTextContent('🔥')

    expect(gym).toHaveAttribute('data-tone', 'warning')
    expect(gym).toHaveTextContent('⚠️')
    expect(within(gym).getByRole('link', { name: 'Gym' })).toHaveAttribute('href', '/habits/19')
    const reason = within(gym).getByText('The last 3 days it was scheduled were all missed.')
    expect(reason).not.toBeVisible()
    await user.click(within(gym).getByText('Why am I seeing this?'))
    expect(reason).toBeVisible()
  })

  it('links a check-in gap to the check-in page', async () => {
    fakeBackend.seedRecommendation({ rule: 'checkin_gap', message: 'You haven\'t checked in for 4 days.' })
    renderApp('/insights')

    const card = await screen.findByRole('article', { name: 'You haven\'t checked in for 4 days.' })
    expect(card).toHaveAttribute('data-tone', 'info')
    expect(within(card).getByRole('link', { name: 'Check in' })).toHaveAttribute('href', '/check-ins')
  })

  it('accepts a recommendation and removes the card', async () => {
    const rec = fakeBackend.seedRecommendation({ message: 'Try 5 minutes instead.' })
    const { user } = renderApp('/insights')

    const card = await screen.findByRole('article', { name: 'Try 5 minutes instead.' })
    await user.click(within(card).getByRole('button', { name: 'Accept' }))

    await waitFor(() => expect(screen.queryByRole('article', { name: 'Try 5 minutes instead.' })).not.toBeInTheDocument())
    expect(fakeBackend.lastBody(`PATCH /insights/recommendations/${rec.id}`)).toEqual({ status: 'accepted' })
    expect(fakeBackend.recommendation(rec.id)?.status).toBe('accepted')
    expect(await screen.findByText('You\'re all caught up')).toBeInTheDocument()
  })

  it('hides the card straight away and brings it back if dismissing fails', async () => {
    const rec = fakeBackend.seedRecommendation({ message: 'Sleep a little earlier.' })
    let fail!: () => void
    server.use(
      http.patch(`${API}/insights/recommendations/:id`, async () => {
        await new Promise<void>((resolve) => (fail = resolve))
        return HttpResponse.json({ error: 'Something went wrong' }, { status: 500 })
      }),
    )
    const { user } = renderApp('/insights')

    const card = await screen.findByRole('article', { name: 'Sleep a little earlier.' })
    await user.click(within(card).getByRole('button', { name: 'Dismiss' }))

    // Optimistic: gone while the request is still in flight
    expect(screen.queryByRole('article', { name: 'Sleep a little earlier.' })).not.toBeInTheDocument()
    await waitFor(() => expect(fail).toBeDefined())
    fail()

    expect(await screen.findByRole('article', { name: 'Sleep a little earlier.' })).toBeInTheDocument()
    expect(fakeBackend.recommendation(rec.id)?.status).toBe('pending')
  })

  it('shows accepted and dismissed ones under History', async () => {
    fakeBackend.seedRecommendation({ message: 'Still pending' })
    fakeBackend.seedRecommendation({ message: 'Took this one', status: 'accepted' })
    fakeBackend.seedRecommendation({ message: 'Not for me', status: 'dismissed' })
    const { user } = renderApp('/insights')
    await screen.findByRole('article', { name: 'Still pending' })

    await user.click(screen.getByRole('button', { name: 'History' }))

    const list = await screen.findByRole('list', { name: 'Past recommendations' })
    expect(fakeBackend.requests()).toContain('GET /insights/recommendations?status=all&sort=rank')
    expect(within(list).getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual([
      'Not for me',
      'Took this one',
    ])
    expect(within(list).getByText('Accepted')).toBeInTheDocument()
    expect(within(list).getByText('Dismissed')).toBeInTheDocument()
    expect(within(list).queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
  })
})

describe('InsightsPage – ranked feed', () => {
  it('renders in the server order (ranked by score) and highlights a high-priority top item', async () => {
    fakeBackend.seedRecommendation({ message: 'Newest but low', score: 20, priority: 'low', createdAt: '2026-10-19T10:00:00.000Z' })
    fakeBackend.seedRecommendation({ message: 'Most important', score: 82, priority: 'high', createdAt: '2026-10-12T10:00:00.000Z' })
    fakeBackend.seedRecommendation({ message: 'Also high', score: 65, priority: 'high', createdAt: '2026-10-14T10:00:00.000Z' })
    renderApp('/insights')

    const list = await screen.findByRole('list', { name: 'Pending recommendations' })
    const cards = within(list).getAllByRole('article')
    expect(cards.map((a) => a.getAttribute('aria-label'))).toEqual(['Most important', 'Also high', 'Newest but low'])
    expect(cards[0]).toHaveAttribute('data-featured', 'true')
    expect(cards[1]).not.toHaveAttribute('data-featured')
    expect(within(cards[0]).getByText('High priority')).toBeInTheDocument()
    expect(within(cards[1]).getByText('High priority')).toBeInTheDocument()
    expect(within(cards[2]).queryByText('High priority')).not.toBeInTheDocument()
    expect(fakeBackend.requests()).toContain('GET /insights/recommendations?status=pending&sort=rank')
  })

  it('switches to newest first, keeping the choice in the URL', async () => {
    fakeBackend.seedRecommendation({ message: 'Newer', score: 20, createdAt: '2026-10-19T10:00:00.000Z' })
    fakeBackend.seedRecommendation({ message: 'Older', score: 80, createdAt: '2026-10-12T10:00:00.000Z' })
    const { user } = renderApp('/insights')
    await screen.findByRole('article', { name: 'Older' })

    await user.click(screen.getByRole('button', { name: 'Newest' }))

    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Pending recommendations' }))
          .getAllByRole('article')
          .map((a) => a.getAttribute('aria-label')),
      ).toEqual(['Newer', 'Older']),
    )
    expect(fakeBackend.requests()).toContain('GET /insights/recommendations?status=pending&sort=recent')
    expect(screen.getByRole('button', { name: 'Newest' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens on "Newest" from ?sort=recent', async () => {
    fakeBackend.seedRecommendation({ message: 'Only one' })
    renderApp('/insights?sort=recent')

    await screen.findByRole('article', { name: 'Only one' })
    expect(screen.getByRole('button', { name: 'Newest' })).toHaveAttribute('aria-pressed', 'true')
    expect(fakeBackend.requests()).not.toContain('GET /insights/recommendations?status=pending&sort=rank')
  })

  it('explains the ranking under "Why am I seeing this?", leaving out near-neutral factors', async () => {
    fakeBackend.seedRecommendation({
      message: 'Ranked tip',
      reason: 'You missed it twice.',
      scoreFactors: { ruleWeight: 0.85, habitRisk: 1.2, feedback: 0.7, freshness: 0.98 },
    })
    renderApp('/insights')

    const card = await screen.findByRole('article', { name: 'Ranked tip' })
    expect(within(card).getByText('Why am I seeing this?')).toBeInTheDocument()
    expect(within(card).getByText('You missed it twice.')).toBeInTheDocument()
    const reasons = within(card).getByRole('list', { name: 'Ranking reasons', hidden: true })
    expect(within(reasons).getAllByRole('listitem', { hidden: true }).map((li) => li.textContent)).toEqual([
      "This habit's streak is at risk",
      "You often dismiss these, so it's ranked lower",
    ])
  })

  it('gives a streak-at-risk tip its own icon and a "Go to habit" button', async () => {
    fakeBackend.seedRecommendation({
      rule: 'streak_at_risk',
      habitId: '18',
      habitTitle: 'Read',
      message: 'Your 5-day streak on "Read" is at risk today.',
      priority: 'high',
      score: 90,
    })
    renderApp('/insights')

    const card = await screen.findByRole('article', { name: 'Your 5-day streak on "Read" is at risk today.' })
    expect(card).toHaveAttribute('data-tone', 'urgent')
    expect(card).toHaveTextContent('🔥⚠️')
    expect(within(card).getByRole('link', { name: 'Go to habit' })).toHaveAttribute('href', '/habits/18')
  })

  it('says it will show fewer tips like a dismissed one', async () => {
    fakeBackend.seedRecommendation({ message: 'Not useful' })
    const { user } = renderApp('/insights')

    const card = await screen.findByRole('article', { name: 'Not useful' })
    await user.click(within(card).getByRole('button', { name: 'Dismiss' }))

    await waitFor(() => expect(toast).toHaveBeenCalledWith("Got it. We'll show fewer tips like this."))
  })
})
