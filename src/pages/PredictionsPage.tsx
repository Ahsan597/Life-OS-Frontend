import { CheckIcon, ChevronRightIcon, GaugeIcon, ListChecksIcon, SmilePlusIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalibrationChart } from '@/components/charts/CalibrationChart'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadError } from '@/components/common/LoadError'
import { PageHeader } from '@/components/common/PageHeader'
import { Segmented } from '@/components/common/Segmented'
import { StreakBadge } from '@/components/habits/StreakBadge'
import { FactorList, ProbabilityBar, RiskLevelChip } from '@/components/predictions/ForecastParts'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCheckIn } from '@/hooks/useCheckIns'
import { usePredictionAccuracy, useStreakRisk } from '@/hooks/usePredictions'
import { formatWeekdayDayMonth } from '@/lib/dates'
import {
  ACCURACY_RANGES,
  accuracyRange,
  formatPercent,
  headlineLevels,
  RISK_LEVEL_LABELS,
  targetLabel,
  type AccuracyRangeDays,
} from '@/lib/predictions'
import { cn } from '@/lib/utils'
import type { Forecast, PredictionAccuracy } from '@/types/predictions'

const DEFAULT_ACCURACY_RANGE: AccuracyRangeDays = 30

export function PredictionsPage() {
  const streakRisk = useStreakRisk()
  const date = streakRisk.data?.date

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={date ? `Forecasts for ${formatWeekdayDayMonth(date)}` : 'Forecasts'}
        description="Based on your recent logs, weekday patterns and today's check-in. These are tendencies, not certainties."
      />

      {streakRisk.isPending ? (
        <div className="grid gap-4 md:grid-cols-2" aria-label="Loading forecasts">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : streakRisk.isError ? (
        <LoadError error={streakRisk.error} onRetry={() => void streakRisk.refetch()} />
      ) : (
        <>
          <CheckInNudge date={streakRisk.data.date} forecasts={streakRisk.data.habits} />
          <RiskOverview date={streakRisk.data.date} forecasts={streakRisk.data.habits} />
          <AccuracySection date={streakRisk.data.date} />
        </>
      )}
    </div>
  )
}

/** Shown when today's check-in is missing and no forecast uses one yet */
function CheckInNudge({ date, forecasts }: { date: string; forecasts: Forecast[] }) {
  const usesCheckIn = forecasts.some((forecast) => forecast.factors.some((factor) => factor.factor === 'checkin'))
  const checkIn = useCheckIn(date, { enabled: !usesCheckIn })
  if (usesCheckIn || checkIn.data !== null) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-primary-soft px-4 py-4">
      <div className="flex items-center gap-3">
        <SmilePlusIcon className="size-6 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium">Do today's check-in to sharpen today's forecasts.</p>
      </div>
      <Link to="/check-ins" className={buttonVariants()}>
        Check in
        <ChevronRightIcon />
      </Link>
    </div>
  )
}

