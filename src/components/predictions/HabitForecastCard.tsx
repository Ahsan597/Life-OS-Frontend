import { HourglassIcon } from 'lucide-react'
import { LoadError } from '@/components/common/LoadError'
import { FactorList, RiskLevelChip } from '@/components/predictions/ForecastParts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useStreakRisk } from '@/hooks/usePredictions'
import { CONFIDENCE_LABELS, formatPercent, targetPhrase } from '@/lib/predictions'

/** The habit detail page's forecast, joined from the shared streak-risk query */
export function HabitForecastCard({ habitId }: { habitId: string }) {
  const streakRisk = useStreakRisk()
  const forecast = streakRisk.byHabit.get(habitId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section-title">
          <h2>Forecast</h2>
        </CardTitle>
        <CardDescription>A tendency from your recent pattern, not a certainty.</CardDescription>
      </CardHeader>
      <CardContent>
        {streakRisk.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : streakRisk.isError ? (
          <LoadError error={streakRisk.error} onRetry={() => void streakRisk.refetch()} />
        ) : !forecast || forecast.riskLevel === 'insufficient_data' ? (
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
            <HourglassIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Log this habit for a few more days to unlock forecasts.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-heading text-4xl font-bold tabular-nums">
                  {formatPercent(forecast.completionProbability)}
                </span>
                <span className="text-muted-foreground">
                  likely to get done {targetPhrase(forecast, streakRisk.data.date)}
                </span>
              </p>
              <div className="flex flex-col items-end gap-1">
                <RiskLevelChip level={forecast.riskLevel} />
                <span className="text-[12px] text-muted-foreground">{CONFIDENCE_LABELS[forecast.confidence]}</span>
              </div>
            </div>
            <FactorList factors={forecast.factors} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
