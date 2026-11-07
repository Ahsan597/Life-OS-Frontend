/*
 * Error rules shared by the API client and React Query.
 * Rate limits (429) are handled once, globally: one toast, never an automatic retry.
 */

/** Retry-After is seconds ("120") or an HTTP date; returns whole seconds, or null if absent/garbled */
export function parseRetryAfter(header: unknown, now = Date.now()): number | null {
  if (typeof header !== 'string' || !header.trim()) return null
  const value = header.trim()
  if (/^\d+$/.test(value)) return Number(value)
  const date = Date.parse(value)
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - now) / 1000))
}

/** "Try again in 3 minutes" / "Try again in 40 seconds" */
export function formatRetryAfter(seconds: number | null): string | null {
  if (seconds === null) return null
  if (seconds < 60) return `Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`
  const minutes = Math.ceil(seconds / 60)
  return `Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
}

/** "1:05" for a countdown on a disabled button */
export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * React Query retry policy: a 4xx (bad request, not found, rate limited…) will fail the
 * same way again, so only network errors and 5xx get one more try.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number }; status?: number } | null)?.response?.status
    ?? (error as { status?: number } | null)?.status
  if (typeof status === 'number' && status >= 400 && status < 500) return false
  return failureCount < 1
}
