import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { tokenStorage } from '@/lib/tokenStorage'
import { useAuthStore } from '@/store/authStore'
import { fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn, setLoggedOut } from '@/test/renderApp'

describe('routing', () => {
  it('shows the splash screen while the session is being checked', () => {
    useAuthStore.setState({ user: null, status: 'loading' })
    renderApp('/dashboard')

    expect(screen.getByRole('status')).toHaveTextContent('Loading your session')
  })

  it('sends a logged-out user to /login, then back to where they were going', async () => {
    setLoggedOut()
    fakeBackend.seedUser({ email: 'ahsan@example.com', password: 'Passw0rd!' })
    const { user } = renderApp('/insights')

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), 'ahsan@example.com')
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!{Enter}')

    expect(await screen.findByRole('heading', { name: 'Insights is on its way' })).toBeInTheDocument()
  })

  it.each(['/login', '/register'])('sends a logged-in user from %s to the dashboard', (path) => {
    setLoggedIn()
    renderApp(path)

    expect(screen.getByRole('heading', { name: /Good (morning|afternoon|evening), Ahsan/ })).toBeInTheDocument()
  })

  it('redirects / to the dashboard', () => {
    setLoggedIn()
    renderApp('/')

    expect(screen.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeInTheDocument()
  })

  it('shows Coming Soon on /insights (a later phase)', () => {
    setLoggedIn()
    renderApp('/insights')

    expect(screen.getByRole('heading', { name: 'Insights is on its way' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toBeInTheDocument()
  })

  it.each([
    ['/habits', 'Habits'],
    ['/habits/new', 'New habit'],
    ['/check-ins', 'Daily check-in'],
    ['/history', 'Check-in history'],
  ])('renders the Phase 1 page at %s', async (path, heading) => {
    setLoggedIn()
    renderApp(path)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('shows the 404 page for unknown routes', () => {
    setLoggedOut()
    renderApp('/does-not-exist')

    expect(screen.getByRole('heading', { name: '404 — This page wandered off.' })).toBeInTheDocument()
  })
})

describe('app shell', () => {
  it('marks Dashboard active, enables the Phase 1 items and keeps Insights as "Soon"', () => {
    setLoggedIn()
    renderApp('/dashboard')
    const nav = screen.getByRole('navigation', { name: 'Main' })

    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    for (const name of ['Habits', 'Check-in', 'History']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(within(nav).getByRole('link', { name: /^Insights\s*Soon$/ })).toBeInTheDocument()
  })

  it('marks Habits active on nested habit pages', () => {
    setLoggedIn()
    renderApp('/habits/new')
    const nav = screen.getByRole('navigation', { name: 'Main' })

    expect(within(nav).getByRole('link', { name: 'Habits' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the profile from the logged-in user', async () => {
    setLoggedIn({ name: null, email: 'zara@example.com', timezone: 'Europe/London' })
    renderApp('/dashboard')

    expect(screen.getByRole('heading', { name: /, there/ })).toBeInTheDocument()
    expect(screen.getByText('zara@example.com')).toBeInTheDocument()
    expect(screen.getByText('Europe/London')).toBeInTheDocument()
    expect(screen.getByText('17 October 2026')).toBeInTheDocument()
    // With no habits yet, the habits card invites the first one.
    expect(await screen.findByRole('link', { name: 'Add habit' })).toHaveAttribute('href', '/habits/new')
  })

  it('logs out from the user menu', async () => {
    setLoggedIn()
    const { user } = renderApp('/dashboard')

    await user.click(screen.getByRole('button', { name: 'Open user menu' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(fakeBackend.count('POST /auth/logout')).toBe(1)
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })
})
