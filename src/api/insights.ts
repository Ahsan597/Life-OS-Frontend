import { apiClient } from '@/api/client'
import type { DateRange } from '@/types/habit'
import type { Correlations, Recommendation, RecommendationSort, RecommendationStatus } from '@/types/insights'

/** Defaults to the last 90 days; `to` is capped at yesterday by the server */
export async function getCorrelations(range: DateRange = {}): Promise<Correlations> {
  const { data } = await apiClient.get<Correlations>('/insights/correlations', { params: range })
  return data
}

/** Recomputed by the server on every call; render in the order received */
export async function listRecommendations(
  status: RecommendationStatus | 'all' = 'pending',
  sort: RecommendationSort = 'rank',
): Promise<Recommendation[]> {
  const { data } = await apiClient.get<{ recommendations: Recommendation[] }>('/insights/recommendations', {
    params: { status, sort },
  })
  return data.recommendations
}

export async function updateRecommendation(
  id: string,
  status: Exclude<RecommendationStatus, 'pending'>,
): Promise<Recommendation> {
  const { data } = await apiClient.patch<{ recommendation: Recommendation }>(`/insights/recommendations/${id}`, {
    status,
  })
  return data.recommendation
}
