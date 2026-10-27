import { DAY_STATUS_LABELS, WEEKDAYS, type DayStatus, type HeatmapCell } from '@/lib/habits'
import { formatWeekdayDayMonth } from '@/lib/dates'
import { cn } from '@/lib/utils'

const STATUS_CLASSES: Record<DayStatus, string> = {
  done: 'bg-primary',
  missed: 'bg-destructive-soft border border-destructive/40',
  unscheduled: 'bg-muted',
  pending: 'bg-card border border-dashed border-muted-foreground/60',
  future: '',
}

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' })

interface CalendarHeatmapProps {
  /** Week columns (Mon–Sun), oldest first — from buildHeatmap() */
  weeks: HeatmapCell[][]
  /** Toggles a past day; omit for read-only (e.g. archived habits) */
  onToggle?: (cell: HeatmapCell) => void
  disabled?: boolean
}

export function CalendarHeatmap({ weeks, onToggle, disabled }: CalendarHeatmapProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto pb-1">
        <div className="inline-grid grid-flow-col grid-rows-[auto_repeat(7,1fr)] gap-1">
          {/* Weekday labels */}
          <span />
          {WEEKDAYS.map((day, i) => (
            <span key={day.value} className="pr-1.5 text-[11px] leading-4 text-muted-foreground">
              {i % 2 === 0 ? day.short : ''}
            </span>
          ))}

          {weeks.map((week, w) => {
            const month = MONTH.format(new Date(`${week[0].date}T00:00:00Z`))
            const previous = w > 0 ? MONTH.format(new Date(`${weeks[w - 1][0].date}T00:00:00Z`)) : null
            return [
              <span key={`m-${week[0].date}`} className="h-4 text-[11px] leading-4 whitespace-nowrap text-muted-foreground">
                {month !== previous ? month : ''}
              </span>,
              ...week.map((cell) => <Cell key={cell.date} cell={cell} onToggle={onToggle} disabled={disabled} />),
            ]
          })}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground" aria-label="Legend">
        {(['done', 'missed', 'unscheduled'] as const).map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span className={cn('size-3 rounded-[3px]', STATUS_CLASSES[status])} aria-hidden="true" />
            {DAY_STATUS_LABELS[status]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-card ring-2 ring-foreground" aria-hidden="true" />
          Today
        </li>
      </ul>
    </div>
  )
}

function Cell({ cell, onToggle, disabled }: { cell: HeatmapCell; onToggle?: CalendarHeatmapProps['onToggle']; disabled?: boolean }) {
  const base = 'size-4 rounded-[4px] sm:size-4.5'

  // Future days can't be logged, so they render as empty space.
  if (cell.status === 'future') return <span className={base} aria-hidden="true" />

  const label = `${cell.isToday ? 'Today, ' : ''}${formatWeekdayDayMonth(cell.date)}: ${DAY_STATUS_LABELS[cell.status]}`
  const className = cn(
    base,
    STATUS_CLASSES[cell.status],
    cell.isToday && 'ring-2 ring-foreground ring-offset-1 ring-offset-card',
  )

  if (!onToggle) return <span role="img" aria-label={label} title={label} className={className} />

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={cell.status === 'done'}
      title={`${label} · click to ${cell.status === 'done' ? 'undo' : 'mark done'}`}
      disabled={disabled}
      onClick={() => onToggle(cell)}
      className={cn(
        className,
        'cursor-pointer transition-transform duration-100 outline-none hover:scale-115 focus-visible:ring-3 focus-visible:ring-focus-ring disabled:cursor-wait',
      )}
    />
  )
}
