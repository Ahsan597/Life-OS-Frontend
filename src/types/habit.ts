export type Frequency = 'daily' | 'weekly' | 'custom'

/** 0 = Sunday ... 6 = Saturday (same as the backend) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** What POST/PUT /habits return: the stored habit, without progress */
export interface HabitBase {
  /** BigInt on the server, always a string here */
  id: string
  title: string
  description: string | null
  frequency: Frequency
  /** Only set for "custom" habits */
  targetDays: Weekday[] | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** What GET /habits and GET /habits/:id return */
export interface Habit extends HabitBase {
  today: {
    /** "Today" in the user's timezone, YYYY-MM-DD — use this instead of the browser clock */
    date: string
    scheduled: boolean
    completed: boolean
  }
  /** Counted in weeks for weekly habits, days otherwise */
  currentStreak: number
  longestStreak: number
}

export interface HabitPayload {
  title: string
  description: string | null
  frequency: Frequency
  targetDays?: Weekday[] | null
}

export type HabitUpdate = Partial<HabitPayload> & { isActive?: boolean }

export interface HabitLog {
  id: string
  habitId: string
  date: string
  completed: boolean
  note: string | null
  createdAt: string
}

export interface LogPayload {
  date?: string
  completed?: boolean
  note?: string | null
}

export interface WeeklyStat {
  /** Monday of the week */
  weekStart: string
  scheduled: number
  completed: number
  /** 0–1, or null when nothing was scheduled */
  rate: number | null
}

export interface HabitStats {
  habitId: string
  frequency: Frequency
  currentStreak: number
  longestStreak: number
  from: string
  to: string
  scheduled: number
  completed: number
  completionRate: number | null
  weekly: WeeklyStat[]
}

export interface DateRange {
  from?: string
  to?: string
}
