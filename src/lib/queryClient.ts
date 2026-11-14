import { MutationCache, QueryClient, type DefaultOptions } from '@tanstack/react-query'
import { shouldRetryQuery } from '@/lib/errors'
import { toastMutationError } from '@/lib/mutationFeedback'

/** Tests build their own client with this too, so they get the same error toasts */
export function createQueryClient(defaultOptions?: DefaultOptions) {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => toastMutationError(error, mutation.meta),
    }),
    defaultOptions: {
      ...defaultOptions,
      queries: {
        staleTime: 60 * 1000,
        // Never retry a 4xx (a 429 especially): it would fail the same way again.
        retry: shouldRetryQuery,
        ...defaultOptions?.queries,
      },
    },
  })
}

export const queryClient = createQueryClient()
