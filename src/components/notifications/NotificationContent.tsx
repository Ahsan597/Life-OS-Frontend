import { BellIcon, BellRingIcon, LightbulbIcon, SparklesIcon, type LucideIcon } from 'lucide-react'
import { relativeTime } from '@/lib/notifications'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/types/notifications'

const TYPE_ICONS: Record<string, LucideIcon> = {
  reminder: BellRingIcon,
  insight: SparklesIcon,
  recommendation: LightbulbIcon,
}

/** Icon, title, message and time; unread items get a dot and a bolder title */
export function NotificationContent({ notification, now }: { notification: AppNotification; now: Date }) {
  const Icon = TYPE_ICONS[notification.type] ?? BellIcon
  return (
    <span className="flex w-full min-w-0 items-start gap-3 text-left" data-unread={!notification.isRead || undefined}>
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-4.5" aria-hidden="true" />
        {notification.isRead ? null : (
          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card" aria-hidden="true" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-sm', notification.isRead ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground')}>
          {notification.isRead ? null : <span className="sr-only">Unread: </span>}
          {notification.title}
        </span>
        <span className="text-[13px] whitespace-normal text-muted-foreground">{notification.message}</span>
        <time dateTime={notification.createdAt} className="text-[12px] text-subtle">
          {relativeTime(notification.createdAt, now)}
        </time>
      </span>
    </span>
  )
}
