import { vi } from 'vitest'

/** Tuesday. The default test user is in Asia/Karachi (UTC+5), where it's midday. */
export const TODAY = '2026-10-20'

/**
 * Freezes the clock (Date only; timers stay real so userEvent and React Query work).
 * The fake backend derives "today" from it, like the real server does.
 * setup.ts restores the real clock after each test.
 */
export function freezeTime(instant = `${TODAY}T07:00:00.000Z`) {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(instant) })
}
