import { METRIC_META, MOOD_COLORS, MOOD_ICONS } from '@/lib/checkIns'
import { cn } from '@/lib/utils'

interface ScalePickerProps {
  metric: 'mood' | 'energy' | 'stressLevel'
  value: number | null
  onChange: (value: number | null) => void
}

/** Five toggle buttons; pressing the selected one again clears it (every metric is optional) */
export function ScalePicker({ metric, value, onChange }: ScalePickerProps) {
  const { label, scaleLabels = [] } = METRIC_META[metric]

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex w-full items-baseline justify-between text-sm leading-5 font-medium">
        <span>{label}</span>
        <span className="text-[13px] font-normal text-muted-foreground" aria-live="polite">
          {value ? scaleLabels[value - 1] : 'Not set'}
        </span>
      </legend>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n
          const Icon = MOOD_ICONS[n - 1]
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              aria-label={`${label} ${n}: ${scaleLabels[n - 1]}`}
              title={scaleLabels[n - 1]}
              onClick={() => onChange(selected ? null : n)}
              className={cn(
                'flex h-12 cursor-pointer items-center justify-center rounded-xl border text-base font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-focus-ring active:scale-95',
                selected
                  ? 'border-primary bg-primary-soft text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {metric === 'mood' ? (
                <Icon className={cn('size-6', selected ? MOOD_COLORS[n - 1] : '')} aria-hidden="true" />
              ) : (
                n
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
