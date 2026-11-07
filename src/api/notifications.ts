import { apiClient } from '@/api/client'
import type { AppNotification, NotificationPage, NotificationQuery } from '@/types/notifications'

export async function listNotifications(query: NotificationQuery = {}): Promise<NotificationPage> {
  const { data } = await apiClient.get<NotificationPage>('/notifications', { params: query })
  return data
}

export async function setNotificationRead(id: string, isRead: boolean): Promise<AppNotification> {
  const { data } = await apiClient.patch<{ notification: AppNotification }>(`/notifications/${id}`, { isRead })
  return data.notification
}

/** Returns how many were marked read */
export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await apiClient.post<{ updated: number }>('/notifications/read-all')
  return data.updated
}
