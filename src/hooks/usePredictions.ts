import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getPredictionAccuracy, getStreakRisk } from '@/api/predictions'
import type { DateRange } from '@/types/habit'
import type { Forecast } from '@/types/predictions'

export const predictionKeys = {
  streakRisk: ['streakRisk'] as const,
  accuracyAll: ['predictionAccuracy'] as const,
  accuracy: (from?: string, to?: string) => ['predictionAccuracy', from, to] as const,
}

/** Forecasts depend on logs, check-ins and the habit list; every write to those refreshes them */
export function invalidateForecasts(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: predictionKeys.streakRisk })
}

/**
 * One request for every habit's forecast, plus a habitId lookup so cards can join it
 * client-side. Short staleTime + focus refetch: "today" can roll over while the tab is open.
 */
export function useStreakRisk() {
  const query = useQuery({
    queryKey: predictionKeys.streakRisk,
    queryFn: getStreakRisk,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
  const byHabit = useMemo(
    () => new Map<string, Forecast>(query.data?.habits.map((forecast) => [forecast.habitId, forecast]) ?? []),
    [query.data],
  )
  return { ...query, byHabit }
}

export function usePredictionAccuracy(range: Required<DateRange>, { enabled = true } = {}) {
  return useQuery({
    queryKey: predictionKeys.accuracy(range.from, range.to),
    queryFn: () => getPredictionAccuracy(range),
    // Past outcomes rarely change.
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    enabled,
  })
}
