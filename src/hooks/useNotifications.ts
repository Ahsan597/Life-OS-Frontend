import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { withApiError, type ApiError } from '@/api/client'
import { listNotifications, markAllNotificationsRead, setNotificationRead } from '@/api/notifications'
import { restoreQueries, snapshotQueries, type QuerySnapshot } from '@/lib/queryCache'
import type { AppNotification, NotificationPage } from '@/types/notifications'

/** Everything lives under ['notifications'], so one invalidation refreshes bell, dropdown and page */
export const notificationKeys = {
  all: ['notifications'] as const,
  unreadCount: ['notifications', 'unreadCount'] as const,
  latest: ['notifications', 'latest'] as const,
  list: (unreadOnly: boolean) => ['notifications', { unreadOnly }] as const,
}

const PAGE_SIZE = 20

/**
 * The bell's badge. Polls every 60s and on focus; React Query pauses the interval while
 * the tab is hidden (refetchIntervalInBackground is false).
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => listNotifications({ limit: 1 }),
    select: (page) => page.unreadCount,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

/** The newest five, for the bell dropdown */
export function useLatestNotifications({ enabled = true } = {}) {
  return useQuery({
    queryKey: notificationKeys.latest,
    queryFn: () => listNotifications({ limit: 5 }),
    enabled,
  })
}

/** Paged with the nextCursor -> ?before= cursor */
export function useNotificationFeed(unreadOnly: boolean) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(unreadOnly),
    queryFn: ({ pageParam }) => listNotifications({ unreadOnly, limit: PAGE_SIZE, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}

/** Flips one item in a cached page; `delta` moves the count, which spans all notifications */
function applyRead(page: NotificationPage, id: string, isRead: boolean, delta: number): NotificationPage {
  return {
    ...page,
    notifications: page.notifications.map((item) =>
      item.id === id ? { ...item, isRead, readAt: isRead ? new Date().toISOString() : null } : item,
    ),
    unreadCount: Math.max(0, page.unreadCount + delta),
  }
}

function isInfinite(data: unknown): data is InfiniteData<NotificationPage> {
  return !!data && typeof data === 'object' && 'pages' in data
}

interface SetReadVariables {
  notification: AppNotification
  isRead: boolean
  /** Marked read because the user opened it: no toast, the open itself is the feedback */
  quiet?: boolean
}

/** Mark one read or unread: shown at once everywhere, rolled back if the server refuses */
export function useSetNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation<AppNotification, ApiError, SetReadVariables, { snapshot: QuerySnapshot }>({
    mutationFn: withApiError(({ notification, isRead }) => setNotificationRead(notification.id, isRead)),
    onMutate: async ({ notification, isRead }) => {
      const snapshot = await snapshotQueries(queryClient, notificationKeys.all)
      if (notification.isRead !== isRead) {
        const delta = isRead ? -1 : 1
        queryClient.setQueriesData({ queryKey: notificationKeys.all }, (data: unknown) => {
          if (isInfinite(data)) {
            return { ...data, pages: data.pages.map((page) => applyRead(page, notification.id, isRead, delta)) }
          }
          if (data && typeof data === 'object' && 'notifications' in data) {
            return applyRead(data as NotificationPage, notification.id, isRead, delta)
          }
          return data
        })
      }
      return { snapshot }
    },
    onSuccess: (_data, { isRead, quiet }) => {
      if (!quiet) toast.success(isRead ? 'Marked as read' : 'Marked as unread')
    },
    onError: (_error, _variables, context) => restoreQueries(queryClient, context?.snapshot),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation<number, ApiError>({
    mutationFn: withApiError(markAllNotificationsRead),
    onSuccess: (updated) => {
      if (updated === 0) toast.info('No unread notifications')
      else toast.success(updated === 1 ? 'Marked 1 notification as read' : `Marked ${updated} notifications as read`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}
