import type { Metric } from '@/types/checkIn'

export type Strength = 'insufficient_data' | 'no_variation' | 'negligible' | 'weak' | 'moderate' | 'strong'

/** null when the strength is negligible or there's no result */
export type Direction = 'positive' | 'negative' | null

export interface Correlation {
  metric: Metric
  /** -1 to 1, or null when it can't be computed */
  r: number | null
  sampleSize: number
  strength: Strength
  direction: Direction
  /** Already written for users: show it as-is */
  summary: string
}

export interface Bucket {
  /** e.g. "<6h" for sleep, "1"–"5" for the 1–5 scales */
  label: string
  days: number
  /** 0–1, or null when no day fell in this bucket */
  averageCompletionRate: number | null
}

export interface OverallCorrelation extends Correlation {
  buckets: Bucket[]
}

/** Daily and custom habits only: weekly habits have no single day to compare against */
export interface HabitCorrelations {
  habitId: string
  title: string
  correlations: Correlation[]
}

export interface Highlight extends Correlation {
  scope: 'overall' | 'habit'
  habitId?: string | null
  habitTitle?: string | null
}

export interface Correlations {
  from: string
  /** Yesterday at the latest: today is still in progress */
  to: string
  minSampleSize: number
  overall: OverallCorrelation[]
  habits: HabitCorrelations[]
  /** Moderate and strong findings only, strongest first */
  highlights: Highlight[]
}

export type RecommendationRule =
  | 'missed_in_a_row'
  | 'low_completion'
  | 'streak_milestone'
  | 'checkin_gap'
  | 'low_sleep'
  | 'rising_stress'
  | 'streak_at_risk'

export type RecommendationStatus = 'pending' | 'accepted' | 'dismissed'

/** rank: pending by personal score, then the rest newest first. recent: newest first. */
export type RecommendationSort = 'rank' | 'recent'

export type Priority = 'high' | 'medium' | 'low'

/** Multipliers behind the score; 1 = neutral */
export interface ScoreFactors {
  /** How important this kind of advice is */
  ruleWeight: number
  /** > 1: the linked habit's streak is at risk */
  habitRisk: number
  /** > 1: you usually accept this kind; < 1: you usually dismiss it */
  feedback: number
  /** New advice ranks slightly higher; decays over ~2 weeks */
  freshness: number
}

export interface Recommendation {
  id: string
  rule: RecommendationRule
  source: string
  habitId: string | null
  habitTitle: string | null
  message: string
  reason: string
  status: RecommendationStatus
  createdAt: string
  updatedAt: string
  /** 0–100; score, priority and scoreFactors are only set while pending */
  score: number | null
  priority: Priority | null
  scoreFactors: ScoreFactors | null
}
