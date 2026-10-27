import { AngryIcon, FrownIcon, LaughIcon, MehIcon, SmileIcon, type LucideIcon } from 'lucide-react'
import { eachDay } from '@/lib/dates'
import type { Metric, SeriesPoint, Trend } from '@/types/checkIn'

export const METRICS: Metric[] = ['mood', 'energy', 'stressLevel', 'sleepHours']

export interface MetricMeta {
  label: string
  /** Whether a rising trend is good news (rising stress is bad) */
  higherIsBetter: boolean
  /** Value axis for charts */
  domain: [number, number]
  format: (value: number) => string
  /** Labels for the 1–5 scale, lowest first (not used for sleep) */
  scaleLabels?: string[]
}

export const METRIC_META: Record<Metric, MetricMeta> = {
  mood: {
    label: 'Mood',
    higherIsBetter: true,
    domain: [1, 5],
    format: (v) => `${round1(v)} / 5`,
    scaleLabels: ['Awful', 'Bad', 'Okay', 'Good', 'Great'],
  },
  energy: {
    label: 'Energy',
    higherIsBetter: true,
    domain: [1, 5],
    format: (v) => `${round1(v)} / 5`,
    scaleLabels: ['Drained', 'Low', 'Steady', 'Good', 'Charged'],
  },
  stressLevel: {
    label: 'Stress',
    higherIsBetter: false,
    domain: [1, 5],
    format: (v) => `${round1(v)} / 5`,
    scaleLabels: ['Calm', 'Mild', 'Moderate', 'High', 'Overwhelmed'],
  },
  sleepHours: {
    label: 'Sleep',
    higherIsBetter: true,
    domain: [0, 12],
    format: (v) => `${round1(v)} h`,
  },
}

export const MOOD_ICONS: LucideIcon[] = [AngryIcon, FrownIcon, MehIcon, SmileIcon, LaughIcon]
/** Full class names so Tailwind generates them */
export const MOOD_COLORS = ['text-mood-1', 'text-mood-2', 'text-mood-3', 'text-mood-4', 'text-mood-5']

function round1(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export type TrendTone = 'good' | 'bad' | 'neutral'

/** Rising stress is bad; rising mood, energy or sleep is good */
export function trendTone(metric: Metric, trend: Trend | null): TrendTone {
  if (trend === null || trend === 'flat') return 'neutral'
  const up = trend === 'rising'
  return up === METRIC_META[metric].higherIsBetter ? 'good' : 'bad'
}

export function trendLabel(trend: Trend | null): string {
  if (trend === 'rising') return 'Rising'
  if (trend === 'falling') return 'Falling'
  if (trend === 'flat') return 'Steady'
  return 'Not enough data'
}

/** Value axis for a metric; sleep grows to 24 h if any night exceeds 12 */
export function metricDomain(metric: Metric, values: (number | null)[]): [number, number] {
  const [min, max] = METRIC_META[metric].domain
  const highest = Math.max(...values.map((v) => v ?? -Infinity))
  return metric === 'sleepHours' && highest > max ? [min, 24] : [min, max]
}

/**
 * One entry per day in [from, to]; days without a check-in (or without this metric)
 * are null, so charts draw them as gaps rather than zeros.
 */
export function dailySeries(series: SeriesPoint[], metric: Metric, from: string, to: string) {
  const byDate = new Map(series.map((point) => [point.date, point[metric]]))
  return eachDay(from, to).map((date) => ({ date, value: byDate.get(date) ?? null }))
}
