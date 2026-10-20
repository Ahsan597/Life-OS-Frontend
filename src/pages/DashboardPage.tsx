import {
  AngryIcon,
  CalendarIcon,
  FlameIcon,
  FrownIcon,
  GlobeIcon,
  LaughIcon,
  ListChecksIcon,
  MailIcon,
  MehIcon,
  PlusIcon,
  SmileIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useNow } from '@/hooks/useNow'
import { formatLongDate, formatMonthDayYear, getGreeting, getHourInTimeZone } from '@/lib/datetime'
import { useAuthStore } from '@/store/authStore'

const MOODS: { icon: LucideIcon; label: string }[] = [
  { icon: AngryIcon, label: 'Awful' },
  { icon: FrownIcon, label: 'Bad' },
  { icon: MehIcon, label: 'Okay' },
  { icon: SmileIcon, label: 'Good' },
  { icon: LaughIcon, label: 'Great' },
]

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const now = useNow()

  // ProtectedRoute guarantees a user; this keeps TypeScript happy.
  if (!user) return null

  const greeting = getGreeting(getHourInTimeZone(now, user.timezone))

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-page-title">
          {greeting}, {user.name ?? 'there'} <span aria-hidden="true">👋</span>
        </h1>
        <p className="text-muted-foreground">{formatLongDate(now, user.timezone)}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-section-title">Today's habits</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={ListChecksIcon}
              title="Your habits will live here"
              description="Habit tracking arrives in the next update."
            >
              <Button variant="secondary" disabled>
                <PlusIcon />
                Add habit
              </Button>
            </EmptyState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-section-title">Daily check-in</CardTitle>
            <CardDescription>How are you feeling today?</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center gap-4">
            <ul className="flex justify-between gap-2 sm:justify-start sm:gap-4" aria-label="Mood scale preview">
              {MOODS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex size-12 items-center justify-center rounded-full bg-muted text-subtle"
                  title={label}
                >
                  <Icon className="size-6" aria-hidden="true" />
                  <span className="sr-only">{label}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted-foreground">Check-ins coming soon.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-section-title">Your streak</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-streak-soft text-streak">
                <FlameIcon className="size-7" aria-hidden="true" />
              </span>
              <p className="flex items-baseline gap-2">
                <span className="font-heading text-5xl font-bold text-streak tabular-nums">0</span>
                <span className="text-muted-foreground">days</span>
              </p>
            </div>
            <p className="text-[13px] text-muted-foreground">Start a habit to begin a streak.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-section-title">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3">
              <ProfileRow icon={UserIcon} label="Name" value={user.name ?? 'Not set'} />
              <ProfileRow icon={MailIcon} label="Email" value={user.email} />
              <ProfileRow icon={GlobeIcon} label="Timezone" value={user.timezone} />
              <ProfileRow
                icon={CalendarIcon}
                label="Member since"
                value={formatMonthDayYear(new Date(user.createdAt), user.timezone)}
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/60 px-6 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{title}</p>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ProfileRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <dt className="w-24 shrink-0 sm:w-28 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium">{value}</dd>
    </div>
  )
}
