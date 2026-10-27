import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayOfWeek,
  diffDays,
  eachDay,
  formatDayMonth,
  formatFullDate,
  formatRelativeDay,
  formatWeekdayDayMonth,
  isValidDateString,
  toLogicalDate,
  weekStart,
} from '@/lib/dates'

describe('isValidDateString', () => {
  it.each(['2026-10-20', '2024-02-29'])('accepts %s', (value) => {
    expect(isValidDateString(value)).toBe(true)
  })

  it.each(['2026-02-30', '2025-02-29', '2026-13-01', '20-10-2026', '2026-10-20T00:00', ''])('rejects %s', (value) => {
    expect(isValidDateString(value)).toBe(false)
  })
})

describe('day math', () => {
  it('adds and subtracts days across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('is not affected by DST changes', () => {
    // Europe and the US change clocks around these dates; logical days must not.
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })

  it('counts whole days between dates', () => {
    expect(diffDays('2026-10-01', '2026-10-20')).toBe(19)
    expect(diffDays('2026-10-20', '2026-10-01')).toBe(-19)
  })

  it('uses 0 = Sunday ... 6 = Saturday', () => {
    expect(dayOfWeek('2026-10-18')).toBe(0)
    expect(dayOfWeek('2026-10-20')).toBe(2)
    expect(dayOfWeek('2026-10-24')).toBe(6)
  })

  it('starts weeks on Monday', () => {
    expect(weekStart('2026-10-19')).toBe('2026-10-19')
    expect(weekStart('2026-10-20')).toBe('2026-10-19')
    expect(weekStart('2026-10-25')).toBe('2026-10-19') // Sunday belongs to the week before
  })

  it('lists every day in a range, inclusive', () => {
    expect(eachDay('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
    expect(eachDay('2026-10-20', '2026-10-19')).toEqual([])
  })
})

describe('toLogicalDate', () => {
  it('resolves the day in the given timezone, not the browser one', () => {
    const instant = '2026-10-20T21:30:00.000Z'
    expect(toLogicalDate(instant, 'UTC')).toBe('2026-10-20')
    expect(toLogicalDate(instant, 'Asia/Karachi')).toBe('2026-10-21')
    expect(toLogicalDate(instant, 'America/New_York')).toBe('2026-10-20')
  })

  it('falls back to UTC for an unknown timezone', () => {
    expect(toLogicalDate('2026-10-20T21:30:00.000Z', 'Not/AZone')).toBe('2026-10-20')
  })
})

describe('formatting', () => {
  it('formats logical dates without shifting them', () => {
    expect(formatDayMonth('2026-10-20')).toBe('20 Oct')
    expect(formatWeekdayDayMonth('2026-10-20')).toBe('Tue, 20 Oct')
    expect(formatFullDate('2026-10-20')).toBe('Tuesday, 20 October 2026')
  })

  it('says Today and Yesterday relative to the given today', () => {
    expect(formatRelativeDay('2026-10-20', '2026-10-20')).toBe('Today')
    expect(formatRelativeDay('2026-10-19', '2026-10-20')).toBe('Yesterday')
    expect(formatRelativeDay('2026-10-15', '2026-10-20')).toBe('Thu, 15 Oct')
  })
})
