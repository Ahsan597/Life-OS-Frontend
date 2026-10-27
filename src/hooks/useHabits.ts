import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toApiError, type ApiError } from '@/api/client'
import {
  archiveHabit,
  createHabit,
  getHabit,
  getHabitStats,
  listHabits,
  listLogs,
  logHabit,
  updateHabit,
  updateLog,
} from '@/api/habits'
import { invalidateInsights } from '@/hooks/useInsights'
import type { DateRange, Habit, HabitBase, HabitLog, HabitPayload, HabitUpdate } from '@/types/habit'

/*
 * Everything habit-related lives under ['habits'], so one invalidation after any write
 * refreshes lists, details, logs and stats together. Streaks are always recomputed by
 * the server; the client never guesses them.
 */
export const habitKeys = {
  all: ['habits'] as const,
  lists: ['habits', 'list'] as const,
  list: (includeArchived: boolean) => ['habits', 'list', { includeArchived }] as const,
  detail: (id: string) => ['habits', 'detail', id] as const,
  logs: (id: string) => ['habits', 'detail', id, 'logs'] as const,
  stats: (id: string, range: DateRange) => ['habits', 'detail', id, 'stats', range] as const,
}

/** After any habit or log write: habit data, plus the insights derived from it */
function refreshAfterWrite(queryClient: QueryClient) {
  return Promise.all([queryClient.invalidateQueries({ queryKey: habitKeys.all }), invalidateInsights(queryClient)])
}

/** Mutations reject with ApiError so forms can read status/details directly */
function apiCall<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  return async (args: TArgs) => {
    try {
      return await fn(args)
    } catch (error) {
      throw toApiError(error)
    }
  }
}

export function useHabits(includeArchived = false) {
  return useQuery({ queryKey: habitKeys.list(includeArchived), queryFn: () => listHabits(includeArchived) })
}

export function useHabit(id: string) {
  return useQuery({ queryKey: habitKeys.detail(id), queryFn: () => getHabit(id) })
}

export function useHabitLogs(id: string) {
  return useQuery({ queryKey: habitKeys.logs(id), queryFn: () => listLogs(id) })
}

export function useHabitStats(id: string, range: DateRange, { enabled = true } = {}) {
  return useQuery({ queryKey: habitKeys.stats(id, range), queryFn: () => getHabitStats(id, range), enabled })
}

export function useCreateHabit() {
  const queryClient = useQueryClient()
  return useMutation<HabitBase, ApiError, HabitPayload>({
    mutationFn: apiCall(createHabit),
    onSuccess: () => refreshAfterWrite(queryClient),
  })
}

export function useUpdateHabit() {
  const queryClient = useQueryClient()
  return useMutation<HabitBase, ApiError, { id: string; patch: HabitUpdate }>({
    mutationFn: apiCall(({ id, patch }) => updateHabit(id, patch)),
    onSuccess: () => refreshAfterWrite(queryClient),
  })
}

export function useArchiveHabit() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, string>({
    mutationFn: apiCall(archiveHabit),
    onSuccess: () => refreshAfterWrite(queryClient),
  })
}

interface LogVariables {
  habitId: string
  date: string
  completed: boolean
}

type Snapshot = [readonly unknown[], unknown][]

/** Flips today's checkbox and the calendar cell straight away; the server's answer replaces it */
function applyOptimisticLog(queryClient: QueryClient, { habitId, date, completed }: LogVariables) {
  const markHabit = (habit: Habit): Habit =>
    habit.id === habitId && habit.today.date === date ? { ...habit, today: { ...habit.today, completed } } : habit

  queryClient.setQueriesData<Habit[]>({ queryKey: habitKeys.lists }, (habits) => habits?.map(markHabit))
  queryClient.setQueryData<Habit>(habitKeys.detail(habitId), (habit) => habit && markHabit(habit))
  queryClient.setQueryData<HabitLog[]>(habitKeys.logs(habitId), (logs) => {
    if (!logs) return logs
    const existing = logs.find((log) => log.date === date)
    if (existing) return logs.map((log) => (log === existing ? { ...log, completed } : log))
    const placeholder: HabitLog = {
      id: `optimistic-${date}`,
      habitId,
      date,
      completed,
      note: null,
      createdAt: new Date().toISOString(),
    }
    return [...logs, placeholder].sort((a, b) => a.date.localeCompare(b.date))
  })
}

/** Marks a habit done / not done for a day (defaults to today on the server) */
export function useLogHabit() {
  const queryClient = useQueryClient()
  return useMutation<HabitLog, ApiError, LogVariables, { snapshot: Snapshot }>({
    mutationFn: apiCall(({ habitId, date, completed }) => logHabit(habitId, { date, completed })),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.all })
      const snapshot = queryClient.getQueriesData({ queryKey: habitKeys.all }) as Snapshot
      applyOptimisticLog(queryClient, variables)
      return { snapshot }
    },
    onError: (error, _variables, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
      toast.error(error.message)
    },
    onSettled: () => refreshAfterWrite(queryClient),
  })
}

export function useUpdateLog() {
  const queryClient = useQueryClient()
  return useMutation<HabitLog, ApiError, { logId: string; note: string | null }>({
    mutationFn: apiCall(({ logId, note }) => updateLog(logId, { note })),
    onSuccess: () => refreshAfterWrite(queryClient),
  })
}
