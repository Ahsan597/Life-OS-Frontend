import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { API, fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn } from '@/test/renderApp'
import { server } from '@/test/setup'
import { TODAY, freezeTime } from '@/test/time'

const FACTORS = [
  { factor: 'recent_completion', effect: 'raises_risk', detail: 'Done 3 of the last 10 scheduled days.' },
  { factor: 'day_of_week', effect: 'lowers_risk', detail: 'Done on 4 of the last 7 Tuesdays.' },
  { factor: 'miss_run', effect: 'raises_risk', detail: 'Missed the last 6 scheduled days in a row.' },
]

const ACCURACY = {
  evaluated: 75,
  observedMissRate: 0.533,
  brierScore: 0.2179,
  baselineBrierScore: 0.2489,
  brierSkillScore: 0.125,
  byRiskLevel: [
    { riskLevel: 'low', predictions: 22, averagePredictedRisk: 0.241, observedMissRate: 0.409 },
    { riskLevel: 'medium', predictions: 29, averagePredictedRisk: 0.463, observedMissRate: 0.379 },
    { riskLevel: 'high', predictions: 24, averagePredictedRisk: 0.771, observedMissRate: 0.833 },
  ],
  calibration: [
    { bucket: '0-20%', predictions: 8, averagePredictedRisk: 0.167, observedMissRate: 0.625 },
    { bucket: '20-40%', predictions: 14, averagePredictedRisk: 0.3, observedMissRate: 0.3 },
    { bucket: '40-60%', predictions: 0, averagePredictedRisk: null, observedMissRate: null },
    { bucket: '60-80%', predictions: 30, averagePredictedRisk: 0.7, observedMissRate: 0.8 },
    { bucket: '80-100%', predictions: 23, averagePredictedRisk: 0.9, observedMissRate: 0.87 },
  ],
}

function seedHabits() {
  const gym = fakeBackend.seedHabit({ title: 'Gym' })
  fakeBackend.seedForecast(gym.id, {
    currentStreak: 5,
    completionProbability: 0.095,
    riskScore: 0.905,
    riskLevel: 'high',
    factors: FACTORS,
  })
  const read = fakeBackend.seedHabit({ title: 'Read' })
  fakeBackend.seedForecast(read.id, {
    currentStreak: 12,
    target: { period: 'day', date: '2026-10-21', current: false },
    completionProbability: 0.8,
    riskScore: 0.2,
    riskLevel: 'low',
    factors: [FACTORS[1]],
  })
  fakeBackend.seedHabit({ title: 'Meditate' }) // no forecast: insufficient_data
  return { gym, read }
}

beforeEach(() => {
  freezeTime()
  setLoggedIn()
})

