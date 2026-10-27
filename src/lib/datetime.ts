/** Date helpers that always work in the *user's* timezone, not the browser's */

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

function safeZone(timeZone: string | undefined): string {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : 'UTC'
}

export function getBrowserTimeZone(): string {
  return safeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
}

export function getAllTimeZones(): string[] {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  // Some engines omit "UTC" from the list even though it's valid (and the backend default).
  return zones.includes('UTC') ? zones : ['UTC', ...zones]
}

/** "GMT+5", "GMT-3:30", "GMT" */
export function getTimeZoneOffsetLabel(timeZone: string, date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(date)
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  } catch {
    return 'GMT'
  }
}

/** "Asia/Karachi (GMT+5)" */
export function formatTimeZoneLabel(timeZone: string): string {
  return `${timeZone.replaceAll('_', ' ')} (${getTimeZoneOffsetLabel(timeZone)})`
}

function getParts(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat('en-GB', { ...options, timeZone: safeZone(timeZone) }).formatToParts(date)
  return (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
}

/** "Saturday, 17 Oct" */
export function formatShortDate(date: Date, timeZone: string): string {
  const part = getParts(date, timeZone, { weekday: 'long', day: 'numeric', month: 'short' })
  return `${part('weekday')}, ${part('day')} ${part('month')}`
}

/** "Saturday, 17 October 2026" */
export function formatLongDate(date: Date, timeZone: string): string {
  const part = getParts(date, timeZone, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `${part('weekday')}, ${part('day')} ${part('month')} ${part('year')}`
}

/** "17 October 2026" */
export function formatMonthDayYear(date: Date, timeZone: string): string {
  const part = getParts(date, timeZone, { day: 'numeric', month: 'long', year: 'numeric' })
  return `${part('day')} ${part('month')} ${part('year')}`
}

export function getHourInTimeZone(date: Date, timeZone: string): number {
  const hour = getParts(date, timeZone, { hour: 'numeric', hourCycle: 'h23' })('hour')
  return Number.parseInt(hour, 10) || 0
}

export function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}
