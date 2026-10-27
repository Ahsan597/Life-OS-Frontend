import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toApiError, type ApiError } from '@/api/client'
import { getCorrelations, listRecommendations, updateRecommendation } from '@/api/insights'
import type { DateRange } from '@/types/habit'
import type { Recommendation, RecommendationStatus } from '@/types/insights'

type StatusFilter = RecommendationStatus | 'all'

export const insightKeys = {
  correlationsAll: ['correlations'] as const,
  correlations: (from?: string, to?: string) => ['correlations', from, to] as const,
  recommendationsAll: ['recommendations'] as const,
  recommendations: (status: StatusFilter) => ['recommendations', status] as const,
}

/** Insights are derived from habits and check-ins, so every write to those refreshes them */
export function invalidateInsights(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: insightKeys.recommendationsAll }),
    queryClient.invalidateQueries({ queryKey: insightKeys.correlationsAll }),
  ])
}

export function useCorrelations(range: Required<DateRange>) {
  return useQuery({
    queryKey: insightKeys.correlations(range.from, range.to),
    queryFn: () => getCorrelations(range),
    // Switching 30 / 90 / 180 days keeps the old findings on screen while the new range loads.
    placeholderData: keepPreviousData,
  })
}

export function useRecommendations(status: StatusFilter = 'pending', { enabled = true } = {}) {
  return useQuery({ queryKey: insightKeys.recommendations(status), queryFn: () => listRecommendations(status), enabled })
}

type Snapshot = [readonly unknown[], unknown][]

/** Accept or dismiss: the card leaves the pending list straight away and comes back if the call fails */
export function useUpdateRecommendation() {
  const queryClient = useQueryClient()
  return useMutation<
    Recommendation,
    ApiError,
    { id: string; status: Exclude<RecommendationStatus, 'pending'> },
    { snapshot: Snapshot }
  >({
    mutationFn: async ({ id, status }) => {
      try {
        return await updateRecommendation(id, status)
      } catch (error) {
        throw toApiError(error)
      }
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: insightKeys.recommendationsAll })
      const key = insightKeys.recommendations('pending')
      const snapshot = queryClient.getQueriesData({ queryKey: key }) as Snapshot
      queryClient.setQueryData<Recommendation[]>(key, (list) => list?.filter((item) => item.id !== id))
      return { snapshot }
    },
    onError: (error, _variables, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
      toast.error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: insightKeys.recommendationsAll }),
  })
}
