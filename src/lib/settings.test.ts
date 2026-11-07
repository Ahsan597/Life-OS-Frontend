import { describe, expect, it } from 'vitest'
import { formatTimeInZone, namePatch, preferencesPatch, validateProfileName, validateReminderTime } from '@/lib/settings'

describe('settings', () => {
  it('accepts only zero-padded 24-hour times', () => {
    expect(validateReminderTime('07:30')).toBeUndefined()
    expect(validateReminderTime('23:59')).toBeUndefined()
    expect(validateReminderTime('7:30')).toBe('Use a 24-hour time like 07:30')
    expect(validateReminderTime('24:00')).toBe('Use a 24-hour time like 07:30')
    expect(validateReminderTime('')).toBe('Choose a time')
  })

  it('caps the name at 100 characters', () => {
    expect(validateProfileName('a'.repeat(100))).toBeUndefined()
    expect(validateProfileName('a'.repeat(101))).toBe('Name must be at most 100 characters')
  })

  it('sends a name only when it changed, and blank as null', () => {
    expect(namePatch('Ahsan', ' Ahsan ')).toBeUndefined()
    expect(namePatch('Ahsan', 'Sana')).toBe('Sana')
    expect(namePatch('Ahsan', '  ')).toBeNull()
    expect(namePatch(null, '')).toBeUndefined()
  })

  it('sends only the preference keys that changed', () => {
    const current = { remindersEnabled: true, reminderTime: '20:00', emailReminders: false }
    expect(preferencesPatch(current, { ...current })).toBeUndefined()
    expect(preferencesPatch(current, { ...current, reminderTime: '07:30' })).toEqual({ reminderTime: '07:30' })
    expect(preferencesPatch(current, { ...current, remindersEnabled: false, emailReminders: true })).toEqual({
      remindersEnabled: false,
      emailReminders: true,
    })
  })

  it('shows the time in another zone', () => {
    expect(formatTimeInZone(new Date('2026-10-20T07:00:00Z'), 'Asia/Karachi')).toBe('12:00')
    expect(formatTimeInZone(new Date('2026-10-20T07:00:00Z'), 'Europe/London')).toBe('08:00')
  })
})
