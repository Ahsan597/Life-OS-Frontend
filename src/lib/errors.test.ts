import { describe, expect, it } from 'vitest'
import { formatCountdown, formatRetryAfter, parseRetryAfter, shouldRetryQuery } from '@/lib/errors'

describe('errors', () => {
  it('parses Retry-After in seconds or as an HTTP date', () => {
    expect(parseRetryAfter('120')).toBe(120)
    expect(parseRetryAfter('Tue, 20 Oct 2026 07:05:00 GMT', Date.parse('2026-10-20T07:00:00Z'))).toBe(300)
    expect(parseRetryAfter(undefined)).toBeNull()
    expect(parseRetryAfter('soon')).toBeNull()
  })

  it('words the wait in minutes, or seconds when short', () => {
    expect(formatRetryAfter(900)).toBe('Try again in 15 minutes.')
    expect(formatRetryAfter(61)).toBe('Try again in 2 minutes.')
    expect(formatRetryAfter(60)).toBe('Try again in 1 minute.')
    expect(formatRetryAfter(40)).toBe('Try again in 40 seconds.')
    expect(formatRetryAfter(null)).toBeNull()
    expect(formatCountdown(65)).toBe('1:05')
  })

  it('never retries a 4xx (429 included), retries other failures once', () => {
    const httpError = (status: number) => ({ response: { status } })
    expect(shouldRetryQuery(0, httpError(429))).toBe(false)
    expect(shouldRetryQuery(0, httpError(404))).toBe(false)
    expect(shouldRetryQuery(0, { status: 400 })).toBe(false)
    expect(shouldRetryQuery(0, httpError(503))).toBe(true)
    expect(shouldRetryQuery(1, httpError(503))).toBe(false)
    expect(shouldRetryQuery(0, new Error('network'))).toBe(true)
  })
})
