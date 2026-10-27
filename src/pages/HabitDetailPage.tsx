import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CircleAlertIcon,
  FlameIcon,
  PencilIcon,
  SearchXIcon,
  TargetIcon,
  TrophyIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { toApiError } from '@/api/client'
import { WeeklyRateChart } from '@/components/charts/WeeklyRateChart'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadError } from '@/components/common/LoadError'
import { PageHeader } from '@/components/common/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { ArchiveHabitDialog } from '@/components/habits/ArchiveHabitDialog'
import { CalendarHeatmap } from '@/components/habits/CalendarHeatmap'
import { LogHistory } from '@/components/habits/LogHistory'
import { RecommendationCard } from '@/components/insights/RecommendationCard'
import { HabitForecastCard } from '@/components/predictions/HabitForecastCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHabit, useHabitLogs, useHabitStats, useLogHabit, useUpdateHabit } from '@/hooks/useHabits'
import { useRecommendations } from '@/hooks/useInsights'
import { addDays, weekStart } from '@/lib/dates'
import { buildHeatmap, formatRate, habitStartDate, scheduleLabel, streakUnit, type HeatmapCell } from '@/lib/habits'
import { useAuthStore } from '@/store/authStore'
import type { Habit } from '@/types/habit'

/** Weeks shown in the calendar; tiles and the weekly chart cover the same range */
const HEATMAP_WEEKS = 12

export function HabitDetailPage() {
  const { id = '' } = useParams()
  const habit = useHabit(id)
  const status = habit.isError ? toApiError(habit.error).status : null

  // A malformed id is a 400 from the backend; treat it like a missing habit.
  if (status === 404 || status === 400) return <HabitNotFound />
  if (habit.isError) return <LoadError error={habit.error} onRetry={() => void habit.refetch()} />
  if (habit.isPending) return <DetailSkeleton />

  return <HabitDetail habit={habit.data} />
}

function HabitDetail({ habit }: { habit: Habit }) {
  const navigate = useNavigate()
  const timeZone = useAuthStore((state) => state.user?.timezone ?? 'UTC')
  const today = habit.today.date
  const rangeFrom = addDays(weekStart(today), -7 * (HEATMAP_WEEKS - 1))
  const range = { from: rangeFrom, to: today }

  const logs = useHabitLogs(habit.id)
  const stats = useHabitStats(habit.id, range)
  const logHabit = useLogHabit()
  const restore = useUpdateHabit()
  const recommendations = useRecommendations('pending')
  const habitRecommendations = recommendations.data?.filter((item) => item.habitId === habit.id) ?? []
  const [archiving, setArchiving] = useState(false)

  const heatmap = logs.data
    ? buildHeatmap(habit, logs.data, { today, start: habitStartDate(habit, logs.data, timeZone), weeks: HEATMAP_WEEKS })
    : null

  function toggleDay(cell: HeatmapCell) {
    logHabit.mutate({ habitId: habit.id, date: cell.date, completed: cell.status !== 'done' })
  }

  function restoreHabit() {
    restore.mutate(
      { id: habit.id, patch: { isActive: true } },
      {
        onSuccess: () => toast.success(`Restored “${habit.title}”`),
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: '/habits', label: 'Habits' }}
        title={habit.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{scheduleLabel(habit)}</Badge>
            {habit.isActive ? null : <Badge variant="destructive">Archived</Badge>}
          </span>
        }
        actions={
          habit.isActive ? (
            <>
              <Link to={`/habits/${habit.id}/edit`} className={buttonVariants({ variant: 'secondary' })}>
                <PencilIcon />
                Edit
              </Link>
              <Button variant="secondary" onClick={() => setArchiving(true)}>
                <ArchiveIcon />
                Archive
              </Button>
            </>
          ) : null
        }
      />

      {habit.description ? <p className="max-w-3xl whitespace-pre-line">{habit.description}</p> : null}

      {habitRecommendations.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-label="Suggestions for this habit">
          {habitRecommendations.map((item) => (
            <li key={item.id}>
              <RecommendationCard recommendation={item} showHabit={false} />
            </li>
          ))}
        </ul>
      ) : null}

      {habit.isActive ? null : (
        <Alert>
          <CircleAlertIcon />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>This habit is archived. Its history is kept, but you can't log it until you restore it.</span>
            <Button size="sm" onClick={restoreHabit} loading={restore.isPending}>
              <ArchiveRestoreIcon />
              Restore
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Current streak"
          value={habit.currentStreak}
          unit={streakUnit(habit.frequency, habit.currentStreak)}
          icon={FlameIcon}
          iconClassName="bg-streak-soft text-streak"
        />
        <StatTile
          label="Longest streak"
          value={habit.longestStreak}
          unit={streakUnit(habit.frequency, habit.longestStreak)}
          icon={TrophyIcon}
          iconClassName="bg-streak-soft text-streak"
        />
        <StatTile
          label={`Completion, last ${HEATMAP_WEEKS} weeks`}
          value={stats.data ? formatRate(stats.data.completionRate) : '…'}
          hint={stats.data ? `${stats.data.completed} of ${stats.data.scheduled} ${scheduledUnit(habit)}` : null}
          icon={TargetIcon}
        />
      </div>

      {habit.isActive ? <HabitForecastCard habitId={habit.id} /> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-section-title">Calendar</CardTitle>
            <CardDescription>
              {habit.isActive ? 'Tap a past day to mark it done or undo it.' : `The last ${HEATMAP_WEEKS} weeks.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.isError ? (
              <LoadError error={logs.error} onRetry={() => void logs.refetch()} />
            ) : heatmap ? (
              <CalendarHeatmap weeks={heatmap} onToggle={habit.isActive ? toggleDay : undefined} />
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-section-title">Weekly completion rate</CardTitle>
            <CardDescription>Share of scheduled {scheduledUnit(habit)} done each week (Mon–Sun).</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isError ? (
              <LoadError error={stats.error} onRetry={() => void stats.refetch()} />
            ) : !stats.data ? (
              <Skeleton className="h-44 w-full" />
            ) : stats.data.weekly.length === 0 ? (
              <EmptyState
                icon={TargetIcon}
                title="Nothing to chart yet"
                description="Weeks appear here once one has finished or something has been logged."
              />
            ) : (
              <WeeklyRateChart weeks={stats.data.weekly} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-section-title">Log history</CardTitle>
          <CardDescription>Every day you've logged, with notes.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.isError ? null : logs.data ? (
            <LogHistory logs={logs.data} today={today} readOnly={!habit.isActive} />
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
        </CardContent>
      </Card>

      <ArchiveHabitDialog
        habit={archiving ? habit : null}
        onOpenChange={setArchiving}
        onArchived={() => navigate('/habits')}
      />
    </div>
  )
}

function scheduledUnit(habit: Pick<Habit, 'frequency'>) {
  return habit.frequency === 'weekly' ? 'weeks' : 'days'
}

export function HabitNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 pt-12">
      <EmptyState
        icon={SearchXIcon}
        title="Habit not found"
        description="It may have been removed, or the link is wrong."
      >
        <Link to="/habits" className={buttonVariants({ variant: 'secondary' })}>
          Back to habits
        </Link>
      </EmptyState>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading habit">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
