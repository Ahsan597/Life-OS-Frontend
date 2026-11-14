import { BellOffIcon, CheckCheckIcon, MailIcon, MailOpenIcon } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadError } from '@/components/common/LoadError'
import { PageHeader } from '@/components/common/PageHeader'
import { Segmented } from '@/components/common/Segmented'
import { NotificationContent } from '@/components/notifications/NotificationContent'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkAllRead, useNotificationFeed, useSetNotificationRead, useUnreadCount } from '@/hooks/useNotifications'
import { useNow } from '@/hooks/useNow'
import { notificationLink } from '@/lib/notifications'
import { useAuthStore } from '@/store/authStore'
import type { AppNotification } from '@/types/notifications'

export function NotificationsPage() {
  const [params, setParams] = useSearchParams()
  const unreadOnly = params.get('filter') === 'unread'
  const feed = useNotificationFeed(unreadOnly)
  const unread = useUnreadCount()
  const markAll = useMarkAllRead()
  const reminderTime = useAuthStore((state) => state.user?.preferences.reminderTime ?? '20:00')
  const now = useNow()

  const items = feed.data?.pages.flatMap((page) => page.notifications) ?? []
  const unreadCount = unread.data ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Your daily reminders, newest first. Older than 90 days are cleared automatically."
        actions={
          <Button variant="secondary" onClick={() => markAll.mutate()} disabled={unreadCount === 0} loading={markAll.isPending}>
            <CheckCheckIcon />
            Mark all as read
          </Button>
        }
      />

      <Segmented
        label="Show"
        value={unreadOnly ? 'unread' : 'all'}
        options={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread' },
        ]}
        onChange={(value) => setParams(value === 'unread' ? { filter: 'unread' } : {}, { replace: true })}
      />

      {feed.isPending ? (
        <div className="flex flex-col gap-3" aria-label="Loading notifications">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : feed.isError ? (
        <LoadError error={feed.error} onRetry={() => void feed.refetch()} />
      ) : items.length === 0 ? (
        unreadOnly ? (
          <EmptyState icon={MailOpenIcon} title="All caught up" description="You've read every notification." />
        ) : (
          <EmptyState
            icon={BellOffIcon}
            title="No notifications yet"
            description={`No notifications yet. Your daily reminder shows up here at ${reminderTime}.`}
          />
        )
      ) : (
        <>
          <ul className="flex flex-col gap-3" aria-label="Notifications">
            {items.map((item) => (
              <li key={item.id}>
                <NotificationRow notification={item} now={now} />
              </li>
            ))}
          </ul>
          {feed.hasNextPage ? (
            <Button
              variant="secondary"
              className="h-11 self-center"
              onClick={() => void feed.fetchNextPage()}
              loading={feed.isFetchingNextPage}
            >
              Load older
            </Button>
          ) : (
            <p className="text-center text-[13px] text-muted-foreground">You've reached the end.</p>
          )}
        </>
      )}
    </div>
  )
}

function NotificationRow({ notification, now }: { notification: AppNotification; now: Date }) {
  const navigate = useNavigate()
  const setRead = useSetNotificationRead()
  const link = notificationLink(notification)

  function open() {
    if (!notification.isRead) setRead.mutate({ notification, isRead: true, quiet: true })
    if (link) navigate(link)
  }

  return (
    <Card className={notification.isRead ? 'gap-0 py-0' : 'gap-0 bg-primary-soft/30 py-0'}>
      <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:p-4">
        <button
          type="button"
          onClick={open}
          aria-label={`${notification.isRead ? '' : 'Unread: '}${notification.title}. ${notification.message}`}
          className="flex min-h-11 min-w-0 flex-1 cursor-pointer rounded-md outline-none focus-visible:ring-3 focus-visible:ring-focus-ring"
        >
          <NotificationContent notification={notification} now={now} />
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-11 self-end sm:self-start"
          onClick={() => setRead.mutate({ notification, isRead: !notification.isRead })}
        >
          {notification.isRead ? <MailIcon /> : <MailOpenIcon />}
          {notification.isRead ? 'Mark as unread' : 'Mark as read'}
        </Button>
      </CardContent>
    </Card>
  )
}
