import { QueryClient } from '@tanstack/react-query'
import { shouldRetryQuery } from '@/lib/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      // Never retry a 4xx (a 429 especially): it would fail the same way again.
      retry: shouldRetryQuery,
    },
  },
})
