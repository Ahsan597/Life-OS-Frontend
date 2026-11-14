import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { withApiError, type ApiError } from '@/api/client'
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
import { invalidateForecasts } from '@/hooks/usePredictions'
import { restoreQueries, snapshotQueries, type QuerySnapshot } from '@/lib/queryCache'
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

/** After any habit or log write: habit data, plus the insights and forecasts derived from it */
function refreshAfterWrite(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: habitKeys.all }),
    invalidateInsights(queryClient),
    invalidateForecasts(queryClient),
  ])
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

/** The title of a cached habit, for messages about it */
function cachedHabitTitle(queryClient: QueryClient, habitId: string): string | undefined {
  const detail = queryClient.getQueryData<Habit>(habitKeys.detail(habitId))
  if (detail) return detail.title
  for (const [, habits] of queryClient.getQueriesData<Habit[]>({ queryKey: habitKeys.lists })) {
    const habit = habits?.find((item) => item.id === habitId)
    if (habit) return habit.title
  }
}

// Success toasts are shown before the refetch: see lib/mutationFeedback.

export function useCreateHabit() {
  const queryClient = useQueryClient()
  return useMutation<HabitBase, ApiError, HabitPayload>({
    mutationFn: withApiError(createHabit),
    onSuccess: (habit) => {
      toast.success(`Created “${habit.title}”`)
      return refreshAfterWrite(queryClient)
    },
  })
}

/** Edits a habit, or restores an archived one with { isActive: true } */
export function useUpdateHabit() {
  const queryClient = useQueryClient()
  return useMutation<HabitBase, ApiError, { id: string; patch: HabitUpdate }>({
    mutationFn: withApiError(({ id, patch }) => updateHabit(id, patch)),
    onSuccess: (habit, { patch }) => {
      toast.success(patch.isActive === true ? `Restored “${habit.title}”` : 'Habit updated')
      return refreshAfterWrite(queryClient)
    },
  })
}

export function useArchiveHabit() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, Pick<HabitBase, 'id' | 'title'>>({
    mutationFn: withApiError(({ id }) => archiveHabit(id)),
    onSuccess: (_data, habit) => {
      toast.success(`Archived “${habit.title}”`)
      return refreshAfterWrite(queryClient)
    },
  })
}

interface LogVariables {
  habitId: string
  date: string
  completed: boolean
}

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
  return useMutation<HabitLog, ApiError, LogVariables, { snapshot: QuerySnapshot }>({
    mutationFn: withApiError(({ habitId, date, completed }) => logHabit(habitId, { date, completed })),
    onMutate: async (variables) => {
      const snapshot = await snapshotQueries(queryClient, habitKeys.all)
      applyOptimisticLog(queryClient, variables)
      return { snapshot }
    },
    onSuccess: (_log, { habitId, date, completed }) => {
      const title = cachedHabitTitle(queryClient, habitId)
      const what = title ? `“${title}”` : 'Habit'
      // One toast per habit and day, so quick re-toggles replace it instead of stacking.
      toast.success(completed ? `${what} marked done` : `${what} marked not done`, { id: `log-${habitId}-${date}` })
    },
    onError: (_error, _variables, context) => restoreQueries(queryClient, context?.snapshot),
    onSettled: () => refreshAfterWrite(queryClient),
  })
}

export function useUpdateLog() {
  const queryClient = useQueryClient()
  return useMutation<HabitLog, ApiError, { logId: string; note: string | null }>({
    mutationFn: withApiError(({ logId, note }) => updateLog(logId, { note })),
    onSuccess: (_log, { note }) => {
      toast.success(note ? 'Note saved' : 'Note removed')
      return refreshAfterWrite(queryClient)
    },
  })
}
