import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { getBrowserTimeZone } from '@/lib/datetime'
import { API, fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedOut } from '@/test/renderApp'
import { server } from '@/test/setup'

beforeEach(() => {
  setLoggedOut()
})

describe('RegisterPage', () => {
  it('pre-fills the timezone from the browser', () => {
    renderApp('/register')

    expect((screen.getByLabelText('Timezone') as HTMLInputElement).value).toContain(getBrowserTimeZone().replaceAll('_', ' '))
    expect(screen.getByText('Used to decide which day your habits count for.')).toBeInTheDocument()
  })

  it('creates the account and lands on the dashboard with the name', async () => {
    let body: Record<string, unknown> = {}
    server.events.on('request:start', async ({ request }) => {
      if (request.url.endsWith('/auth/register')) body = await request.clone().json()
    })
    const { user } = renderApp('/register')

    await user.type(screen.getByLabelText('Name (optional)'), 'Ahsan')
    await user.type(screen.getByLabelText('Email'), 'New@Example.com ')
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Ahsan/ })).toBeInTheDocument()
    expect(body).toEqual({
      name: 'Ahsan',
      email: 'New@Example.com',
      password: 'Passw0rd!',
      timezone: getBrowserTimeZone(),
    })
    server.events.removeAllListeners()
  })

  it('leaves out a blank name, and the dashboard greets "there"', async () => {
    const { user } = renderApp('/register')

    await user.type(screen.getByLabelText('Email'), 'noname@example.com')
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: /, there/ })).toBeInTheDocument()
  })

  it('shows field errors and sends no request for a bad email and a 5-character password', async () => {
    const { user } = renderApp('/register')

    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.type(screen.getByLabelText('Password'), '12345')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    expect(fakeBackend.requests()).toEqual([])
  })

  it('validates a field when the user leaves it', async () => {
    const { user } = renderApp('/register')

    await user.type(screen.getByLabelText('Email'), 'nope')
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument()

    await user.tab()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
  })

  it('offers "Log in instead?" when the email is already registered (409)', async () => {
    fakeBackend.seedUser({ email: 'taken@example.com' })
    const { user } = renderApp('/register')

    await user.type(screen.getByLabelText('Email'), 'taken@example.com')
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText(/This email is already registered/)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Log in instead?' }))
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('shows server validation details under the matching fields', async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json(
          { error: 'Validation failed', details: [{ field: 'timezone', message: "Invalid IANA timezone (e.g. 'Asia/Karachi')" }] },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderApp('/register')

    await user.type(screen.getByLabelText('Email'), 'ok@example.com')
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText("Invalid IANA timezone (e.g. 'Asia/Karachi')")).toBeInTheDocument()
  })

  it('rates password strength as the user types', async () => {
    const { user } = renderApp('/register')

    await user.type(screen.getByLabelText('Password'), 'abcdefgh')
    expect(screen.getByText('Weak')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Password'), 'A1!')
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })
})
