import { describe, expect, it } from 'vitest'
import {
  getPasswordChecks,
  validateDescription,
  validateEmail,
  validateHabitTitle,
  validateLogicalDate,
  validateName,
  validatePassword,
  validateSleepHours,
  validateTargetDays,
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

describe('validateHabitTitle', () => {
  it('requires 1–150 characters after trimming', () => {
    expect(validateHabitTitle('Read')).toBeUndefined()
    expect(validateHabitTitle('   ')).toBe('Title is required')
    expect(validateHabitTitle('a'.repeat(150))).toBeUndefined()
    expect(validateHabitTitle('a'.repeat(151))).toBe('Title must be at most 150 characters')
  })
})

describe('validateDescription', () => {
  it('allows blank and caps at 2000 characters', () => {
    expect(validateDescription('')).toBeUndefined()
    expect(validateDescription('a'.repeat(2000))).toBeUndefined()
    expect(validateDescription('a'.repeat(2001))).toBe('Must be at most 2000 characters')
  })
})

describe('validateTargetDays', () => {
  it('needs at least one day only for custom habits', () => {
    expect(validateTargetDays('custom', [])).toBe('Pick at least one day')
    expect(validateTargetDays('custom', [1])).toBeUndefined()
    expect(validateTargetDays('daily', [])).toBeUndefined()
  })
})

describe('validateSleepHours', () => {
  it.each(['', '  ', '0', '7', '7.5', '24'])('accepts %j', (value) => {
    expect(validateSleepHours(value)).toBeUndefined()
  })

  it.each([
    ['abc', 'Enter a number of hours'],
    ['-1', 'Sleep must be between 0 and 24 hours'],
    ['24.5', 'Sleep must be between 0 and 24 hours'],
    ['7.25', 'Use at most one decimal place, e.g. 7.5'],
  ])('rejects %j', (value, message) => {
    expect(validateSleepHours(value)).toBe(message)
  })
})

describe('validateLogicalDate', () => {
  it('accepts today and past days but not future ones', () => {
    expect(validateLogicalDate('2026-10-20', '2026-10-20')).toBeUndefined()
    expect(validateLogicalDate('2026-01-01', '2026-10-20')).toBeUndefined()
    expect(validateLogicalDate('2026-10-21', '2026-10-20')).toBe("You can't check in for a future date")
    expect(validateLogicalDate('', '2026-10-20')).toBe('Choose a date')
    expect(validateLogicalDate('20/10/2026', '2026-10-20')).toBe('Choose a valid date')
  })
})
