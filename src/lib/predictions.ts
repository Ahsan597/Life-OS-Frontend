import { addDays, formatDayMonth, formatWeekdayDayMonth, weekStart } from '@/lib/dates'
import type { ScoreFactors } from '@/types/insights'
import type { Confidence, Forecast, RiskLevel, RiskLevelAccuracy } from '@/types/predictions'

/** 0.905 -> "91%", null -> "—" */
export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
  insufficient_data: 'Still learning',
}

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: 'Based on a lot of history',
  medium: 'Based on some history',
  low: 'Based on a little history',
}

export type RiskBadgeKind = 'at_risk' | 'watch'

/**
 * The badge on a habit card. Only an open period (today / this week) can be at risk;
 * once the habit is ticked off today counts as safe even before the refetch lands.
 */
export function riskBadgeKind(forecast: Forecast | undefined, { doneToday = false } = {}): RiskBadgeKind | null {
  if (!forecast || !forecast.target.current || doneToday) return null
  if (forecast.riskLevel === 'high') return 'at_risk'
  if (forecast.riskLevel === 'medium') return 'watch'
  return null
}

/** "today", "tomorrow", "Fri, 30 Oct"; weekly: "this week", "next week", "week of 2 Nov" */
export function targetLabel({ target }: Pick<Forecast, 'target'>, today: string): string {
  if (target.period === 'week') {
    if (target.current) return 'this week'
    if (target.date === addDays(weekStart(today), 7)) return 'next week'
    return `the week of ${formatDayMonth(target.date)}`
  }
  if (target.current || target.date === today) return 'today'
  if (target.date === addDays(today, 1)) return 'tomorrow'
  return formatWeekdayDayMonth(target.date)
}

/** "today" reads "likely to get done today"; a date reads "...on Fri, 30 Oct" */
export function targetPhrase(forecast: Pick<Forecast, 'target'>, today: string): string {
  const label = targetLabel(forecast, today)
  return /^[A-Z]/.test(label) ? `on ${label}` : label
}

/** Tendency, never certainty: "~91% chance of a miss today" */
export function missChanceLabel(forecast: Forecast, today: string): string {
  return `~${formatPercent(forecast.riskScore)} chance of a miss ${targetPhrase(forecast, today)}`
}

/** The readable parts of a recommendation's score; factors within 0.05 of neutral are left out */
export function scoreFactorReasons(factors: ScoreFactors | null): string[] {
  if (!factors) return []
  const differs = (value: number) => Math.abs(value - 1) > 0.05
  const reasons: string[] = []
  if (differs(factors.habitRisk) && factors.habitRisk > 1) reasons.push("This habit's streak is at risk")
  if (differs(factors.feedback)) {
    reasons.push(
      factors.feedback > 1
        ? 'You usually find this kind of tip useful'
        : "You often dismiss these, so it's ranked lower",
    )
  }
  if (differs(factors.freshness) && factors.freshness < 1) reasons.push('This has been waiting a while')
  return reasons
}

export const ACCURACY_RANGES = [30, 90, 180] as const
export type AccuracyRangeDays = (typeof ACCURACY_RANGES)[number]

/** Ends yesterday (today's outcome isn't known yet), never longer than the server's 366-day cap */
export function accuracyRange(serverToday: string, days: number) {
  const to = addDays(serverToday, -1)
  return { from: addDays(to, -(Math.min(days, 366) - 1)), to }
}

/** The high/low rows for the "When we said high risk…" headline, when they have data */
export function headlineLevels(byRiskLevel: RiskLevelAccuracy[]) {
  const pick = (level: 'high' | 'low') =>
    byRiskLevel.find((row) => row.riskLevel === level && row.predictions > 0 && row.observedMissRate !== null)
  return { high: pick('high'), low: pick('low') }
}
