import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { withApiError, type ApiError } from '@/api/client'
import { getCheckIn, getCheckInStats, listCheckIns, saveCheckIn } from '@/api/checkIns'
import { invalidateInsights } from '@/hooks/useInsights'
import { invalidateForecasts } from '@/hooks/usePredictions'
import type { CheckIn, CheckInPayload } from '@/types/checkIn'
import type { DateRange } from '@/types/habit'

export const checkInKeys = {
  all: ['checkins'] as const,
  day: (date: string) => ['checkins', 'day', date] as const,
  list: (range: DateRange) => ['checkins', 'list', range] as const,
  stats: (range: DateRange) => ['checkins', 'stats', range] as const,
}

/** data is null when there's no check-in for that day yet */
export function useCheckIn(date: string, { enabled = true } = {}) {
  return useQuery({ queryKey: checkInKeys.day(date), queryFn: () => getCheckIn(date), enabled })
}

export function useCheckIns(range: DateRange) {
  return useQuery({
    queryKey: checkInKeys.list(range),
    queryFn: () => listCheckIns(range),
    placeholderData: keepPreviousData,
  })
}

export function useCheckInStats(range: DateRange) {
  return useQuery({
    queryKey: checkInKeys.stats(range),
    queryFn: () => getCheckInStats(range),
    // Switching 7 / 30 / 90 days keeps the old charts on screen while the new range loads.
    placeholderData: keepPreviousData,
  })
}

export function useSaveCheckIn() {
  const queryClient = useQueryClient()
  return useMutation<CheckIn, ApiError, CheckInPayload, { existed: boolean }>({
    mutationFn: withApiError(saveCheckIn),
    // The same call creates or updates, so remember which one the user was doing.
    onMutate: ({ date }) => ({ existed: !!queryClient.getQueryData<CheckIn | null>(checkInKeys.day(date)) }),
    onSuccess: (checkIn, _payload, context) => {
      toast.success(context?.existed ? 'Check-in updated' : 'Check-in saved')
      queryClient.setQueryData(checkInKeys.day(checkIn.date), checkIn)
      // Today's check-in feeds the forecasts' check-in factor.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: checkInKeys.all }),
        invalidateInsights(queryClient),
        invalidateForecasts(queryClient),
      ])
    },
  })
}
