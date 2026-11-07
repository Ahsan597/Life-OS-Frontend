import { NAME_MAX } from '@/lib/validation'
import type { UserPreferences } from '@/types/auth'

/** Same rule as the backend: "07:30", never "7:30" */
export const REMINDER_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function validateReminderTime(value: string): string | undefined {
  if (!value) return 'Choose a time'
  if (!REMINDER_TIME_PATTERN.test(value)) return 'Use a 24-hour time like 07:30'
}

export function validateProfileName(value: string): string | undefined {
  if (value.trim().length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters`
}

/** Blank clears the name (null); returns undefined when nothing changed */
export function namePatch(current: string | null, input: string): string | null | undefined {
  const next = input.trim() || null
  return next === current ? undefined : next
}

/** Only the preference keys that changed; undefined when none did */
export function preferencesPatch(
  current: UserPreferences,
  next: UserPreferences,
): Partial<UserPreferences> | undefined {
  const changed = (Object.keys(next) as (keyof UserPreferences)[]).filter((key) => next[key] !== current[key])
  if (changed.length === 0) return undefined
  return Object.fromEntries(changed.map((key) => [key, next[key]])) as Partial<UserPreferences>
}

/** "14:05" in the given zone */
export function formatTimeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
}
