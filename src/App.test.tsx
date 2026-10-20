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

  it.each([
    ['/habits', 'Habits'],
    ['/check-ins', 'Check-ins'],
    ['/history', 'History'],
    ['/insights', 'Insights'],
  ])('shows Coming Soon on %s', (path, name) => {
    setLoggedIn()
    renderApp(path)

    expect(screen.getByRole('heading', { name: `${name} is on its way` })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toBeInTheDocument()
  })

  it('shows the 404 page for unknown routes', () => {
    setLoggedOut()
    renderApp('/does-not-exist')

    expect(screen.getByRole('heading', { name: '404 — This page wandered off.' })).toBeInTheDocument()
  })
})

describe('app shell', () => {
  it('marks Dashboard active and the Phase 1 items as "Soon"', () => {
    setLoggedIn()
    renderApp('/dashboard')
    const nav = screen.getByRole('navigation', { name: 'Main' })

    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    for (const name of ['Habits', 'Check-ins', 'History', 'Insights']) {
      expect(within(nav).getByRole('link', { name: new RegExp(`^${name}\\s*Soon$`) })).toBeInTheDocument()
    }
  })

  it('shows the profile from the logged-in user', () => {
    setLoggedIn({ name: null, email: 'zara@example.com', timezone: 'Europe/London' })
    renderApp('/dashboard')

    expect(screen.getByRole('heading', { name: /, there/ })).toBeInTheDocument()
    expect(screen.getByText('zara@example.com')).toBeInTheDocument()
    expect(screen.getByText('Europe/London')).toBeInTheDocument()
    expect(screen.getByText('17 October 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add habit' })).toBeDisabled()
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
