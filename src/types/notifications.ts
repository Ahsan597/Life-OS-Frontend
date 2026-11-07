export type NotificationType = 'reminder' | 'insight' | 'recommendation'

/** Deep-link payload. Can be null and may grow new keys, so read it defensively. */
export interface ReminderData {
  date?: string
  habitIds?: string[]
  atRiskHabitIds?: string[]
  checkInMissing?: boolean
}

export interface AppNotification {
  id: string
  /** Only "reminder" is produced today; treat unknown types as generic */
  type: NotificationType | (string & {})
  title: string
  message: string
  data: (ReminderData & Record<string, unknown>) | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationPage {
  /** Newest first */
  notifications: AppNotification[]
  /** Across ALL notifications, not just this page */
  unreadCount: number
  /** Pass as ?before= for the next page; null = no more */
  nextCursor: string | null
}

export interface NotificationQuery {
  unreadOnly?: boolean
  /** 1–50 */
  limit?: number
  before?: string
}
