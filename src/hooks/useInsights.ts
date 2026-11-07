import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { withApiError, type ApiError } from '@/api/client'
import { getCorrelations, listRecommendations, updateRecommendation } from '@/api/insights'
import { restoreQueries, snapshotQueries, type QuerySnapshot } from '@/lib/queryCache'
import type { DateRange } from '@/types/habit'
import type { Recommendation, RecommendationSort, RecommendationStatus } from '@/types/insights'

type StatusFilter = RecommendationStatus | 'all'

export const insightKeys = {
  correlationsAll: ['correlations'] as const,
  correlations: (from?: string, to?: string) => ['correlations', from, to] as const,
  recommendationsAll: ['recommendations'] as const,
  recommendationsByStatus: (status: StatusFilter) => ['recommendations', status] as const,
  recommendations: (status: StatusFilter, sort: RecommendationSort = 'rank') => ['recommendations', status, sort] as const,
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

/** Ranked by the server by default: render in the order received, never re-sort */
export function useRecommendations(
  status: StatusFilter = 'pending',
  { sort = 'rank', enabled = true }: { sort?: RecommendationSort; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: insightKeys.recommendations(status, sort),
    queryFn: () => listRecommendations(status, sort),
    enabled,
  })
}

/** Accept or dismiss: the card leaves the pending list straight away and comes back if the call fails */
export function useUpdateRecommendation() {
  const queryClient = useQueryClient()
  return useMutation<
    Recommendation,
    ApiError,
    { id: string; status: Exclude<RecommendationStatus, 'pending'> },
    { snapshot: QuerySnapshot }
  >({
    mutationFn: withApiError(({ id, status }) => updateRecommendation(id, status)),
    onMutate: async ({ id }) => {
      // Every pending list (ranked and newest-first) drops the card.
      const key = insightKeys.recommendationsByStatus('pending')
      const snapshot = await snapshotQueries(queryClient, key)
      queryClient.setQueriesData<Recommendation[]>({ queryKey: key }, (list) => list?.filter((item) => item.id !== id))
      return { snapshot }
    },
    onError: (error, _variables, context) => {
      restoreQueries(queryClient, context?.snapshot)
      toast.error(error.message)
    },
    // Dismissals feed the ranking, so say so.
    onSuccess: (_data, { status }) => {
      if (status === 'dismissed') toast("Got it. We'll show fewer tips like this.")
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: insightKeys.recommendationsAll }),
  })
}
