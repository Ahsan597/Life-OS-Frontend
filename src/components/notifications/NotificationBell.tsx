import { BellIcon, CheckCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadError } from '@/components/common/LoadError'
import { NotificationContent } from '@/components/notifications/NotificationContent'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useLatestNotifications, useMarkAllRead, useSetNotificationRead, useUnreadCount } from '@/hooks/useNotifications'
import { useNow } from '@/hooks/useNow'
import { notificationLink, unreadBadge } from '@/lib/notifications'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/types/notifications'

/** Navbar bell: unread badge, and the latest five in a dropdown (a full-height sheet on phones) */
export function NotificationBell() {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = useState(false)
  const unread = useUnreadCount()
  const latest = useLatestNotifications({ enabled: open })
  const setRead = useSetNotificationRead()
  const markAll = useMarkAllRead()
  const navigate = useNavigate()
  const now = useNow()

  const count = unread.data ?? 0
  const badge = unreadBadge(count)
  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications'

  function openItem(notification: AppNotification) {
    if (!notification.isRead) setRead.mutate({ notification, isRead: true, quiet: true })
    setOpen(false)
    const link = notificationLink(notification)
    if (link) navigate(link)
  }

  function seeAll() {
    setOpen(false)
    navigate('/notifications')
  }

  const trigger = (
    <>
      <BellIcon className="size-5" aria-hidden="true" />
      {badge ? (
        <span
          aria-hidden="true"
          data-testid="unread-badge"
          className="absolute top-1 right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] leading-none font-semibold text-white"
        >
          {badge}
        </span>
      ) : null}
    </>
  )
  const triggerClass =
    'relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-focus-ring'

  const items = latest.data?.notifications ?? []
  const body = latest.isPending ? (
    <div className="flex flex-col gap-2 p-2" aria-label="Loading notifications">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  ) : latest.isError ? (
    <div className="p-2">
      <LoadError error={latest.error} onRetry={() => void latest.refetch()} />
    </div>
  ) : items.length === 0 ? (
    <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
  ) : null

  if (!isDesktop) {
    return (
      <>
        <button type="button" aria-label={label} className={triggerClass} onClick={() => setOpen(true)}>
          {trigger}
        </button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-svh gap-0 p-0">
            <div className="flex items-center gap-2 border-b px-4 py-3 pr-12">
              <SheetTitle className="font-heading text-lg font-semibold">Notifications</SheetTitle>
            </div>
            <div className="flex-1 overflow-y-auto">
              {body ?? (
                <ul className="flex flex-col divide-y" aria-label="Latest notifications">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => openItem(item)}
                        className="flex min-h-11 w-full cursor-pointer px-4 py-3 outline-none hover:bg-muted focus-visible:bg-muted"
                      >
                        <NotificationContent notification={item} now={now} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex gap-2 border-t p-3">
              <Button variant="secondary" className="h-11 flex-1" onClick={() => markAll.mutate()} disabled={count === 0} loading={markAll.isPending}>
                <CheckCheckIcon />
                Mark all as read
              </Button>
              <Button className="h-11 flex-1" onClick={seeAll}>
                See all
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger aria-label={label} className={triggerClass}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-96 max-w-[calc(100vw-2rem)] p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5 text-sm font-semibold text-foreground">
            Notifications
            {count > 0 ? <span className="text-[12px] font-normal text-muted-foreground">{count} unread</span> : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {body ??
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => openItem(item)}
              className={cn('items-start px-2 py-2.5', !item.isRead && 'bg-primary-soft/40')}
            >
              <NotificationContent notification={item} now={now} />
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />
        <div className="flex gap-1">
          <DropdownMenuItem
            closeOnClick={false}
            disabled={count === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
            className="h-9 flex-1 justify-center px-2"
          >
            <CheckCheckIcon />
            Mark all as read
          </DropdownMenuItem>
          <DropdownMenuItem onClick={seeAll} className="h-9 flex-1 justify-center px-2 font-medium text-primary">
            See all
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
