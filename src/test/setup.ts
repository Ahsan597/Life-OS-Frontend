import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { fakeBackend, handlers } from '@/test/fakeBackend'

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

beforeEach(() => {
  fakeBackend.reset()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.unstubAllGlobals()
})

// jsdom doesn't implement matchMedia (used by next-themes and the responsive sidebar).
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('min-width'), // pretend we're on desktop
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
