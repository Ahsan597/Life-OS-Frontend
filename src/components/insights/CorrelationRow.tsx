import { correlationEffect, formatR, STRENGTH_LABELS, strengthEmphasis } from '@/lib/insights'
import { cn } from '@/lib/utils'
import type { Correlation, Strength } from '@/types/insights'

const EMPHASIS_CLASSES = {
  bold: 'bg-primary text-primary-foreground font-semibold',
  normal: 'bg-primary-soft text-primary font-medium',
  muted: 'bg-muted text-muted-foreground font-medium',
}

export function StrengthBadge({ strength }: { strength: Strength }) {
  const emphasis = strengthEmphasis(strength)
  return (
    <span
      data-strength={strength}
      data-emphasis={emphasis}
      className={cn('inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs whitespace-nowrap', EMPHASIS_CLASSES[emphasis])}
    >
      {STRENGTH_LABELS[strength]}
    </span>
  )
}

/** r on a −1…+1 track, filled from the centre; green where the metric helps, red where it hurts */
export function CorrelationBar({ correlation }: { correlation: Pick<Correlation, 'r' | 'direction' | 'strength'> }) {
  const { r } = correlation
  const effect = correlationEffect(correlation)
  const width = r === null ? 0 : Math.abs(r) * 50

  return (
    <div className="flex items-center gap-2">
      <div
        role="img"
        aria-label={r === null ? 'No correlation computed' : `r = ${formatR(r)}`}
        className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <span className="absolute inset-y-0 left-1/2 w-px bg-border" aria-hidden="true" />
        {width > 0 ? (
          <span
            data-testid="r-fill"
            data-effect={effect ?? 'none'}
            className={cn(
              'absolute inset-y-0',
              effect === 'helps' ? 'bg-success' : effect === 'hurts' ? 'bg-destructive' : 'bg-subtle',
            )}
            style={r! >= 0 ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
          />
        ) : null}
      </div>
      <span className="w-11 shrink-0 text-right text-[12px] text-muted-foreground tabular-nums">{formatR(r)}</span>
    </div>
  )
}
