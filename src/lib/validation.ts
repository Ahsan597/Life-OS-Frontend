import { isValidTimeZone } from '@/lib/datetime'

/*
 * Client-side copies of the backend's validation rules (POST /auth/register, /auth/login).
 * Each validator returns an error message, or undefined when the value is valid.
 */

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72
export const EMAIL_MAX = 255
export const NAME_MAX = 100

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): string | undefined {
  const email = value.trim()
  if (!email) return 'Email is required'
  if (email.length > EMAIL_MAX) return `Email must be at most ${EMAIL_MAX} characters`
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address'
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Password is required'
  if (value.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`
  if (value.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters`
}

/** Name is optional; blank means "not provided" */
export function validateName(value: string): string | undefined {
  if (value.trim().length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters`
}

export function validateTimeZone(value: string | null): string | undefined {
  if (!value) return 'Choose your timezone'
  if (!isValidTimeZone(value)) return 'Choose a valid timezone'
}

export interface PasswordCheck {
  label: string
  passed: boolean
}

/** The four checks behind the strength meter, one per segment */
export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: `At least ${PASSWORD_MIN} characters`, passed: password.length >= PASSWORD_MIN },
    { label: 'Upper and lower case letters', passed: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'A number', passed: /\d/.test(password) },
    { label: 'A symbol', passed: /[^A-Za-z0-9]/.test(password) },
  ]
}

// ---------------------------------------------------------------------------
// Habits (POST /habits, PUT /habits/:id)
// ---------------------------------------------------------------------------

export const HABIT_TITLE_MAX = 150
export const DESCRIPTION_MAX = 2000

export function validateHabitTitle(value: string): string | undefined {
  const title = value.trim()
  if (!title) return 'Title is required'
  if (title.length > HABIT_TITLE_MAX) return `Title must be at most ${HABIT_TITLE_MAX} characters`
}

export function validateDescription(value: string): string | undefined {
  if (value.trim().length > DESCRIPTION_MAX) return `Must be at most ${DESCRIPTION_MAX} characters`
}

/** Only "custom" habits have target days, and they need at least one */
export function validateTargetDays(frequency: string, days: number[]): string | undefined {
  if (frequency === 'custom' && days.length === 0) return 'Pick at least one day'
}

// ---------------------------------------------------------------------------
// Check-ins (POST /checkins)
// ---------------------------------------------------------------------------

export const NOTE_MAX = 2000

/** Blank is allowed (the field is optional); otherwise 0–24 with one decimal place */
export function validateSleepHours(value: string): string | undefined {
  const text = value.trim()
  if (!text) return
  const hours = Number(text)
  if (!Number.isFinite(hours)) return 'Enter a number of hours'
  if (hours < 0 || hours > 24) return 'Sleep must be between 0 and 24 hours'
  if (!/^\d+(\.\d)?$/.test(text)) return 'Use at most one decimal place, e.g. 7.5'
}

/** Future dates are rejected by the backend */
export function validateLogicalDate(value: string, today: string): string | undefined {
  if (!value) return 'Choose a date'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Choose a valid date'
  if (value > today) return "You can't check in for a future date"
}
