import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API, fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn } from '@/test/renderApp'
import { server } from '@/test/setup'
import { freezeTime } from '@/test/time'

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast }))

beforeEach(() => {
  freezeTime()
  setLoggedIn()
})

describe('Notification bell', () => {
  it('shows the unread count in the badge and the accessible name, capped at 9+', async () => {
    for (let i = 0; i < 12; i++) fakeBackend.seedNotification()
    fakeBackend.seedNotification({ isRead: true })
    renderApp('/dashboard')

    const bell = await screen.findByRole('button', { name: 'Notifications, 12 unread' })
    expect(within(bell).getByTestId('unread-badge')).toHaveTextContent('9+')
    expect(fakeBackend.requests()).toContain('GET /notifications?limit=1')
  })

  it('has no badge when everything is read', async () => {
    fakeBackend.seedNotification({ isRead: true })
    renderApp('/dashboard')

    const bell = await screen.findByRole('button', { name: 'Notifications' })
    await waitFor(() => expect(fakeBackend.count('GET /notifications?limit=1')).toBe(1))
    expect(within(bell).queryByTestId('unread-badge')).not.toBeInTheDocument()
  })

  it('opens the latest five, with mark-all and see-all', async () => {
    for (let i = 1; i <= 7; i++) fakeBackend.seedNotification({ title: `Reminder ${i}` })
    const { user } = renderApp('/dashboard')

    await user.click(await screen.findByRole('button', { name: 'Notifications, 7 unread' }))

    const menu = await screen.findByRole('menu')
    await within(menu).findByText('Reminder 7')
    expect(fakeBackend.requests()).toContain('GET /notifications?limit=5')
    // Unread titles carry a screen-reader prefix.
    expect(within(menu).getAllByText(/Reminder \d$/).map((el) => el.textContent)).toEqual([
      'Unread: Reminder 7',
      'Unread: Reminder 6',
      'Unread: Reminder 5',
      'Unread: Reminder 4',
      'Unread: Reminder 3',
    ])

    await user.click(within(menu).getByRole('menuitem', { name: 'Mark all as read' }))
    await waitFor(() => expect(fakeBackend.requests()).toContain('POST /notifications/read-all'))
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    fakeBackend.seedNotification()
    const { user } = renderApp('/dashboard')

    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))
    await screen.findByRole('menu')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('marks an item read and deep-links to the at-risk habit', async () => {
    const habit = fakeBackend.seedHabit({ title: 'Gym' })
    const note = fakeBackend.seedNotification({
      title: 'A streak is at risk today',
      data: { date: '2026-10-20', habitIds: [habit.id], atRiskHabitIds: [habit.id], checkInMissing: true },
    })
    const { user } = renderApp('/dashboard')

    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))
    await user.click(await screen.findByRole('menuitem', { name: /A streak is at risk today/ }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Gym' })).toBeInTheDocument()
    expect(fakeBackend.lastBody(`PATCH /notifications/${note.id}`)).toEqual({ isRead: true })
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('links "See all" to the notifications page', async () => {
    fakeBackend.seedNotification()
    const { user } = renderApp('/dashboard')

    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))
    await user.click(await screen.findByRole('menuitem', { name: 'See all' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument()
  })
})

describe('NotificationsPage', () => {
  it('shows the empty state with the reminder time', async () => {
    renderApp('/notifications')

    expect(
      await screen.findByText('No notifications yet. Your daily reminder shows up here at 20:00.'),
    ).toBeInTheDocument()
  })

  it('pages through older notifications with the cursor', async () => {
    for (let i = 1; i <= 25; i++) fakeBackend.seedNotification({ title: `Reminder ${i}`, isRead: true })
    const { user } = renderApp('/notifications')

    const list = await screen.findByRole('list', { name: 'Notifications' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(20)

    await user.click(screen.getByRole('button', { name: 'Load older' }))

    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(25))
    const cursor = fakeBackend.requests().find((r) => r.includes('before='))
    expect(cursor).toMatch(/^GET \/notifications\?unreadOnly=false&limit=20&before=\d+$/)
    expect(screen.getByText("You've reached the end.")).toBeInTheDocument()
  })

  it('filters to unread, and toggles read / unread per item', async () => {
    fakeBackend.seedNotification({ title: 'Old one', isRead: true })
    const fresh = fakeBackend.seedNotification({ title: 'New one' })
    const { user } = renderApp('/notifications')

    await user.click(await screen.findByRole('button', { name: 'Unread (1)' }))
    await waitFor(() => expect(fakeBackend.requests()).toContain('GET /notifications?unreadOnly=true&limit=20'))
    const list = await screen.findByRole('list', { name: 'Notifications' })
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1))

    await user.click(within(list).getByRole('button', { name: 'Mark as read' }))
    await waitFor(() => expect(fakeBackend.notification(fresh.id)?.isRead).toBe(true))
    // Read now, so the unread list refetches without it.
    expect(await screen.findByText('All caught up')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'All' }))
    const all = await screen.findByRole('list', { name: 'Notifications' })
    await waitFor(() => expect(within(all).getAllByRole('listitem')).toHaveLength(2))
    await user.click(within(all).getAllByRole('button', { name: 'Mark as unread' })[0])
    await waitFor(() => expect(fakeBackend.notification(fresh.id)?.isRead).toBe(false))
  })

  it('marks everything read', async () => {
    fakeBackend.seedNotification()
    fakeBackend.seedNotification()
    const { user } = renderApp('/notifications')

    await user.click(await screen.findByRole('button', { name: 'Mark all as read' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Marked 2 notifications as read'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled())
  })

  it('rolls back an optimistic toggle when the server refuses', async () => {
    fakeBackend.seedNotification({ title: 'Stays unread' })
    server.use(http.patch(`${API}/notifications/:id`, () => HttpResponse.json({ error: 'Nope' }, { status: 500 })))
    const { user } = renderApp('/notifications')

    await user.click(await screen.findByRole('button', { name: 'Mark as read' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nope'))
    expect(await screen.findByRole('button', { name: 'Mark as read' })).toBeInTheDocument()
  })
})
