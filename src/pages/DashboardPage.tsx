import {
  CalendarIcon,
  ChevronRightIcon,
  FlameIcon,
  GlobeIcon,
  ListChecksIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  SmilePlusIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadError } from '@/components/common/LoadError'
import { HabitCheckButton } from '@/components/habits/HabitCheckButton'
import { StreakBadge } from '@/components/habits/StreakBadge'
import { RecommendationCard } from '@/components/insights/RecommendationCard'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCheckIn } from '@/hooks/useCheckIns'
import { useHabits, useLogHabit } from '@/hooks/useHabits'
import { useRecommendations } from '@/hooks/useInsights'
import { useNow } from '@/hooks/useNow'
import { useToday } from '@/hooks/useToday'
import { METRIC_META, MOOD_COLORS, MOOD_ICONS } from '@/lib/checkIns'
import { formatLongDate, formatMonthDayYear, getGreeting, getHourInTimeZone } from '@/lib/datetime'
import { formatStreak, scheduleLabel } from '@/lib/habits'
import { useAuthStore } from '@/store/authStore'
import type { CheckIn } from '@/types/checkIn'
import type { Habit } from '@/types/habit'

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
        <TodayHabitsCard />
        <div className="flex flex-col gap-6">
          <CheckInCard />
          <SuggestionsCard />
          <StreakCard />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-section-title">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
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

function TodayHabitsCard() {
  const habits = useHabits()
  const logHabit = useLogHabit()

  const all = habits.data ?? []
  const scheduled = all.filter((habit) => habit.today.scheduled)
  const unscheduled = all.filter((habit) => !habit.today.scheduled)
  const done = scheduled.filter((habit) => habit.today.completed).length

  function toggle(habit: Habit) {
    logHabit.mutate({ habitId: habit.id, date: habit.today.date, completed: !habit.today.completed })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section-title">Today's habits</CardTitle>
        {scheduled.length > 0 ? (
          <CardDescription>
            {done} of {scheduled.length} done
          </CardDescription>
        ) : null}
        {all.length > 0 ? (
          <CardAction>
            <Link to="/habits/new" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              <PlusIcon />
              Add habit
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {habits.isPending ? (
          <div className="flex flex-col gap-3" aria-label="Loading habits">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : habits.isError ? (
          <LoadError error={habits.error} onRetry={() => void habits.refetch()} />
        ) : all.length === 0 ? (
          <EmptyState
            icon={ListChecksIcon}
            title="No habits yet"
            description="Add your first habit and tick it off here each day."
          >
            <Link to="/habits/new" className={buttonVariants({ variant: 'default' })}>
              <PlusIcon />
              Add habit
            </Link>
          </EmptyState>
        ) : (
          <>
            {scheduled.length > 0 ? (
              <ul className="flex flex-col gap-2" aria-label="Scheduled today">
                {scheduled.map((habit) => (
                  <li key={habit.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                    <HabitCheckButton
                      label={habit.title}
                      checked={habit.today.completed}
                      onToggle={() => toggle(habit)}
                    />
                    <Link
                      to={`/habits/${habit.id}`}
                      className="flex min-w-0 flex-1 flex-col rounded-md outline-none focus-visible:ring-3 focus-visible:ring-focus-ring"
                    >
                      <span
                        className={
                          habit.today.completed ? 'truncate text-muted-foreground line-through' : 'truncate font-medium'
                        }
                      >
                        {habit.title}
                      </span>
                      <span className="text-[13px] text-muted-foreground">{scheduleLabel(habit)}</span>
                    </Link>
                    <StreakBadge frequency={habit.frequency} streak={habit.currentStreak} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                Nothing scheduled today. Enjoy the rest day.
              </p>
            )}

            {unscheduled.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] font-medium text-muted-foreground">Not scheduled today</p>
                <ul className="flex flex-wrap gap-2" aria-label="Not scheduled today">
                  {unscheduled.map((habit) => (
                    <li key={habit.id}>
                      <Link
                        to={`/habits/${habit.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground hover:text-foreground"
                      >
                        {habit.title} · {scheduleLabel(habit)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CheckInCard() {
  const today = useToday()
  const checkIn = useCheckIn(today)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section-title">Daily check-in</CardTitle>
        <CardDescription>How are you feeling today?</CardDescription>
      </CardHeader>
      <CardContent>
        {checkIn.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : checkIn.isError ? (
          <LoadError error={checkIn.error} onRetry={() => void checkIn.refetch()} />
        ) : checkIn.data ? (
          <CheckInSummary checkIn={checkIn.data} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-primary-soft px-4 py-4">
            <div className="flex items-center gap-3">
              <SmilePlusIcon className="size-6 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm">
                <span className="font-medium">You haven't checked in today.</span>{' '}
                <span className="text-muted-foreground">It takes 20 seconds.</span>
              </p>
            </div>
            <Link to="/check-ins" className={buttonVariants({ variant: 'default' })}>
              Check in
              <ChevronRightIcon />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CheckInSummary({ checkIn }: { checkIn: CheckIn }) {
  const MoodIcon = checkIn.mood ? MOOD_ICONS[checkIn.mood - 1] : null
  const items = [
    { label: 'Mood', value: checkIn.mood && METRIC_META.mood.scaleLabels?.[checkIn.mood - 1] },
    { label: 'Energy', value: checkIn.energy && `${checkIn.energy} / 5` },
    { label: 'Stress', value: checkIn.stressLevel && `${checkIn.stressLevel} / 5` },
    { label: 'Sleep', value: checkIn.sleepHours != null && `${checkIn.sleepHours} h` },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {MoodIcon ? <MoodIcon className={`size-8 ${MOOD_COLORS[checkIn.mood! - 1]}`} aria-hidden="true" /> : null}
        <p className="text-sm font-medium">Checked in today</p>
        <Link
          to="/check-ins"
          className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'ml-auto' })}
          aria-label="Edit today's check-in"
        >
          <PencilIcon />
          Edit
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-muted/60 px-3 py-2">
            <dt className="text-[12px] text-muted-foreground">{item.label}</dt>
            <dd className="text-sm font-medium">{item.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** The two newest pending recommendations; the rest live on /insights */
function SuggestionsCard() {
  const recommendations = useRecommendations('pending')
  const top = recommendations.data?.slice(0, 2) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section-title">Suggestions</CardTitle>
        <CardAction>
          <Link to="/insights" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            See all
            <ChevronRightIcon />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {recommendations.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : recommendations.isError ? (
          <LoadError error={recommendations.error} onRetry={() => void recommendations.refetch()} />
        ) : top.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suggestions right now. Keep logging and they'll show up here.</p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Suggestions">
            {top.map((item) => (
              <li key={item.id}>
                <RecommendationCard recommendation={item} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function StreakCard() {
  const habits = useHabits()
  const best = [...(habits.data ?? [])].sort((a, b) => b.currentStreak - a.currentStreak)[0]
  const streak = best?.currentStreak ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section-title">Your best streak</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-streak-soft text-streak">
          <FlameIcon className="size-7" aria-hidden="true" />
        </span>
        {best && streak > 0 ? (
          <div className="flex min-w-0 flex-col">
            <p className="font-heading text-3xl font-bold">{formatStreak(best.frequency, streak)}</p>
            <p className="truncate text-[13px] text-muted-foreground">{best.title}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Complete a habit to start a streak.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ProfileRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <dt className="w-24 shrink-0 text-sm text-muted-foreground sm:w-28">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium">{value}</dd>
    </div>
  )
}
