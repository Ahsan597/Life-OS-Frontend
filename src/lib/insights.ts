import { METRIC_META } from '@/lib/checkIns'
import { addDays } from '@/lib/dates'
import type { Metric } from '@/types/checkIn'
import type { Correlation, RecommendationRule, Strength } from '@/types/insights'

export const INSIGHT_RANGES = [30, 90, 180] as const
export type InsightRangeDays = (typeof INSIGHT_RANGES)[number]
export const DEFAULT_INSIGHT_RANGE: InsightRangeDays = 90

/** The order the backend reports them in */
export const INSIGHT_METRICS: Metric[] = ['sleepHours', 'mood', 'energy', 'stressLevel']

/** Today is still in progress, so the range ends yesterday (the server caps `to` there too) */
export function insightsRange(today: string, days: number) {
  const to = addDays(today, -1)
  return { from: addDays(to, -(days - 1)), to }
}

export type RecommendationTone = 'warning' | 'positive' | 'info'

export const RULE_META: Record<RecommendationRule, { emoji: string; tone: RecommendationTone }> = {
  missed_in_a_row: { emoji: '⚠️', tone: 'warning' },
  low_completion: { emoji: '📉', tone: 'warning' },
  streak_milestone: { emoji: '🔥', tone: 'positive' },
  checkin_gap: { emoji: '📝', tone: 'info' },
  low_sleep: { emoji: '😴', tone: 'warning' },
  rising_stress: { emoji: '🧘', tone: 'warning' },
}

/** Falls back to a neutral card for rules the backend adds later */
export function ruleMeta(rule: string) {
  return RULE_META[rule as RecommendationRule] ?? { emoji: '💡', tone: 'info' as const }
}

export const STRENGTH_LABELS: Record<Strength, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
  negligible: 'Negligible',
  no_variation: 'No variation',
  insufficient_data: 'Not enough data',
}

/** Strong reads bold, moderate normal, everything weaker muted */
export function strengthEmphasis(strength: Strength): 'bold' | 'normal' | 'muted' {
  if (strength === 'strong') return 'bold'
  if (strength === 'moderate') return 'normal'
  return 'muted'
}

/**
 * A positive r means "more of this metric, more habits done", so the metric helps;
 * a negative one means it hurts (for stress that's the usual case: stress hurts).
 */
export function correlationEffect({ direction }: Pick<Correlation, 'direction'>): 'helps' | 'hurts' | null {
  if (direction === 'positive') return 'helps'
  if (direction === 'negative') return 'hurts'
  return null
}

/** 0.353 -> "+0.35", null -> "—" */
export function formatR(r: number | null): string {
  if (r === null) return '—'
  const fixed = Math.abs(r).toFixed(2)
  return r > 0 ? `+${fixed}` : r < 0 ? `−${fixed}` : fixed
}

export function metricLabel(metric: Metric) {
  return METRIC_META[metric].label
}

/** Bucket names for tooltips and tables: "Mood 3 (Okay)", "Sleep <6h" */
export function bucketName(metric: Metric, label: string) {
  const scale = METRIC_META[metric].scaleLabels
  const word = scale?.[Number(label) - 1]
  return word ? `${metricLabel(metric)} ${label} (${word})` : `${metricLabel(metric)} ${label}`
}
