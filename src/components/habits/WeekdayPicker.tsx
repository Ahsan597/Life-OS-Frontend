import { WEEKDAYS } from '@/lib/habits'
import { cn } from '@/lib/utils'
import type { Weekday } from '@/types/habit'

interface WeekdayPickerProps {
  value: Weekday[]
  onChange: (days: Weekday[]) => void
  invalid?: boolean
}

/**
 * Mon–Sun toggle buttons; the value is always sorted 0 (Sun) – 6 (Sat) like the backend.
 * Render it inside a <fieldset> with a <legend>, which names the group.
 */
export function WeekdayPicker({ value, onChange, invalid }: WeekdayPickerProps) {
  const selected = new Set(value)

  function toggle(day: Weekday) {
    const next = new Set(selected)
    if (next.has(day)) next.delete(day)
    else next.add(day)
    onChange([...next].sort((a, b) => a - b))
  }

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEKDAYS.map((day) => {
        const on = selected.has(day.value)
        return (
          <button
            key={day.value}
            type="button"
            aria-pressed={on}
            aria-label={day.long}
            onClick={() => toggle(day.value)}
            className={cn(
              'h-10 cursor-pointer rounded-lg border text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-focus-ring',
              on
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
              invalid && !on && 'border-destructive/60',
            )}
          >
            {day.short}
          </button>
        )
      })}
    </div>
  )
}
