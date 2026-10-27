import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { TooltipProvider } from '@/components/ui/tooltip'
import { tokenStorage } from '@/lib/tokenStorage'
import { useAuthStore } from '@/store/authStore'
import { fakeBackend } from '@/test/fakeBackend'

/** Renders the whole app at `path`, as a logged-out visitor */
export function renderApp(path = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const user = userEvent.setup()
  const result = render(
    <ThemeProvider attribute="data-theme" storageKey="lifeos-theme" scriptProps={{ type: 'application/json' }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  )
  return { user, ...result }
}

export function setLoggedOut() {
  useAuthStore.setState({ user: null, status: 'unauthenticated' })
}

/** Seeds a user in the fake backend and starts the app logged in as them */
export function setLoggedIn(overrides?: Parameters<typeof fakeBackend.seedUser>[0]) {
  const { user, accessToken, refreshToken } = fakeBackend.seedUser(overrides)
  tokenStorage.setTokens({ accessToken, refreshToken })
  useAuthStore.setState({ user, status: 'authenticated' })
  return user
}
