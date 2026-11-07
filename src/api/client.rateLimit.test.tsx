import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, toApiError } from '@/api/client'
import { API, fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn, setLoggedOut } from '@/test/renderApp'
import { server } from '@/test/setup'

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast }))

function tooMany(retryAfter?: string) {
  return HttpResponse.json(
    { error: 'Too many requests, please slow down.' },
    { status: 429, headers: retryAfter ? { 'Retry-After': retryAfter } : {} },
  )
}

beforeEach(() => {
  toast.error.mockClear()
})

describe('429 handling in the API client', () => {
  it('shows one toast with the server message and the wait, and exposes retryAfter', async () => {
    setLoggedIn()
    server.use(http.get(`${API}/habits`, () => tooMany('600')))

    const error = await apiClient.get('/habits').catch((e) => e)

    expect(toApiError(error)).toMatchObject({ status: 429, message: 'Too many requests, please slow down.', retryAfter: 600 })
    expect(toast.error).toHaveBeenCalledWith(
      'Too many requests, please slow down.',
      expect.objectContaining({ id: 'rate-limited', description: 'Try again in 10 minutes.' }),
    )
  })

  it('does not retry a rate-limited query', async () => {
    setLoggedIn()
    let calls = 0
    server.use(
      http.get(`${API}/habits`, () => {
        calls += 1
        return tooMany('60')
      }),
    )
    renderApp('/habits')

    expect(await screen.findByText('Too many requests, please slow down.')).toBeInTheDocument()
    expect(calls).toBe(1)
  })
})

describe('429 on the login and register forms', () => {
  beforeEach(() => {
    setLoggedOut()
    fakeBackend.seedUser({ email: 'ahsan@example.com', password: 'Passw0rd!' })
  })

  it('shows the message inline and disables Log in until Retry-After passes', async () => {
    server.use(http.post(`${API}/auth/login`, () => tooMany('2')))
    const { user } = renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'ahsan@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong{Enter}')

    const notice = await screen.findByTestId('rate-limit')
    expect(notice).toHaveTextContent('Too many requests, please slow down. You can try again in 0:02.')
    expect(screen.getByRole('button', { name: 'Log in' })).toBeDisabled()
    expect(toast.error).not.toHaveBeenCalled() // inline instead of a toast

    await waitFor(() => expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled(), { timeout: 4000 })
    expect(notice).toHaveTextContent('You can try again now.')
  })

  it('keeps the button enabled when the server gives no Retry-After', async () => {
    server.use(http.post(`${API}/auth/register`, () => tooMany()))
    const { user } = renderApp('/register')

    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByTestId('rate-limit')).toHaveTextContent('Too many requests, please slow down.')
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled()
  })
})
