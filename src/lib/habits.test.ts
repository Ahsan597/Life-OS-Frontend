import { describe, expect, it } from 'vitest'
import {
  buildHeatmap,
  formatRate,
  formatStreak,
  habitStartDate,
  isScheduledOn,
  scheduleLabel,
  type DayStatus,
  type HeatmapCell,
} from '@/lib/habits'
import type { Frequency, HabitLog, Weekday } from '@/types/habit'

const TODAY = '2026-10-20' // Tuesday

function logs(dates: string[], completed = true): HabitLog[] {
  return dates.map((date, i) => ({ id: String(i), habitId: '1', date, completed, note: null, createdAt: '' }))
}

/** { "2026-10-12": "missed", ... } for easy assertions */
function statuses(weeks: HeatmapCell[][]): Record<string, DayStatus> {
  return Object.fromEntries(weeks.flat().map((cell) => [cell.date, cell.status]))
}

function habit(frequency: Frequency, targetDays: Weekday[] | null = null) {
  return { frequency, targetDays }
}

describe('scheduleLabel', () => {
  it.each([
    [habit('daily'), 'Every day'],
    [habit('weekly'), 'Once a week'],
    [habit('custom', [1, 3, 5]), 'Mon, Wed, Fri'],
    [habit('custom', [0, 6]), 'Weekends'],
    [habit('custom', [1, 2, 3, 4, 5]), 'Weekdays'],
    [habit('custom', [0, 1, 2, 3, 4, 5, 6]), 'Every day'],
    // Sunday is listed last, because weeks run Mon–Sun
    [habit('custom', [0, 2]), 'Tue, Sun'],
  ])('%o -> %s', (input, expected) => {
    expect(scheduleLabel(input)).toBe(expected)
  })
})

describe('formatting', () => {
  it('counts weekly streaks in weeks and the others in days', () => {
    expect(formatStreak('daily', 1)).toBe('1 day')
    expect(formatStreak('custom', 4)).toBe('4 days')
    expect(formatStreak('weekly', 1)).toBe('1 week')
    expect(formatStreak('weekly', 0)).toBe('0 weeks')
  })

  it('shows rates as whole percentages, or a dash when there is no rate', () => {
    expect(formatRate(0.844)).toBe('84%')
    expect(formatRate(1)).toBe('100%')
    expect(formatRate(0)).toBe('0%')
    expect(formatRate(null)).toBe('—')
  })
})

describe('isScheduledOn', () => {
  it('schedules daily and weekly habits every day, custom ones only on target days', () => {
    expect(isScheduledOn(habit('daily'), TODAY)).toBe(true)
    expect(isScheduledOn(habit('weekly'), TODAY)).toBe(true)
    expect(isScheduledOn(habit('custom', [2]), TODAY)).toBe(true)
    expect(isScheduledOn(habit('custom', [1, 3]), TODAY)).toBe(false)
  })
})

describe('habitStartDate', () => {
  it('is the creation day in the user timezone', () => {
    // 21:00 UTC on the 9th is already the 10th in Karachi (UTC+5)
    expect(habitStartDate({ createdAt: '2026-10-09T21:00:00Z' }, [], 'Asia/Karachi')).toBe('2026-10-10')
  })

  it('moves earlier when a completed log was backfilled before creation', () => {
    const backfilled = [...logs(['2026-10-05']), ...logs(['2026-10-01'], false)]
    expect(habitStartDate({ createdAt: '2026-10-10T08:00:00Z' }, backfilled, 'UTC')).toBe('2026-10-05')
  })
})

describe('buildHeatmap', () => {
  it('builds Mon–Sun week columns ending with the current week', () => {
    const weeks = buildHeatmap(habit('daily'), [], { today: TODAY, start: '2026-01-01', weeks: 3 })

    expect(weeks).toHaveLength(3)
    expect(weeks.map((week) => week[0].date)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19'])
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    expect(weeks[2].find((cell) => cell.isToday)?.date).toBe(TODAY)
  })

  it('marks a daily habit done, missed, pending today, future, and blank before it started', () => {
    const weeks = buildHeatmap(habit('daily'), logs(['2026-10-15', '2026-10-19']), {
      today: TODAY,
      start: '2026-10-14',
      weeks: 2,
    })

    expect(statuses(weeks)).toEqual({
      '2026-10-12': 'unscheduled',
      '2026-10-13': 'unscheduled',
      '2026-10-14': 'missed',
      '2026-10-15': 'done',
      '2026-10-16': 'missed',
      '2026-10-17': 'missed',
      '2026-10-18': 'missed',
      '2026-10-19': 'done',
      '2026-10-20': 'pending',
      '2026-10-21': 'future',
      '2026-10-22': 'future',
      '2026-10-23': 'future',
      '2026-10-24': 'future',
      '2026-10-25': 'future',
    })
  })

  it('treats days without a log, or with completed: false, as not done', () => {
    const weeks = buildHeatmap(habit('daily'), logs(['2026-10-19'], false), { today: TODAY, start: '2026-10-01', weeks: 1 })

    expect(statuses(weeks)['2026-10-19']).toBe('missed')
  })

  it('shows today as done once completed', () => {
    const weeks = buildHeatmap(habit('daily'), logs([TODAY]), { today: TODAY, start: '2026-10-01', weeks: 1 })

    expect(weeks[0].find((cell) => cell.date === TODAY)).toEqual({ date: TODAY, status: 'done', isToday: true })
  })

  it('only expects custom habits on their target days, but still shows extra completions', () => {
    const monWedFri = habit('custom', [1, 3, 5])
    const weeks = buildHeatmap(monWedFri, logs(['2026-10-14', '2026-10-17']), { today: TODAY, start: '2026-10-01', weeks: 2 })
    const s = statuses(weeks)

    expect(s['2026-10-12']).toBe('missed') // Mon
    expect(s['2026-10-13']).toBe('unscheduled') // Tue
    expect(s['2026-10-14']).toBe('done') // Wed
    expect(s['2026-10-16']).toBe('missed') // Fri
    expect(s['2026-10-17']).toBe('done') // Sat: not a target day, but it was done
    expect(s['2026-10-20']).toBe('unscheduled') // today is Tue: nothing due
  })

  it('judges weekly habits per week: a past week with no completion is missed, the current one pending', () => {
    const weeks = buildHeatmap(habit('weekly'), logs(['2026-10-14']), { today: TODAY, start: '2026-09-01', weeks: 3 })
    const s = statuses(weeks)

    expect(['2026-10-05', '2026-10-08', '2026-10-11'].map((d) => s[d])).toEqual(['missed', 'missed', 'missed'])
    expect(s['2026-10-14']).toBe('done')
    expect(s['2026-10-13']).toBe('unscheduled') // the week is already done
    expect(s['2026-10-19']).toBe('pending')
    expect(s['2026-10-20']).toBe('pending')
    expect(s['2026-10-21']).toBe('future')
  })
})
