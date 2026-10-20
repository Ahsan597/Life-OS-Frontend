import { describe, expect, it } from 'vitest'
import {
  getPasswordChecks,
  validateEmail,
  validateName,
  validatePassword,
  validateTimeZone,
} from '@/lib/validation'

describe('validateEmail', () => {
  it('accepts a valid email, ignoring surrounding spaces', () => {
    expect(validateEmail('  ahsan@example.com ')).toBeUndefined()
  })

  it.each([
    ['', 'Email is required'],
    ['   ', 'Email is required'],
    ['ahsan', 'Enter a valid email address'],
    ['ahsan@example', 'Enter a valid email address'],
    ['ah san@example.com', 'Enter a valid email address'],
  ])('rejects %j', (input, message) => {
    expect(validateEmail(input)).toBe(message)
  })

  it('rejects emails longer than 255 characters', () => {
    expect(validateEmail(`${'a'.repeat(250)}@example.com`)).toMatch(/at most 255/)
  })
})

describe('validatePassword', () => {
  it('requires a password', () => {
    expect(validatePassword('')).toBe('Password is required')
  })

  it('enforces 8–72 characters (same as the backend)', () => {
    expect(validatePassword('12345')).toBe('Password must be at least 8 characters')
    expect(validatePassword('a'.repeat(8))).toBeUndefined()
    expect(validatePassword('a'.repeat(72))).toBeUndefined()
    expect(validatePassword('a'.repeat(73))).toBe('Password must be at most 72 characters')
  })
})

describe('validateName', () => {
  it('is optional', () => {
    expect(validateName('')).toBeUndefined()
    expect(validateName('   ')).toBeUndefined()
  })

  it('allows at most 100 characters after trimming', () => {
    expect(validateName(`  ${'a'.repeat(100)}  `)).toBeUndefined()
    expect(validateName('a'.repeat(101))).toMatch(/at most 100/)
  })
})

describe('validateTimeZone', () => {
  it('accepts IANA timezones', () => {
    expect(validateTimeZone('Asia/Karachi')).toBeUndefined()
    expect(validateTimeZone('UTC')).toBeUndefined()
  })

  it('rejects empty and unknown timezones', () => {
    expect(validateTimeZone(null)).toBe('Choose your timezone')
    expect(validateTimeZone('Mars/Base')).toBe('Choose a valid timezone')
  })
})

describe('getPasswordChecks', () => {
  const passed = (password: string) => getPasswordChecks(password).filter((c) => c.passed).length

  it('scores one point per check: length, mixed case, number, symbol', () => {
    expect(passed('')).toBe(0)
    expect(passed('abcdefgh')).toBe(1)
    expect(passed('Abcdefgh')).toBe(2)
    expect(passed('Abcdefg1')).toBe(3)
    expect(passed('Abcdef1!')).toBe(4)
  })
})
