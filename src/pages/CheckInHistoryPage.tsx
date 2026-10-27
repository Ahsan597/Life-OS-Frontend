import { ChevronRightIcon, LineChartIcon, MinusIcon, SmilePlusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadError } from '@/components/common/LoadError'
import { PageHeader } from '@/components/common/PageHeader'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCheckIns, useCheckInStats } from '@/hooks/useCheckIns'
import { useToday } from '@/hooks/useToday'
import { METRIC_META, METRICS, MOOD_COLORS, MOOD_ICONS, dailySeries, metricDomain, trendLabel, trendTone } from '@/lib/checkIns'
import { addDays, formatRelativeDay } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { CheckIn, CheckInStats, Metric, MetricStats } from '@/types/checkIn'

const RANGES = [7, 30, 90] as const
type RangeDays = (typeof RANGES)[number]

export function CheckInHistoryPage() {
  const today = useToday()
  const [params, setParams] = useSearchParams()
  const days: RangeDays = RANGES.find((n) => String(n) === params.get('days')) ?? 30
  const range = { from: addDays(today, -(days - 1)), to: today }

  const stats = useCheckInStats(range)
  const list = useCheckIns(range)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Check-in history"
        description="How your mood, energy, stress and sleep are trending."
        actions={
          <Link to="/check-ins" className={buttonVariants()}>
            <SmilePlusIcon />
            Check in
          </Link>
        }
      />

      {/* Filters sit in one row above everything they scope. */}
      <div role="group" aria-label="Date range" className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {RANGES.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={n === days}
            onClick={() => setParams(n === 30 ? {} : { days: String(n) }, { replace: true })}
            className={cn(
              'h-8 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-focus-ring',
              n === days ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Last {n} days
          </button>
        ))}
      </div>

      {stats.isPending ? (
        <div className="grid gap-6 md:grid-cols-2" aria-label="Loading trends">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : stats.isError ? (
        <LoadError error={stats.error} onRetry={() => void stats.refetch()} />
      ) : stats.data.daysCheckedIn === 0 ? (
        <EmptyState
          icon={LineChartIcon}
          title={`No check-ins in the last ${days} days`}
          description="Check in for a few days and your trends will show up here."
        >
          <Link to="/check-ins" className={buttonVariants({ variant: 'secondary' })}>
            Check in now
          </Link>
        </EmptyState>
      ) : (
        // Refetching a new range keeps the previous charts on screen, dimmed.
        <div className={cn('flex flex-col gap-6 transition-opacity', stats.isPlaceholderData && 'opacity-60')}>
          <p className="text-sm text-muted-foreground">
            Checked in on <span className="font-medium text-foreground">{stats.data.daysCheckedIn}</span> of{' '}
            {stats.data.daysInRange} days.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {METRICS.map((metric) => (
              <MetricCard key={metric} metric={metric} stats={stats.data} />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-section-title">Entries</CardTitle>
          <CardDescription>Newest first. Open one to edit it.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isError ? (
            <LoadError error={list.error} onRetry={() => void list.refetch()} />
          ) : !list.data ? (
            <Skeleton className="h-24 w-full" />
          ) : list.data.checkIns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries in this range.</p>
          ) : (
            <ul className="flex flex-col divide-y" aria-label="Check-in entries">
              {[...list.data.checkIns]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((checkIn) => (
                  <EntryRow key={checkIn.id} checkIn={checkIn} today={today} />
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const TONE_CLASSES = {
  good: 'bg-success/10 text-success',
  bad: 'bg-destructive-soft text-destructive',
  neutral: 'bg-muted text-muted-foreground',
}

function TrendBadge({ metric, summary }: { metric: Metric; summary: MetricStats }) {
  const tone = trendTone(metric, summary.trend)
  const Icon = summary.trend === 'rising' ? TrendingUpIcon : summary.trend === 'falling' ? TrendingDownIcon : MinusIcon
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium', TONE_CLASSES[tone])}
      data-tone={tone}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {trendLabel(summary.trend)}
    </span>
  )
}

function MetricCard({ metric, stats }: { metric: Metric; stats: CheckInStats }) {
  const meta = METRIC_META[metric]
  const summary = stats.metrics[metric]
  const points = dailySeries(stats.series, metric, stats.from, stats.to)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          <h2>{meta.label}</h2>
        </CardTitle>
        <CardDescription>
          {summary.count === 0
            ? 'Not logged in this range'
            : `Range ${meta.format(summary.min!)} – ${meta.format(summary.max!)} · ${summary.count} ${summary.count === 1 ? 'day' : 'days'}`}
        </CardDescription>
        <CardAction>
          <TrendBadge metric={metric} summary={summary} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="flex items-baseline gap-1.5">
          <span className="font-heading text-3xl font-bold">
            {summary.average === null ? '—' : meta.format(summary.average)}
          </span>
          <span className="text-sm text-muted-foreground">average</span>
        </p>
        {summary.count > 0 ? (
          <TrendLineChart
            label={meta.label}
            points={points}
            domain={metricDomain(metric, points.map((p) => p.value))}
            format={meta.format}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

function EntryRow({ checkIn, today }: { checkIn: CheckIn; today: string }) {
  const MoodIcon = checkIn.mood ? MOOD_ICONS[checkIn.mood - 1] : null
  const parts = [
    checkIn.mood ? `Mood ${checkIn.mood}` : null,
    checkIn.energy ? `Energy ${checkIn.energy}` : null,
    checkIn.stressLevel ? `Stress ${checkIn.stressLevel}` : null,
    checkIn.sleepHours != null ? `Sleep ${checkIn.sleepHours} h` : null,
  ].filter(Boolean)
  const day = formatRelativeDay(checkIn.date, today)

  return (
    <li>
      <Link
        to={checkIn.date === today ? '/check-ins' : `/check-ins?date=${checkIn.date}`}
        aria-label={`${day}: ${parts.join(', ')}`}
        className="flex items-center gap-3 rounded-md py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-focus-ring"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          {MoodIcon ? <MoodIcon className={cn('size-5', MOOD_COLORS[checkIn.mood! - 1])} aria-hidden="true" /> : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">{day}</span>
          <span className="truncate text-[13px] text-muted-foreground">
            {parts.join(' · ')}
            {checkIn.note ? ` — ${checkIn.note}` : ''}
          </span>
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-subtle" aria-hidden="true" />
      </Link>
    </li>
  )
}