function RiskOverview({ date, forecasts }: { date: string; forecasts: Forecast[] }) {
  const ready = forecasts.filter((forecast) => forecast.riskLevel !== 'insufficient_data')
  const learning = forecasts.filter((forecast) => forecast.riskLevel === 'insufficient_data')

  if (forecasts.length === 0) {
    return (
      <EmptyState icon={ListChecksIcon} title="No habits to forecast" description="Add a habit and log it for a few days to see forecasts here.">
        <Link to="/habits/new" className={buttonVariants({ variant: 'secondary' })}>
          Add habit
        </Link>
      </EmptyState>
    )
  }

  return (
    <section aria-labelledby="risk-heading" className="flex flex-col gap-4">
      <h2 id="risk-heading" className="text-section-title">
        Streak risk
      </h2>
      {ready.length > 0 ? (
        // API order: riskiest first.
        <ul className="grid gap-4 md:grid-cols-2" aria-label="Forecasts">
          {ready.map((forecast) => (
            <li key={forecast.habitId}>
              <ForecastCard forecast={forecast} date={date} />
            </li>
          ))}
        </ul>
      ) : null}
      {learning.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">Still learning</h3>
          <ul className="grid gap-3 md:grid-cols-2" aria-label="Still learning">
            {learning.map((forecast) => (
              <li key={forecast.habitId} className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
                <Link
                  to={`/habits/${forecast.habitId}`}
                  className="min-w-0 flex-1 truncate rounded-md text-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-focus-ring"
                >
                  {forecast.title}
                </Link>
                <span className="text-[13px] text-muted-foreground">Not enough history yet</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function ForecastCard({ forecast, date }: { forecast: Forecast; date: string }) {
  const [top, rest] = [forecast.factors.slice(0, 2), forecast.factors.slice(2)]

  return (
    <Card className="h-full gap-3 py-4" aria-label={forecast.title} role="article">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <Link
            to={`/habits/${forecast.habitId}`}
            className="min-w-0 flex-1 rounded-md font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-focus-ring"
          >
            {forecast.title}
          </Link>
          <RiskLevelChip level={forecast.riskLevel} label={RISK_LEVEL_LABELS[forecast.riskLevel]} />
        </div>
        <ProbabilityBar value={forecast.completionProbability} label={`Chance “${forecast.title}” gets done`} />
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          <span>
            For <span className="font-medium text-foreground">{targetLabel(forecast, date)}</span>
          </span>
          <StreakBadge frequency={forecast.frequency} streak={forecast.currentStreak} />
        </div>
        <FactorList factors={top} />
        {rest.length > 0 ? (
          <details className="text-[13px]">
            <summary className="w-fit cursor-pointer rounded-md font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-focus-ring">
              Why? All {forecast.factors.length} reasons
            </summary>
            <FactorList factors={rest} className="mt-1.5" />
          </details>
        ) : null}
      </CardContent>
    </Card>
  )
}

function AccuracySection({ date }: { date: string }) {
  const [params, setParams] = useSearchParams()
  const days: AccuracyRangeDays = ACCURACY_RANGES.find((n) => String(n) === params.get('days')) ?? DEFAULT_ACCURACY_RANGE
  const accuracy = usePredictionAccuracy(accuracyRange(date, days))

  return (
    <section aria-labelledby="accuracy-heading">
      <Card>
        <CardHeader>
          <CardTitle className="text-section-title">
            <h2 id="accuracy-heading">How accurate are these?</h2>
          </CardTitle>
          <CardDescription>Past forecasts, replayed with only what was known at the time, then checked against what happened.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Segmented
            label="Accuracy range"
            value={days}
            options={ACCURACY_RANGES.map((n) => ({ value: n, label: `Last ${n} days` }))}
            onChange={(n) => setParams(n === DEFAULT_ACCURACY_RANGE ? {} : { days: String(n) }, { replace: true })}
          />
          {accuracy.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : accuracy.isError ? (
            <LoadError error={accuracy.error} onRetry={() => void accuracy.refetch()} />
          ) : accuracy.data.evaluated === 0 ? (
            <EmptyState
              icon={GaugeIcon}
              title="Nothing to score yet"
              description="Keep logging for a week or two and we'll show how accurate these forecasts are."
            />
          ) : (
            <div className={cn('flex flex-col gap-5 transition-opacity', accuracy.isPlaceholderData && 'opacity-60')}>
              <AccuracyReport accuracy={accuracy.data} />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function AccuracyReport({ accuracy }: { accuracy: PredictionAccuracy }) {
  const { high, low } = headlineLevels(accuracy.byRiskLevel)

  return (
    <>
      {high || low ? (
        <p className="text-lg" data-testid="accuracy-headline">
          {high ? (
            <>
              When we said <strong>high risk</strong>, you missed <strong>{formatPercent(high.observedMissRate)}</strong> of
              the time.{' '}
            </>
          ) : null}
          {low ? (
            <>
              When we said <strong>low risk</strong>, you missed <strong>{formatPercent(low.observedMissRate)}</strong>.
            </>
          ) : null}
        </p>
      ) : null}

      <CalibrationChart buckets={accuracy.calibration} />

      {accuracy.brierScore !== null ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Accuracy score: Brier {accuracy.brierScore.toFixed(2)} (lower is better
            {accuracy.baselineBrierScore !== null
              ? `; guessing your average scores ${accuracy.baselineBrierScore.toFixed(2)}`
              : ''}
            )
          </span>
          {accuracy.brierSkillScore !== null && accuracy.brierSkillScore > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[12px] font-medium text-success">
              <CheckIcon className="size-3.5" aria-hidden="true" />
              Beats guessing
            </span>
          ) : null}
        </p>
      ) : null}

      <p className="text-[12px] text-subtle">
        {accuracy.evaluated} forecasts checked · Model {accuracy.modelVersion}
      </p>
    </>
  )
}
