import { useHabits } from '@/hooks/useHabits'
import { useNow } from '@/hooks/useNow'
import { toLogicalDate } from '@/lib/dates'
import { useAuthStore } from '@/store/authStore'

/**
 * "Today" in the user's timezone. The server's answer (habits[i].today.date) wins; with no
 * habits to read it from, fall back to the same rule the server uses: the current instant
 * resolved in the user's timezone (never the browser's).
 */
export function useToday(): string {
  const timeZone = useAuthStore((state) => state.user?.timezone ?? 'UTC')
  const now = useNow()
  const { data: habits } = useHabits()
  return habits?.[0]?.today.date ?? toLogicalDate(now, timeZone)
}