describe('PredictionsPage – forecasts', () => {
  it('heads the page with the server date and lists forecasts riskiest first', async () => {
    seedHabits()
    renderApp('/predictions')

    expect(await screen.findByRole('heading', { level: 1, name: 'Forecasts for Tue, 20 Oct' })).toBeInTheDocument()
    expect(screen.getByText(/These are tendencies, not certainties\./)).toBeInTheDocument()

    const list = screen.getByRole('list', { name: 'Forecasts' })
    const [gym, read] = within(list).getAllByRole('article')
    expect(gym).toHaveAccessibleName('Gym')
    expect(within(gym).getByText('High risk').closest('[data-risk]')).toHaveAttribute('data-risk', 'high')
    expect(within(gym).getByRole('meter', { name: 'Chance “Gym” gets done' })).toHaveAttribute('aria-valuenow', '10')
    expect(gym).toHaveTextContent('For today')
    expect(gym).toHaveTextContent('5 days')

    expect(read).toHaveTextContent('For tomorrow')
    expect(within(read).getByText('Low risk')).toBeInTheDocument()
  })

  it('shows the top two reasons with an arrow per effect, and the rest under Why?', async () => {
    seedHabits()
    const { user } = renderApp('/predictions')

    const gym = await screen.findByRole('article', { name: 'Gym' })
    const shown = within(gym).getAllByRole('list', { name: 'Reasons' })[0]
    expect(within(shown).getAllByRole('listitem').map((li) => li.getAttribute('data-effect'))).toEqual([
      'raises_risk',
      'lowers_risk',
    ])
    expect(shown).toHaveTextContent('Raises risk: Done 3 of the last 10 scheduled days.')

    const hidden = within(gym).getByText('Missed the last 6 scheduled days in a row.')
    expect(hidden).not.toBeVisible()
    await user.click(within(gym).getByText('Why? All 3 reasons'))
    expect(hidden).toBeVisible()
  })

  it('puts habits without enough history in a muted "Still learning" group, with no risk', async () => {
    seedHabits()
    renderApp('/predictions')

    const learning = await screen.findByRole('list', { name: 'Still learning' })
    expect(learning).toHaveTextContent('MeditateNot enough history yet')
    expect(within(learning).queryByText(/%/)).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Forecasts' })).queryByText('Meditate')).not.toBeInTheDocument()
  })

  it('nudges for a check-in when today has none and no forecast uses one', async () => {
    seedHabits()
    renderApp('/predictions')

    expect(await screen.findByText("Do today's check-in to sharpen today's forecasts.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Check in' })).toHaveAttribute('href', '/check-ins')
    expect(fakeBackend.requests()).toContain(`GET /checkins/${TODAY}`)
  })

  it('skips the nudge once a forecast already uses the check-in', async () => {
    const habit = fakeBackend.seedHabit({ title: 'Gym' })
    fakeBackend.seedForecast(habit.id, {
      riskLevel: 'medium',
      riskScore: 0.4,
      factors: [{ factor: 'checkin', metric: 'sleepHours', effect: 'raises_risk', detail: 'You slept 5 h.' }],
    })
    renderApp('/predictions')

    await screen.findByRole('article', { name: 'Gym' })
    expect(screen.queryByText(/sharpen today's forecasts/)).not.toBeInTheDocument()
    expect(fakeBackend.requests()).not.toContain(`GET /checkins/${TODAY}`)
  })

  it('skips the nudge when today is already checked in', async () => {
    seedHabits()
    fakeBackend.seedCheckIn({ date: TODAY, mood: 4 })
    renderApp('/predictions')

    await screen.findByRole('article', { name: 'Gym' })
    await waitFor(() => expect(fakeBackend.requests()).toContain(`GET /checkins/${TODAY}`))
    expect(screen.queryByText(/sharpen today's forecasts/)).not.toBeInTheDocument()
  })

  it('offers a retry when forecasts fail to load', async () => {
    server.use(http.get(`${API}/predictions/streak-risk`, () => HttpResponse.json({ error: 'Model offline' }, { status: 500 })))
    renderApp('/predictions')

    expect(await screen.findByText('Model offline')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

describe('PredictionsPage – accuracy', () => {
  it('leads with the high/low headline, then the calibration chart and Brier score', async () => {
    seedHabits()
    fakeBackend.seedAccuracy(ACCURACY)
    renderApp('/predictions')

    expect(await screen.findByTestId('accuracy-headline')).toHaveTextContent(
      'When we said high risk, you missed 83% of the time. When we said low risk, you missed 41%.',
    )
    // The 40-60% band had no forecasts, so it's left out.
    expect(screen.getAllByTestId('calibration-group')).toHaveLength(4)
    expect(
      screen.getByRole('img', { name: 'Risk band 80-100%: predicted 90%, actually missed 87%, 23 forecasts' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Accuracy score: Brier 0.22 \(lower is better; guessing your average scores 0.25\)/)).toBeInTheDocument()
    expect(screen.getByText('Beats guessing')).toBeInTheDocument()
    expect(screen.getByText('75 forecasts checked · Model heuristic_v1')).toBeInTheDocument()
  })

  it('shows the predictions count in the chart tooltip', async () => {
    seedHabits()
    fakeBackend.seedAccuracy(ACCURACY)
    const { user } = renderApp('/predictions')

    await user.hover(await screen.findByRole('img', { name: /^Risk band 0-20%/ }))

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('17% predicted · 63% missedRisk 0-20% · 8 forecasts')
  })

  it('hides "Beats guessing" when the forecasts do no better than the baseline', async () => {
    seedHabits()
    fakeBackend.seedAccuracy({ ...ACCURACY, brierSkillScore: -0.02 })
    renderApp('/predictions')

    await screen.findByTestId('accuracy-headline')
    expect(screen.queryByText('Beats guessing')).not.toBeInTheDocument()
  })

  it('switches between 30, 90 and 180 days, computed from the server date', async () => {
    seedHabits()
    fakeBackend.seedAccuracy(ACCURACY)
    const { user } = renderApp('/predictions')
    await screen.findByTestId('accuracy-headline')
    expect(fakeBackend.requests()).toContain('GET /predictions/accuracy?from=2026-09-20&to=2026-10-19')

    await user.click(screen.getByRole('button', { name: 'Last 90 days' }))
    await waitFor(() => expect(fakeBackend.requests()).toContain('GET /predictions/accuracy?from=2026-07-22&to=2026-10-19'))

    await user.click(screen.getByRole('button', { name: 'Last 180 days' }))
    await waitFor(() => expect(fakeBackend.requests()).toContain('GET /predictions/accuracy?from=2026-04-23&to=2026-10-19'))
  })

  it('shows an empty state when nothing has been evaluated yet', async () => {
    seedHabits()
    renderApp('/predictions')

    expect(
      await screen.findByText("Keep logging for a week or two and we'll show how accurate these forecasts are."),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('accuracy-headline')).not.toBeInTheDocument()
  })
})
