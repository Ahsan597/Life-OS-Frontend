import { isAxiosError } from 'axios'
import { apiClient } from '@/api/client'
import type { CheckIn, CheckInList, CheckInPayload, CheckInStats } from '@/types/checkIn'
import type { DateRange } from '@/types/habit'

/** One check-in per day: posting again for the same day updates it */
export async function saveCheckIn(payload: CheckInPayload): Promise<CheckIn> {
  const { data } = await apiClient.post<{ checkIn: CheckIn }>('/checkins', payload)
  return data.checkIn
}

export async function listCheckIns(range: DateRange = {}): Promise<CheckInList> {
  const { data } = await apiClient.get<CheckInList>('/checkins', { params: range })
  return data
}

/** null when there's no check-in for that day yet (a 404 is a normal state here) */
export async function getCheckIn(date: string): Promise<CheckIn | null> {
  try {
    const { data } = await apiClient.get<{ checkIn: CheckIn }>(`/checkins/${date}`)
    return data.checkIn
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

export async function getCheckInStats(range: DateRange = {}): Promise<CheckInStats> {
  const { data } = await apiClient.get<{ stats: CheckInStats }>('/checkins/stats', { params: range })
  return data.stats
}
