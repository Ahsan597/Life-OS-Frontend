import { ArchiveIcon, ArchiveRestoreIcon, ListChecksIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadError } from '@/components/common/LoadError'
import { PageHeader } from '@/components/common/PageHeader'
import { ArchiveHabitDialog } from '@/components/habits/ArchiveHabitDialog'
import { StreakBadge } from '@/components/habits/StreakBadge'
import { RiskBadge } from '@/components/predictions/ForecastParts'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHabits, useUpdateHabit } from '@/hooks/useHabits'
import { useStreakRisk } from '@/hooks/usePredictions'
import { scheduleLabel } from '@/lib/habits'
import type { Habit } from '@/types/habit'

export function HabitsPage() {
  const [params, setParams] = useSearchParams()
  const showArchived = params.get('archived') === '1'
  const habits = useHabits(showArchived)
  const [archiving, setArchiving] = useState<Habit | null>(null)

  const active = habits.data?.filter((habit) => habit.isActive) ?? []
  const archived = habits.data?.filter((habit) => !habit.isActive) ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Habits"
        description="The routines you're building, and how they're going."
        actions={
          <Link to="/habits/new" className={buttonVariants()}>
            <PlusIcon />
            New habit
          </Link>
        }
      />

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={showArchived}
          onChange={(e) => setParams(e.target.checked ? { archived: '1' } : {}, { replace: true })}
        />
        Show archived
      </label>

      {habits.isPending ? (
        <div className="flex flex-col gap-3" aria-label="Loading habits">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : habits.isError ? (
        <LoadError error={habits.error} onRetry={() => void habits.refetch()} />
      ) : (
        <>
          {active.length === 0 ? (
            <EmptyState
              icon={ListChecksIcon}
              title="No active habits"
              description="Start small: one habit you can do even on a busy day."
            >
              <Link to="/habits/new" className={buttonVariants({ variant: 'secondary' })}>
                <PlusIcon />
                Create a habit
              </Link>
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Active habits">
              {active.map((habit) => (
                <HabitRow key={habit.id} habit={habit} onArchive={() => setArchiving(habit)} />
              ))}
            </ul>
          )}

          {showArchived ? (
            <section className="flex flex-col gap-3" aria-labelledby="archived-heading">
              <h2 id="archived-heading" className="text-section-title">
                Archived
              </h2>
              {archived.length === 0 ? (
                <p className="text-sm text-muted-foreground">No archived habits.</p>
              ) : (
                <ul className="flex flex-col gap-3" aria-label="Archived habits">
                  {archived.map((habit) => (
                    <HabitRow key={habit.id} habit={habit} />
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      )}

      <ArchiveHabitDialog habit={archiving} onOpenChange={(open) => !open && setArchiving(null)} />
    </div>
  )
}

function HabitRow({ habit, onArchive }: { habit: Habit; onArchive?: () => void }) {
  const update = useUpdateHabit()
  // One shared streak-risk query for the whole list, joined here by id.
  const { byHabit } = useStreakRisk()

  function restore() {
    update.mutate(
      { id: habit.id, patch: { isActive: true } },
      {
        onSuccess: () => toast.success(`Restored “${habit.title}”`),
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <li>
      <Card className="gap-0 py-4">
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link
            to={`/habits/${habit.id}`}
            className="flex min-w-0 flex-1 basis-56 flex-col rounded-md outline-none focus-visible:ring-3 focus-visible:ring-focus-ring"
          >
            <span className="flex items-center gap-2">
              <span className="truncate font-medium">{habit.title}</span>
              {habit.isActive ? null : <Badge variant="outline">Archived</Badge>}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {scheduleLabel(habit)}
              {habit.isActive && habit.today.scheduled
                ? habit.today.completed
                  ? ' · Done today'
                  : ' · Not done today'
                : ''}
            </span>
          </Link>
          {habit.isActive ? (
            <RiskBadge forecast={byHabit.get(habit.id)} today={habit.today.date} doneToday={habit.today.completed} />
          ) : null}
          <StreakBadge frequency={habit.frequency} streak={habit.currentStreak} />
          <div className="flex gap-1">
            {habit.isActive ? (
              <>
                <Link
                  to={`/habits/${habit.id}/edit`}
                  className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                  aria-label={`Edit ${habit.title}`}
                  title="Edit"
                >
                  <PencilIcon />
                </Link>
                <Button variant="ghost" size="icon-sm" onClick={onArchive} aria-label={`Archive ${habit.title}`} title="Archive">
                  <ArchiveIcon />
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={restore} loading={update.isPending}>
                <ArchiveRestoreIcon />
                Restore
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  )
}
