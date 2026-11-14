import type { MutationMeta } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toApiError, type ApiError } from '@/api/client'

/*
 * Feedback after a write. Errors are toasted here, once, for every mutation, so nothing
 * fails silently. Success toasts live in each hook's own onSuccess (not in per-call
 * `mutate(vars, { onSuccess })` callbacks): those run after the hook's refetches and are
 * skipped if the component unmounted meanwhile, which is how toasts used to go missing.
 */

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** The page shows this mutation's errors itself (login, register), so no toast */
      inlineErrors?: boolean
    }
  }
}

function isApiError(error: unknown): error is ApiError {
  return !!error && typeof error === 'object' && 'message' in error && 'details' in error
}

/** MutationCache onError: one toast per failed write */
export function toastMutationError(error: unknown, meta: MutationMeta | undefined) {
  if (meta?.inlineErrors) return
  const apiError = isApiError(error) ? error : toApiError(error)
  // 429s already got the API client's rate-limit toast.
  if (apiError.status === 429) return
  toast.error(apiError.message)
}
