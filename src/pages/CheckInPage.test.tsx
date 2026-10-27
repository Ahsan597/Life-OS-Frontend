import { fireEvent, screen, waitFor } from '@testing-library/react'
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

describe('CheckInPage', () => {
  it("shows an empty form for today when there's no check-in yet (404 is not an error)", async () => {
    renderApp('/check-ins')

    expect(await screen.findByRole('button', { name: 'Save check-in' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Daily check-in' })).toBeInTheDocument()
    expect(screen.getByText('Tuesday, 20 October 2026')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mood 4: Good' })).toHaveAttribute('aria-pressed', 'false')
  })

  it("doesn't allow future dates", async () => {
    renderApp('/check-ins')

    expect(await screen.findByLabelText('Date')).toHaveAttribute('max', TODAY)
  })

  it('saves today, always sending all four metrics (blank ones as null)', async () => {
    const { user } = renderApp('/check-ins')

    await user.click(await screen.findByRole('button', { name: 'Mood 4: Good' }))
    expect(screen.getByText('Good')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Sleep (hours)'), '7.5')
    await user.type(screen.getByLabelText('Note (optional)'), '  Slept well  ')
    await user.click(screen.getByRole('button', { name: 'Save check-in' }))

    await waitFor(() =>
      expect(fakeBackend.lastBody('POST /checkins')).toEqual({
        date: TODAY,
        mood: 4,
        energy: null,
        stressLevel: null,
        sleepHours: 7.5,
        note: 'Slept well',
      }),
    )
    expect(await screen.findByRole('button', { name: 'Update check-in' })).toBeInTheDocument()
  })

  it('needs at least one metric', async () => {
    const { user } = renderApp('/check-ins')

    await user.type(await screen.findByLabelText('Note (optional)'), 'Only a note')
    await user.click(screen.getByRole('button', { name: 'Save check-in' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Fill in at least one of mood, energy, stress or sleep.')
    expect(fakeBackend.lastBody('POST /checkins')).toBeUndefined()
  })

  it('validates sleep hours', async () => {
    const { user } = renderApp('/check-ins')

    await user.type(await screen.findByLabelText('Sleep (hours)'), '25')
    await user.click(screen.getByRole('button', { name: 'Save check-in' }))

    expect(screen.getByText('Sleep must be between 0 and 24 hours')).toBeInTheDocument()
    expect(screen.getByLabelText('Sleep (hours)')).toHaveAttribute('aria-describedby', 'sleepHours-error')
    expect(fakeBackend.lastBody('POST /checkins')).toBeUndefined()
  })

  it('prefills an existing check-in, and clearing a metric sends null', async () => {
    fakeBackend.seedCheckIn({ date: TODAY, mood: 3, energy: 2, sleepHours: 6, note: 'Tired' })
    const { user } = renderApp('/check-ins')

    expect(await screen.findByRole('button', { name: 'Update check-in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mood 3: Okay' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Energy 2: Low' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Sleep (hours)')).toHaveValue(6)
    expect(screen.getByLabelText('Note (optional)')).toHaveValue('Tired')

    await user.click(screen.getByRole('button', { name: 'Energy 2: Low' })) // pressing again clears it
    await user.click(screen.getByRole('button', { name: 'Update check-in' }))

    await waitFor(() => expect(fakeBackend.checkIns()[0].energy).toBeNull())
    expect(fakeBackend.lastBody('POST /checkins')).toMatchObject({ mood: 3, energy: null, sleepHours: 6 })
  })

  it('checks in for a past day from the URL', async () => {
    fakeBackend.seedCheckIn({ date: '2026-10-18', mood: 5 })
    const { user } = renderApp('/check-ins?date=2026-10-18')

    expect(await screen.findByRole('heading', { level: 1, name: 'Past check-in' })).toBeInTheDocument()
    expect(screen.getByText('Sunday, 18 October 2026')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Mood 5: Great' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Stress 2: Mild' }))
    await user.click(screen.getByRole('button', { name: 'Update check-in' }))

    await waitFor(() => expect(fakeBackend.lastBody('POST /checkins')).toMatchObject({ date: '2026-10-18', stressLevel: 2 }))
  })

  it('switches day with the date field and the Yesterday button', async () => {
    const { user } = renderApp('/check-ins')

    await user.click(await screen.findByRole('button', { name: 'Yesterday' }))
    expect(await screen.findByText('Monday, 19 October 2026')).toBeInTheDocument()
    await waitFor(() => expect(fakeBackend.requests()).toContain('GET /checkins/2026-10-19'))

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-01' } })
    expect(await screen.findByText('Thursday, 1 October 2026')).toBeInTheDocument()

    // A future date is ignored
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-25' } })
    expect(screen.getByText('Thursday, 1 October 2026')).toBeInTheDocument()
  })

  it('falls back to today for a future date in the URL', async () => {
    renderApp('/check-ins?date=2026-12-25')

    expect(await screen.findByRole('heading', { level: 1, name: 'Daily check-in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveValue(TODAY)
  })

  it('shows a form-level server error (field "")', async () => {
    server.use(
      http.post(`${API}/checkins`, () =>
        HttpResponse.json(
          { error: 'Validation failed', details: [{ field: '', message: 'Provide at least one of: mood, energy' }] },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderApp('/check-ins')

    await user.click(await screen.findByRole('button', { name: 'Mood 4: Good' }))
    await user.click(screen.getByRole('button', { name: 'Save check-in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Provide at least one of: mood, energy')
  })
})
