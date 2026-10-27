import { apiClient } from '@/api/client'
import type {
  DateRange,
  Habit,
  HabitBase,
  HabitLog,
  HabitPayload,
  HabitStats,
  HabitUpdate,
  LogPayload,
} from '@/types/habit'

export async function listHabits(includeArchived = false): Promise<Habit[]> {
  const { data } = await apiClient.get<{ habits: Habit[] }>('/habits', { params: { includeArchived } })
  return data.habits
}

export async function getHabit(id: string): Promise<Habit> {
  const { data } = await apiClient.get<{ habit: Habit }>(`/habits/${id}`)
  return data.habit
}

export async function createHabit(payload: HabitPayload): Promise<HabitBase> {
  const { data } = await apiClient.post<{ habit: HabitBase }>('/habits', payload)
  return data.habit
}

export async function updateHabit(id: string, patch: HabitUpdate): Promise<HabitBase> {
  const { data } = await apiClient.put<{ habit: HabitBase }>(`/habits/${id}`, patch)
  return data.habit
}

/** Soft delete: the habit is archived and keeps its history */
export async function archiveHabit(id: string): Promise<void> {
  await apiClient.delete(`/habits/${id}`)
}

/** One log per habit per day: posting again for the same day updates it */
export async function logHabit(id: string, payload: LogPayload): Promise<HabitLog> {
  const { data } = await apiClient.post<{ log: HabitLog }>(`/habits/${id}/logs`, payload)
  return data.log
}

export async function listLogs(id: string, range: DateRange = {}): Promise<HabitLog[]> {
  const { data } = await apiClient.get<{ logs: HabitLog[] }>(`/habits/${id}/logs`, { params: range })
  return data.logs
}

export async function updateLog(logId: string, patch: Pick<LogPayload, 'completed' | 'note'>): Promise<HabitLog> {
  const { data } = await apiClient.patch<{ log: HabitLog }>(`/logs/${logId}`, patch)
  return data.log
}

export async function getHabitStats(id: string, range: DateRange = {}): Promise<HabitStats> {
  const { data } = await apiClient.get<{ stats: HabitStats }>(`/habits/${id}/stats`, { params: range })
  return data.stats
}
