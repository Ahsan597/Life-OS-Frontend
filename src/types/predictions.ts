import type { Metric } from '@/types/checkIn'
import type { Frequency } from '@/types/habit'

export type RiskLevel = 'low' | 'medium' | 'high' | 'insufficient_data'
export type Confidence = 'low' | 'medium' | 'high'

export interface ForecastFactor {
  factor: 'recent_completion' | 'day_of_week' | 'miss_run' | 'streak' | 'checkin'
  effect: 'raises_risk' | 'lowers_risk'
  /** Already worded for display: show it, never parse it */
  detail: string
  /** Only on `checkin` factors */
  metric?: Metric
}

export interface ForecastTarget {
  period: 'day' | 'week'
  /** The day, or the week's Monday when period = "week" */
  date: string
  /** Today / this week, still open: the streak is on the line now */
  current: boolean
}

export interface Forecast {
  habitId: string
  title: string
  frequency: Frequency
  currentStreak: number
  target: ForecastTarget
  /** 0–1 */
  completionProbability: number
  /** 0–1, = 1 − completionProbability; only a placeholder when riskLevel is insufficient_data */
  riskScore: number
  riskLevel: RiskLevel
  /** How much history it's based on */
  confidence: Confidence
  factors: ForecastFactor[]
  modelVersion: string
}

export interface StreakRisk {
  /** The user's "today" */
  date: string
  modelVersion: string
  /** Active habits, riskiest first, insufficient_data last */
  habits: Forecast[]
}

export interface RiskLevelAccuracy {
  riskLevel: Exclude<RiskLevel, 'insufficient_data'>
  predictions: number
  /** null when predictions is 0 */
  averagePredictedRisk: number | null
  observedMissRate: number | null
}

export interface CalibrationBucket {
  /** "0-20%" … "80-100%" */
  bucket: string
  predictions: number
  averagePredictedRisk: number | null
  observedMissRate: number | null
}

export interface PredictionAccuracy {
  from: string
  /** Yesterday at the latest: today's outcome isn't known yet */
  to: string
  modelVersion: string
  /** Forecasts checked; 0 = nothing to show yet */
  evaluated: number
  observedMissRate: number | null
  /** 0 = perfect, 0.25 = coin flip */
  brierScore: number | null
  baselineBrierScore: number | null
  /** > 0 = better than always guessing the average miss rate */
  brierSkillScore: number | null
  byRiskLevel: RiskLevelAccuracy[]
  calibration: CalibrationBucket[]
}
