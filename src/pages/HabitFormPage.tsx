import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { toApiError } from '@/api/client'
import { LoadError } from '@/components/common/LoadError'
import { PageHeader } from '@/components/common/PageHeader'
import { HabitForm } from '@/components/habits/HabitForm'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateHabit, useHabit, useUpdateHabit } from '@/hooks/useHabits'
import { HabitNotFound } from '@/pages/HabitDetailPage'

export function NewHabitPage() {
  const navigate = useNavigate()
  const create = useCreateHabit()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="New habit" back={{ to: '/habits', label: 'Habits' }} />
      <Card>
        <CardContent>
          <HabitForm
            submitLabel="Create habit"
            pending={create.isPending}
            onCancel={() => navigate(-1)}
            onSubmit={(payload) =>
              create.mutateAsync(payload).then((habit) => {
                toast.success(`Created “${habit.title}”`)
                navigate(`/habits/${habit.id}`)
              })
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

export function EditHabitPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const habit = useHabit(id)
  const update = useUpdateHabit()
  const status = habit.isError ? toApiError(habit.error).status : null

  if (status === 404 || status === 400) return <HabitNotFound />

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="Edit habit" back={{ to: `/habits/${id}`, label: habit.data?.title ?? 'Back' }} />
      {habit.isPending ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : habit.isError ? (
        <LoadError error={habit.error} onRetry={() => void habit.refetch()} />
      ) : (
        <Card>
          <CardContent>
            <HabitForm
              initial={habit.data}
              submitLabel="Save changes"
              pending={update.isPending}
              onCancel={() => navigate(`/habits/${id}`)}
              onSubmit={(patch) =>
                update.mutateAsync({ id, patch }).then(() => {
                  toast.success('Habit updated')
                  navigate(`/habits/${id}`)
                })
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
