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
