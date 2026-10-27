import { BarChart3Icon, InboxIcon, ListChecksIcon, SparklesIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BucketChart } from '@/components/charts/BucketChart'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadError } from '@/components/common/LoadError'
import { PageHeader } from '@/components/common/PageHeader'
import { Segmented } from '@/components/common/Segmented'
import { CorrelationBar, StrengthBadge } from '@/components/insights/CorrelationRow'
import { RecommendationCard } from '@/components/insights/RecommendationCard'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCorrelations, useRecommendations } from '@/hooks/useInsights'
import { useToday } from '@/hooks/useToday'
import { formatDayMonth } from '@/lib/dates'
import {
  DEFAULT_INSIGHT_RANGE,
  INSIGHT_METRICS,
  INSIGHT_RANGES,
  insightsRange,
  metricLabel,
  type InsightRangeDays,
} from '@/lib/insights'
import { cn } from '@/lib/utils'
import type { Metric } from '@/types/checkIn'
import type { Correlations, Highlight, RecommendationSort } from '@/types/insights'

export function InsightsPage() {
  const today = useToday()
  const [params, setParams] = useSearchParams()
  const days: InsightRangeDays = INSIGHT_RANGES.find((n) => String(n) === params.get('days')) ?? DEFAULT_INSIGHT_RANGE
  const correlations = useCorrelations(insightsRange(today, days))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Insights" description="Patterns in your habits and check-ins, and what to try next." />

      <RecommendationsSection />

      <section aria-labelledby="patterns-heading" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 id="patterns-heading" className="text-section-title">
              Patterns
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {correlations.data
                ? `${formatDayMonth(correlations.data.from)} – ${formatDayMonth(correlations.data.to)}. `
                : null}
              Correlation, not causation.
            </p>
          </div>
          <Segmented
            label="Date range"
            value={days}
            options={INSIGHT_RANGES.map((n) => ({ value: n, label: `${n} days` }))}
            onChange={(n) =>
              setParams(
                (current) => {
                  const updated = new URLSearchParams(current)
                  if (n === DEFAULT_INSIGHT_RANGE) updated.delete('days')
                  else updated.set('days', String(n))
                  return updated
                },
                { replace: true },
              )
            }
          />
        </div>

        {correlations.isPending ? (
          <div className="grid gap-6 md:grid-cols-2" aria-label="Loading patterns">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : correlations.isError ? (
          <LoadError error={correlations.error} onRetry={() => void correlations.refetch()} />
        ) : (
          // Refetching a new range keeps the previous findings on screen, dimmed.
          <div className={cn('flex flex-col gap-6 transition-opacity', correlations.isPlaceholderData && 'opacity-60')}>
            <KeyFindings highlights={correlations.data.highlights} />
            <div className="grid gap-6 xl:grid-cols-2">
              <CompletionByMetricCard data={correlations.data} />
              <PerHabitCard data={correlations.data} />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function RecommendationsSection() {
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'pending' | 'history'>('pending')
  const sort: RecommendationSort = params.get('sort') === 'recent' ? 'recent' : 'rank'
  // Rendered in the order received: the server ranks them.
  const pending = useRecommendations('pending', { sort })
  const all = useRecommendations('all', { sort, enabled: view === 'history' })

  function changeSort(next: RecommendationSort) {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current)
        if (next === 'rank') updated.delete('sort')
        else updated.set('sort', next)
        return updated
      },
      { replace: true },
    )
  }
  const query = view === 'pending' ? pending : all
  const items = view === 'pending' ? query.data : query.data?.filter((item) => item.status !== 'pending')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section-title">
          <h2>Recommendations</h2>
        </CardTitle>
        <CardDescription>Suggestions based on your recent habits and check-ins.</CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Segmented
            label="Sort recommendations"
            value={sort}
            options={[
              { value: 'rank', label: 'Most relevant' },
              { value: 'recent', label: 'Newest' },
            ]}
            onChange={changeSort}
          />
          <Segmented
            label="Recommendations view"
            value={view}
            options={[
              { value: 'pending', label: 'For you' },
              { value: 'history', label: 'History' },
            ]}
            onChange={setView}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div className="flex flex-col gap-3" aria-label="Loading recommendations">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <LoadError error={query.error} onRetry={() => void query.refetch()} />
        ) : !items?.length ? (
          view === 'pending' ? (
            <EmptyState
              icon={SparklesIcon}
              title="You're all caught up"
              description="New suggestions show up here as you log habits and check-ins."
            />
          ) : (
            <EmptyState icon={InboxIcon} title="No history yet" description="Recommendations you accept or dismiss show up here." />
          )
        ) : (
          <ul className="flex flex-col gap-3" aria-label={view === 'pending' ? 'Pending recommendations' : 'Past recommendations'}>
            {items.map((item, index) => (
              <li key={item.id}>
                <RecommendationCard
                  recommendation={item}
                  readOnly={view === 'history'}
                  featured={view === 'pending' && sort === 'rank' && index === 0 && item.priority === 'high'}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function KeyFindings({ highlights }: { highlights: Highlight[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">Key findings</h3>
      {highlights.length === 0 ? (
        <EmptyState
          icon={BarChart3Icon}
          title="No clear patterns yet"
          description="Keep logging. Patterns appear after about a week of check-ins and habits."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2" aria-label="Key findings">
          {highlights.map((highlight) => (
            <li key={`${highlight.scope}-${highlight.habitId ?? 'all'}-${highlight.metric}`}>
              <Card className="h-full gap-3 py-4">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-muted-foreground">{metricLabel(highlight.metric)}</span>
                    {highlight.scope === 'habit' && highlight.habitId ? (
                      <>
                        <span className="text-[13px] text-muted-foreground" aria-hidden="true">
                          ·
                        </span>
                        <Link
                          to={`/habits/${highlight.habitId}`}
                          className="rounded-md text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-focus-ring"
                        >
                          {highlight.habitTitle}
                        </Link>
                      </>
                    ) : null}
                    <span className="ml-auto">
                      <StrengthBadge strength={highlight.strength} />
                    </span>
                  </div>
                  <p className="text-sm">{highlight.summary}</p>
                  <CorrelationBar correlation={highlight} />
                  <p className="text-[12px] text-muted-foreground">Based on {highlight.sampleSize} days</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CompletionByMetricCard({ data }: { data: Correlations }) {
  const [metric, setMetric] = useState<Metric>('sleepHours')
  const entry = data.overall.find((item) => item.metric === metric)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section-title">
          <h3>Habit completion by {metricLabel(metric).toLowerCase()}</h3>
        </CardTitle>
        <CardDescription>Average share of your habits done, grouped by that day's check-in.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Segmented
          label="Metric"
          value={metric}
          options={INSIGHT_METRICS.map((m) => ({ value: m, label: metricLabel(m) }))}
          onChange={setMetric}
        />
        {entry ? (
          <>
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm">{entry.summary}</p>
              <StrengthBadge strength={entry.strength} />
            </div>
            <BucketChart metric={metric} buckets={entry.buckets} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No data for this metric yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

function PerHabitCard({ data }: { data: Correlations }) {
  const selectId = useId()
  const [chosen, setChosen] = useState<string | null>(null)
  // A habit can drop out when the range changes; fall back to the first one.
  const habit = data.habits.find((item) => item.habitId === chosen) ?? data.habits[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section-title">
          <h3>By habit</h3>
        </CardTitle>
        <CardDescription>How each check-in metric lines up with one habit. Weekly habits aren't included.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!habit ? (
          <EmptyState
            icon={ListChecksIcon}
            title="No daily habits to compare"
            description="Daily and custom-schedule habits show up here once they have some history."
          />
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={selectId} className="text-sm font-medium">
                Habit
              </label>
              <select
                id={selectId}
                value={habit.habitId}
                onChange={(event) => setChosen(event.target.value)}
                className="h-9 w-full max-w-sm cursor-pointer rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-focus-ring dark:bg-input/30"
              >
                {data.habits.map((item) => (
                  <option key={item.habitId} value={item.habitId}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            <ul className="flex flex-col divide-y" aria-label={`Correlations for ${habit.title}`}>
              {habit.correlations.map((correlation) => (
                <li key={correlation.metric} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{metricLabel(correlation.metric)}</span>
                    <span className="ml-auto">
                      <StrengthBadge strength={correlation.strength} />
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground">{correlation.summary}</p>
                  <CorrelationBar correlation={correlation} />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
