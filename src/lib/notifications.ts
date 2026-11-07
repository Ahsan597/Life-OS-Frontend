import type { AppNotification } from '@/types/notifications'

/** "9+" above nine; null hides the badge */
export function unreadBadge(count: number | undefined): string | null {
  if (!count || count <= 0) return null
  return count > 9 ? '9+' : String(count)
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/**
 * Where a notification takes you: the first at-risk habit, else today's habits on the
 * dashboard, else the check-in page. `data` may be null or carry keys we don't know.
 */
export function notificationLink(notification: Pick<AppNotification, 'data'>): string | null {
  const data = notification.data
  if (!data || typeof data !== 'object') return null
  const atRisk = asStringList(data.atRiskHabitIds)
  if (atRisk.length > 0) return `/habits/${atRisk[0]}`
  if (asStringList(data.habitIds).length > 0) return '/dashboard'
  if (data.checkInMissing === true) return '/check-ins'
  return null
}

/** "just now", "5m ago", "2h ago", "3d ago", then a date */
export function relativeTime(iso: string, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso))
}
