import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { API, fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn } from '@/test/renderApp'
import { server } from '@/test/setup'
import { freezeTime } from '@/test/time'

// Toasts aren't rendered in page tests (no <Toaster />); record the calls instead.
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast }))

function section(name: string) {
  return screen.getByRole('heading', { level: 2, name }).closest('[data-slot=card]') as HTMLElement
}

beforeEach(() => {
  freezeTime()
  setLoggedIn()
  toast.mockClear()
  toast.error.mockClear()
  toast.success.mockClear()
})

describe('SettingsPage – profile', () => {
  it('shows the name, a read-only email, and Save disabled until something changes', async () => {
    renderApp('/settings')

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Ahsan')
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
    expect(screen.getByText("Email can't be changed yet.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeDisabled()
  })

  it('saves only the name and updates the signed-in user', async () => {
    const { user } = renderApp('/settings')
    const name = await screen.findByLabelText('Name')

    await user.clear(name)
    await user.type(name, 'Sana')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Profile saved'))
    expect(fakeBackend.lastBody('PATCH /users/me')).toEqual({ name: 'Sana' })
    expect(useAuthStore.getState().user?.name).toBe('Sana')
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeDisabled()
  })

  it('clears the name with null', async () => {
    const { user } = renderApp('/settings')
    await user.clear(await screen.findByLabelText('Name'))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => expect(fakeBackend.lastBody('PATCH /users/me')).toEqual({ name: null }))
  })

  it('shows a server validation error on the field', async () => {
    server.use(
      http.patch(`${API}/users/me`, () =>
        HttpResponse.json({ error: 'Validation failed', details: [{ field: 'name', message: 'Name is not allowed' }] }, { status: 400 }),
      ),
    )
    const { user } = renderApp('/settings')
    await user.type(await screen.findByLabelText('Name'), 'x')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Name is not allowed')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('SettingsPage – timezone', () => {
  it('confirms, saves the new zone, and refreshes everything that depends on "today"', async () => {
    const { user } = renderApp('/settings')
    const card = await screen.findByRole('heading', { level: 2, name: 'Timezone' }).then(() => section('Timezone'))
    expect(card).toHaveTextContent("Past logs keep their dates; 'today' will follow the new timezone from now on.")
    expect(card).toHaveTextContent('Local time there: 12:00') // Karachi
    await waitFor(() => expect(fakeBackend.count('GET /notifications?limit=1')).toBe(1))

    const input = within(card).getByLabelText('Timezone')
    await user.clear(input)
    await user.type(input, 'Europe/London')
    await user.click(await screen.findByRole('option', { name: /^Europe\/London/ }))
    expect(card).toHaveTextContent('Local time there: 08:00')

    await user.click(within(card).getByRole('button', { name: 'Save timezone' }))
    const dialog = await screen.findByRole('dialog', { name: 'Switch to Europe/London?' })
    expect(fakeBackend.lastBody('PATCH /users/me')).toBeUndefined() // nothing until confirmed
    await user.click(within(dialog).getByRole('button', { name: 'Change timezone' }))

    await waitFor(() => expect(useAuthStore.getState().user?.timezone).toBe('Europe/London'))
    expect(fakeBackend.lastBody('PATCH /users/me')).toEqual({ timezone: 'Europe/London' })
    // Every query was invalidated, so even the bell's count refetched.
    await waitFor(() => expect(fakeBackend.count('GET /notifications?limit=1')).toBe(2))
  })

  it('fills in the device timezone, and cancelling the confirmation saves nothing', async () => {
    const real = new Intl.DateTimeFormat().resolvedOptions()
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...real, timeZone: 'America/New_York' })
    const { user } = renderApp('/settings')
    await screen.findByRole('heading', { level: 2, name: 'Timezone' })

    await user.click(within(section('Timezone')).getByRole('button', { name: 'Use my device timezone' }))
    await user.click(within(section('Timezone')).getByRole('button', { name: 'Save timezone' }))
    const dialog = await screen.findByRole('dialog', { name: 'Switch to America/New_York?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(fakeBackend.lastBody('PATCH /users/me')).toBeUndefined()
    expect(useAuthStore.getState().user?.timezone).toBe('Asia/Karachi')
    spy.mockRestore()
  })
})

describe('SettingsPage – reminders', () => {
  it('labels the time with the user timezone and sends only changed keys', async () => {
    const { user } = renderApp('/settings')
    const time = await screen.findByLabelText('Remind me at (your time, Asia/Karachi)')
    expect(time).toHaveAttribute('type', 'time')
    expect(screen.getByText('We only remind you if something is still open that day.')).toBeInTheDocument()

    await user.clear(time)
    await user.type(time, '07:30')
    await user.click(screen.getByRole('button', { name: 'Save reminders' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Reminder settings saved'))
    expect(fakeBackend.lastBody('PATCH /users/me')).toEqual({ preferences: { reminderTime: '07:30' } })
    expect(fakeBackend.user()?.preferences).toEqual({ remindersEnabled: true, reminderTime: '07:30', emailReminders: false })
  })

  it('disables the time and email when reminders are off', async () => {
    const { user } = renderApp('/settings')
    const reminder = await screen.findByRole('switch', { name: 'Daily reminder' })
    expect(reminder).toHaveAttribute('aria-checked', 'true')

    await user.click(reminder)

    expect(reminder).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByLabelText('Remind me at (your time, Asia/Karachi)')).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Also email me' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Also email me' })).toHaveAccessibleDescription(
      'Email delivery is in preview: messages are logged on the server, not sent yet.',
    )
    await user.click(screen.getByRole('button', { name: 'Save reminders' }))
    await waitFor(() => expect(fakeBackend.lastBody('PATCH /users/me')).toEqual({ preferences: { remindersEnabled: false } }))
  })

  it('shows an inline error for a missing time', async () => {
    const { user } = renderApp('/settings')
    await user.clear(await screen.findByLabelText('Remind me at (your time, Asia/Karachi)'))
    await user.click(screen.getByRole('button', { name: 'Save reminders' }))

    expect(await screen.findByText('Choose a time')).toBeInTheDocument()
    expect(fakeBackend.lastBody('PATCH /users/me')).toBeUndefined()
  })

  it('maps a server error on preferences.reminderTime onto the time field', async () => {
    server.use(
      http.patch(`${API}/users/me`, () =>
        HttpResponse.json(
          { error: 'Validation failed', details: [{ field: 'preferences.reminderTime', message: 'Must be HH:MM (24h)' }] },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderApp('/settings')
    const time = await screen.findByLabelText('Remind me at (your time, Asia/Karachi)')
    await user.clear(time)
    await user.type(time, '06:15')
    await user.click(screen.getByRole('button', { name: 'Save reminders' }))

    expect(await screen.findByText('Must be HH:MM (24h)')).toBeInTheDocument()
    expect(time).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('SettingsPage – export', () => {
  const clicks: { href: string; download: string }[] = []
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:lifeos-test')
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    clicks.length = 0
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push({ href: this.href, download: this.download })
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('downloads everything as JSON under the server filename', async () => {
    fakeBackend.seedHabit({ title: 'Read' })
    const { user } = renderApp('/settings')

    await user.click(await screen.findByRole('button', { name: 'Download everything (JSON)' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Downloaded lifeos-export-2026-10-20.json'))
    expect(fakeBackend.requests()).toContain('GET /export?format=json')
    expect(clicks).toEqual([{ href: 'blob:lifeos-test', download: 'lifeos-export-2026-10-20.json' }])
    const blob = createObjectURL.mock.calls[0][0]
    expect(JSON.parse(await blob.text())).toMatchObject({ formatVersion: 1, habits: [{ title: 'Read' }] })
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:lifeos-test'))
  })

  it('downloads one table as CSV, keeping formula-protection quotes', async () => {
    fakeBackend.seedHabit({ title: '=SUM(A1)' })
    const { user } = renderApp('/settings')

    await user.selectOptions(await screen.findByLabelText('Download a table as CSV'), 'Habits')
    await user.click(screen.getByRole('button', { name: 'Download CSV' }))

    await waitFor(() => expect(clicks).toHaveLength(1))
    expect(fakeBackend.requests()).toContain('GET /export?format=csv&dataset=habits')
    expect(clicks[0].download).toBe('lifeos-habits-2026-10-20.csv')
    expect(await createObjectURL.mock.calls[0][0].text()).toContain("'=SUM(A1)")
  })

  it('shows the rate-limit message from a Blob error body, once', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/export`, () => {
        calls += 1
        return HttpResponse.json({ error: 'Too many exports, slow down.' }, { status: 429, headers: { 'Retry-After': '1800' } })
      }),
    )
    const { user } = renderApp('/settings')

    await user.click(await screen.findByRole('button', { name: 'Download everything (JSON)' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Too many exports, slow down.', expect.objectContaining({ description: 'Try again in 30 minutes.' })),
    )
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(clicks).toEqual([])
    expect(calls).toBe(1) // never retried
  })

  it('shows a 400 message from a Blob error body', async () => {
    server.use(http.get(`${API}/export`, () => HttpResponse.json({ error: 'Unknown dataset' }, { status: 400 })))
    const { user } = renderApp('/settings')

    await user.click(await screen.findByRole('button', { name: 'Download CSV' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Unknown dataset'))
  })
})
