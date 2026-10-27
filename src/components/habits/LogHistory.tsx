import { CircleCheckIcon, CircleDashedIcon, NotebookPenIcon, PencilIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateLog } from '@/hooks/useHabits'
import { formatRelativeDay } from '@/lib/dates'
import { NOTE_MAX } from '@/lib/validation'
import type { HabitLog } from '@/types/habit'

interface LogHistoryProps {
  logs: HabitLog[]
  today: string
  /** Archived habits are read-only */
  readOnly?: boolean
}

export function LogHistory({ logs, today, readOnly }: LogHistoryProps) {
  const newestFirst = [...logs].sort((a, b) => b.date.localeCompare(a.date))

  if (newestFirst.length === 0) {
    return (
      <EmptyState
        icon={NotebookPenIcon}
        title="No logs yet"
        description="Tick the habit off on a day and it shows up here, with room for a note."
      />
    )
  }

  return (
    <ul className="flex flex-col divide-y" aria-label="Log history">
      {newestFirst.map((log) => (
        <LogRow key={log.id} log={log} today={today} readOnly={readOnly} />
      ))}
    </ul>
  )
}

function LogRow({ log, today, readOnly }: { log: HabitLog; today: string; readOnly?: boolean }) {
  const updateLog = useUpdateLog()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(log.note ?? '')
  const day = formatRelativeDay(log.date, today)
  const optimistic = log.id.startsWith('optimistic-')

  function save() {
    updateLog.mutate(
      { logId: log.id, note: draft.trim() || null },
      {
        onSuccess: () => {
          setEditing(false)
          toast.success('Note saved')
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        {log.completed ? (
          <CircleCheckIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <CircleDashedIcon className="size-5 shrink-0 text-subtle" aria-hidden="true" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">{day}</span>
          <span className="text-[13px] text-muted-foreground">{log.completed ? 'Done' : 'Not done'}</span>
        </div>
        {!readOnly && !editing && !optimistic ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(log.note ?? '')
              setEditing(true)
            }}
            aria-label={`${log.note ? 'Edit' : 'Add'} note for ${day}`}
          >
            <PencilIcon />
            {log.note ? 'Edit note' : 'Add note'}
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 pl-8">
          <Textarea
            aria-label={`Note for ${day}`}
            autoFocus
            value={draft}
            maxLength={NOTE_MAX}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} loading={updateLog.isPending}>
              Save note
            </Button>
          </div>
        </div>
      ) : log.note ? (
        <p className="pl-8 text-sm whitespace-pre-line text-muted-foreground">{log.note}</p>
      ) : null}
    </li>
  )
}
