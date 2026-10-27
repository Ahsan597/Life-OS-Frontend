import { describe, expect, it } from 'vitest'
import {
  formatLongDate,
  formatMonthDayYear,
  formatShortDate,
  formatTimeZoneLabel,
  getGreeting,
  getHourInTimeZone,
  isValidTimeZone,
} from '@/lib/datetime'

// 21:30 UTC on Fri 16 Oct = 02:30 on Sat 17 Oct in Karachi (UTC+5)
const lateFridayUtc = new Date('2026-10-16T21:30:00.000Z')

describe('dates in the user timezone', () => {
  it('formats the short top-bar date', () => {
    expect(formatShortDate(lateFridayUtc, 'Asia/Karachi')).toBe('Saturday, 17 Oct')
    expect(formatShortDate(lateFridayUtc, 'UTC')).toBe('Friday, 16 Oct')
  })

  it('formats the long dashboard date', () => {
    expect(formatLongDate(lateFridayUtc, 'Asia/Karachi')).toBe('Saturday, 17 October 2026')
  })

  it('formats "member since" dates', () => {
    expect(formatMonthDayYear(new Date('2026-10-17T13:03:30.000Z'), 'Asia/Karachi')).toBe('17 October 2026')
  })

  it('reads the hour in the given timezone', () => {
    expect(getHourInTimeZone(lateFridayUtc, 'Asia/Karachi')).toBe(2)
    expect(getHourInTimeZone(lateFridayUtc, 'UTC')).toBe(21)
  })

  it('falls back to UTC for an invalid timezone instead of throwing', () => {
    expect(formatShortDate(lateFridayUtc, 'Not/AZone')).toBe('Friday, 16 Oct')
  })
})

describe('getGreeting', () => {
  it.each([
    [5, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [23, 'Good evening'],
    [2, 'Good evening'],
  ])('hour %i -> %s', (hour, greeting) => {
    expect(getGreeting(hour)).toBe(greeting)
  })
})

describe('timezones', () => {
  it('labels a timezone with its GMT offset', () => {
    expect(formatTimeZoneLabel('Asia/Karachi')).toBe('Asia/Karachi (GMT+5)')
    expect(formatTimeZoneLabel('America/New_York')).toMatch(/^America\/New York \(GMT-[45]\)$/)
  })

  it('validates IANA names', () => {
    expect(isValidTimeZone('Europe/London')).toBe(true)
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone('Mars/Base')).toBe(false)
  })
})
