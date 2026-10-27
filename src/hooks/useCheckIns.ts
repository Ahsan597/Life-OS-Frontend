import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toApiError, type ApiError } from '@/api/client'
import { getCheckIn, getCheckInStats, listCheckIns, saveCheckIn } from '@/api/checkIns'
import { invalidateInsights } from '@/hooks/useInsights'
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
  return useMutation<CheckIn, ApiError, CheckInPayload>({
    mutationFn: async (payload) => {
      try {
        return await saveCheckIn(payload)
      } catch (error) {
        throw toApiError(error)
      }
    },
    onSuccess: (checkIn) => {
      queryClient.setQueryData(checkInKeys.day(checkIn.date), checkIn)
      return Promise.all([queryClient.invalidateQueries({ queryKey: checkInKeys.all }), invalidateInsights(queryClient)])
    },
  })
}
