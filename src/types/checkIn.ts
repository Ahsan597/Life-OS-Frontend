export type Metric = 'mood' | 'energy' | 'sleepHours' | 'stressLevel'

export interface CheckIn {
  id: string
  date: string
  /** 1–5 */
  mood: number | null
  energy: number | null
  /** 0–24, one decimal place */
  sleepHours: number | null
  stressLevel: number | null
  note: string | null
  createdAt: string
}

/** On update, omitted fields keep their old value, so always send all four metrics */
export interface CheckInPayload {
  date: string
  mood: number | null
  energy: number | null
  sleepHours: number | null
  stressLevel: number | null
  note: string | null
}

export interface CheckInList {
  from: string
  to: string
  checkIns: CheckIn[]
}

export type Trend = 'rising' | 'falling' | 'flat'

export interface MetricStats {
  count: number
  average: number | null
  min: number | null
  max: number | null
  slopePerDay: number | null
  /** null when there isn't enough data */
  trend: Trend | null
}

export type SeriesPoint = { date: string } & Record<Metric, number | null>

export interface CheckInStats {
  from: string
  to: string
  daysInRange: number
  daysCheckedIn: number
  metrics: Record<Metric, MetricStats>
  /** Only days with a check-in */
  series: SeriesPoint[]
}
