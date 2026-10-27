import { ArrowDownIcon, ArrowUpIcon, CircleCheckIcon, EyeIcon, HourglassIcon, TriangleAlertIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { formatPercent, missChanceLabel, RISK_LEVEL_LABELS, riskBadgeKind } from '@/lib/predictions'
import { cn } from '@/lib/utils'
import type { Forecast, ForecastFactor, RiskLevel } from '@/types/predictions'

/** ↑ red raises the risk, ↓ green lowers it; `detail` is shown as written */
export function FactorList({ factors, className }: { factors: ForecastFactor[]; className?: string }) {
  if (factors.length === 0) return null
  return (
    <ul className={cn('flex flex-col gap-1.5', className)} aria-label="Reasons">
      {factors.map((factor) => {
        const raises = factor.effect === 'raises_risk'
        const Icon = raises ? ArrowUpIcon : ArrowDownIcon
        return (
          <li key={`${factor.factor}-${factor.metric ?? ''}`} className="flex items-start gap-2 text-[13px]" data-effect={factor.effect}>
            <Icon className={cn('mt-0.5 size-3.5 shrink-0', raises ? 'text-destructive' : 'text-success')} aria-hidden="true" />
            <span>
              <span className="sr-only">{raises ? 'Raises risk: ' : 'Lowers risk: '}</span>
              {factor.detail}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

const LEVEL_STYLES: Record<RiskLevel, { className: string; icon: typeof TriangleAlertIcon }> = {
  high: { className: 'bg-destructive-soft text-destructive', icon: TriangleAlertIcon },
  medium: { className: 'bg-warning/10 text-warning', icon: EyeIcon },
  low: { className: 'bg-success/10 text-success', icon: CircleCheckIcon },
  insufficient_data: { className: 'bg-muted text-muted-foreground', icon: HourglassIcon },
}

/** Static chip for a forecast's risk level (icon + text, never colour alone) */
export function RiskLevelChip({ level, label }: { level: RiskLevel; label?: string }) {
  const { className, icon: Icon } = LEVEL_STYLES[level]
  return (
    <span
      data-risk={level}
      className={cn('inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-medium whitespace-nowrap', className)}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? (level === 'low' ? 'On track' : RISK_LEVEL_LABELS[level])}
    </span>
  )
}

/**
 * "At risk" / "Watch" badge on a habit card. Opens a popover (click, tap or keyboard)
 * with the miss chance and the reasons. Renders nothing when today is safe.
 */
export function RiskBadge({ forecast, today, doneToday = false }: { forecast: Forecast | undefined; today: string; doneToday?: boolean }) {
  const kind = riskBadgeKind(forecast, { doneToday })
  if (!forecast || !kind) return null

  const atRisk = kind === 'at_risk'
  const Icon = atRisk ? TriangleAlertIcon : EyeIcon
  const text = atRisk ? (forecast.currentStreak > 0 ? `🔥 ${forecast.currentStreak} at risk` : 'At risk') : 'Watch'

  return (
    <Popover>
      <PopoverTrigger
        data-risk-badge={kind}
        aria-label={`${atRisk ? 'At risk' : 'Watch'}: ${forecast.title}. Show why`}
        className={cn(
          'inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 text-[12px] font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-focus-ring',
          atRisk ? 'bg-destructive-soft text-destructive' : 'bg-warning/10 text-warning',
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {text}
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex flex-col gap-2">
          <PopoverTitle>{missChanceLabel(forecast, today)}</PopoverTitle>
          <p className="text-[12px] text-muted-foreground">Based on your recent pattern.</p>
          <FactorList factors={forecast.factors} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** completionProbability as a 0–100% bar */
export function ProbabilityBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={`${formatPercent(value)} likely to get done`}
        className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <span className="block h-full rounded-full bg-primary" style={{ width: `${value * 100}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-[13px] font-medium tabular-nums">{formatPercent(value)}</span>
    </div>
  )
}
