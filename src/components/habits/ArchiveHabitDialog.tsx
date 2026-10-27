import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useArchiveHabit } from '@/hooks/useHabits'

interface ArchiveHabitDialogProps {
  habit: { id: string; title: string } | null
  onOpenChange: (open: boolean) => void
  onArchived?: () => void
}

/** Archiving is a soft delete: history is kept and the habit can be restored */
export function ArchiveHabitDialog({ habit, onOpenChange, onArchived }: ArchiveHabitDialogProps) {
  const archive = useArchiveHabit()

  function confirm() {
    if (!habit) return
    archive.mutate(habit.id, {
      onSuccess: () => {
        toast.success(`Archived “${habit.title}”`)
        onOpenChange(false)
        onArchived?.()
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <Dialog open={habit !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive “{habit?.title}”?</DialogTitle>
          <DialogDescription>
            It leaves your daily list, but its history and streaks are kept. You can restore it any time from
            the archived habits.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={confirm} loading={archive.isPending}>
            Archive habit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
