import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { tokenStorage } from '@/lib/tokenStorage'
import { fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedOut } from '@/test/renderApp'

beforeEach(() => {
  setLoggedOut()
  fakeBackend.seedUser({ email: 'ahsan@example.com', password: 'Passw0rd!', name: 'Ahsan' })
  fakeBackend.clearRequests()
})

describe('LoginPage', () => {
  it('renders the form with the email field focused', () => {
    renderApp('/login')

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument()
  })

  it('logs in and goes to the dashboard', async () => {
    const { user } = renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'ahsan@example.com')
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!{Enter}')

    expect(await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Ahsan/ })).toBeInTheDocument()
    expect(tokenStorage.getRefreshToken()).toBeTruthy()
  })

  it('shows an alert on wrong password, keeps the email and clears the password', async () => {
    const { user } = renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'ahsan@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
    expect(screen.getByLabelText('Email')).toHaveValue('ahsan@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(fakeBackend.count('POST /auth/refresh')).toBe(0)
  })

  it('validates in the browser before sending anything', async () => {
    const { user } = renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(fakeBackend.requests()).toEqual([])
  })

  it('toggles password visibility', async () => {
    const { user } = renderApp('/login')
    const password = screen.getByLabelText('Password')

    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('links to the register page', async () => {
    const { user } = renderApp('/login')

    await user.click(screen.getByRole('link', { name: 'Create an account' }))

    expect(screen.getByRole('heading', { name: 'Create your Life OS' })).toBeInTheDocument()
  })
})
