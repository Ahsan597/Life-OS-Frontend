import { addDays, dayOfWeek, eachDay, toLogicalDate, weekStart } from '@/lib/dates'
import type { Frequency, Habit, HabitBase, HabitLog, Weekday } from '@/types/habit'

/** Weeks run Mon–Sun, so pickers and calendars list Monday first */
export const WEEKDAYS: { value: Weekday; short: string; long: string }[] = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 0, short: 'Sun', long: 'Sunday' },
]

export const FREQUENCIES: { value: Frequency; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Once a week, any day' },
  { value: 'custom', label: 'Specific days', description: 'Pick the days of the week' },
]

/** "Every day", "Once a week", "Mon, Wed, Fri", "Weekdays" */
export function scheduleLabel(habit: Pick<HabitBase, 'frequency' | 'targetDays'>): string {
  if (habit.frequency === 'daily') return 'Every day'
  if (habit.frequency === 'weekly') return 'Once a week'

  const days = new Set(habit.targetDays ?? [])
  if (days.size === 7) return 'Every day'
  if (days.size === 5 && ![0, 6].some((d) => days.has(d as Weekday))) return 'Weekdays'
  if (days.size === 2 && days.has(0) && days.has(6)) return 'Weekends'
  return WEEKDAYS.filter((d) => days.has(d.value))
    .map((d) => d.short)
    .join(', ')
}

/** Streaks for weekly habits are counted in weeks */
export function streakUnit(frequency: Frequency, count: number): string {
  const unit = frequency === 'weekly' ? 'week' : 'day'
  return count === 1 ? unit : `${unit}s`
}

export function formatStreak(frequency: Frequency, count: number): string {
  return `${count} ${streakUnit(frequency, count)}`
}

/** 0.844 -> "84%", null -> "—" */
export function formatRate(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`
}

export function isScheduledOn(habit: Pick<HabitBase, 'frequency' | 'targetDays'>, date: string): boolean {
  return habit.frequency !== 'custom' || (habit.targetDays ?? []).includes(dayOfWeek(date))
}

// ---------------------------------------------------------------------------
// Calendar heatmap
// ---------------------------------------------------------------------------

export type DayStatus = 'done' | 'missed' | 'unscheduled' | 'pending' | 'future'

export interface HeatmapCell {
  date: string
  status: DayStatus
  isToday: boolean
}

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  done: 'Done',
  missed: 'Missed',
  unscheduled: 'Not scheduled',
  pending: 'Not done yet',
  future: 'Upcoming',
}

/**
 * The first day the habit's history counts from: the day it was created (in the user's
 * timezone), or earlier if logs were backfilled. Same rule as the backend's streaks.
 */
export function habitStartDate(habit: Pick<HabitBase, 'createdAt'>, logs: HabitLog[], timeZone: string): string {
  let start = toLogicalDate(habit.createdAt, timeZone)
  for (const log of logs) if (log.completed && log.date < start) start = log.date
  return start
}

/**
 * Weeks of day cells (Mon–Sun columns) ending with the week containing `today`.
 * Days without a log count as not done. Weekly habits are judged per week: a past
 * week with no completion shows all its days as missed.
 */
export function buildHeatmap(
  habit: Pick<Habit, 'frequency' | 'targetDays'>,
  logs: HabitLog[],
  { today, start, weeks }: { today: string; start: string; weeks: number },
): HeatmapCell[][] {
  const completed = new Set(logs.filter((log) => log.completed).map((log) => log.date))
  const firstMonday = addDays(weekStart(today), -7 * (weeks - 1))

  const columns: HeatmapCell[][] = []
  for (let monday = firstMonday; monday <= today; monday = addDays(monday, 7)) {
    const days = eachDay(monday, addDays(monday, 6))
    const weekDone = days.some((day) => completed.has(day) && day <= today)

    columns.push(
      days.map((date) => {
        const cell = (status: DayStatus) => ({ date, status, isToday: date === today })
        if (date > today) return cell('future')
        if (completed.has(date)) return cell('done')
        if (date < start) return cell('unscheduled')

        if (habit.frequency === 'weekly') {
          if (weekDone) return cell('unscheduled')
          // The current week is still open: not a miss until it's over.
          return cell(monday === weekStart(today) ? 'pending' : 'missed')
        }
        if (!isScheduledOn(habit, date)) return cell('unscheduled')
        return cell(date === today ? 'pending' : 'missed')
      }),
    )
  }
  return columns
}
