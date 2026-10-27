import { apiClient } from '@/api/client'
import type { DateRange } from '@/types/habit'
import type { PredictionAccuracy, StreakRisk } from '@/types/predictions'

/** One forecast per active habit, riskiest first */
export async function getStreakRisk(): Promise<StreakRisk> {
  const { data } = await apiClient.get<StreakRisk>('/predictions/streak-risk')
  return data
}

/** Backtest of the forecasts; defaults to the last 30 days, today excluded */
export async function getPredictionAccuracy(range: DateRange = {}): Promise<PredictionAccuracy> {
  const { data } = await apiClient.get<PredictionAccuracy>('/predictions/accuracy', { params: range })
  return data
}
