/*
 * Helpers for "logical dates": plain YYYY-MM-DD calendar days, already resolved in the
 * user's timezone (the backend's convention). All math runs through UTC so it never
 * shifts with the browser's own timezone or DST — mirrors backend src/utils/dateUtils.js.
 */
import type { Weekday } from '@/types/habit'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** True only for real calendar days ("2026-02-30" is rejected) */
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const parsed = toUtc(value)
  return !Number.isNaN(parsed.getTime()) && fromUtc(parsed) === value
}

export function addDays(date: string, days: number): string {
  return fromUtc(new Date(toUtc(date).getTime() + days * MS_PER_DAY))
}

/** Whole days from `from` to `to` (negative if `to` is earlier) */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / MS_PER_DAY)
}

/** 0 = Sunday ... 6 = Saturday */
export function dayOfWeek(date: string): Weekday {
  return toUtc(date).getUTCDay() as Weekday
}

/** Monday of the week the date falls in (weeks run Mon–Sun) */
export function weekStart(date: string): string {
  return addDays(date, -((dayOfWeek(date) + 6) % 7))
}

/** Every day from `from` to `to`, inclusive */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}

/** The calendar day an instant falls on, as seen from `timeZone` */
export function toLogicalDate(instant: Date | string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(instant))
  } catch {
    return fromUtc(new Date(instant))
  }
}

export function todayInTimeZone(timeZone: string): string {
  return toLogicalDate(new Date(), timeZone)
}

function format(date: string, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).formatToParts(toUtc(date))
  return (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
}

/** "20 Oct" */
export function formatDayMonth(date: string): string {
  const part = format(date, { day: 'numeric', month: 'short' })
  return `${part('day')} ${part('month')}`
}

/** "Tue, 20 Oct" */
export function formatWeekdayDayMonth(date: string): string {
  const part = format(date, { weekday: 'short', day: 'numeric', month: 'short' })
  return `${part('weekday')}, ${part('day')} ${part('month')}`
}

/** "Tuesday, 20 October 2026" */
export function formatFullDate(date: string): string {
  const part = format(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `${part('weekday')}, ${part('day')} ${part('month')} ${part('year')}`
}

/** "Today", "Yesterday", or "Tue, 20 Oct" */
export function formatRelativeDay(date: string, today: string): string {
  const offset = diffDays(date, today)
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Yesterday'
  return formatWeekdayDayMonth(date)
}
