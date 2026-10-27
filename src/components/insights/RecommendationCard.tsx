import { ArrowRightIcon, CheckIcon, SmilePlusIcon, XIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { useUpdateRecommendation } from '@/hooks/useInsights'
import { ruleMeta, type RecommendationTone } from '@/lib/insights'
import { scoreFactorReasons } from '@/lib/predictions'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types/insights'

const TONE_CLASSES: Record<RecommendationTone, { card: string; chip: string }> = {
  urgent: { card: 'border-l-destructive', chip: 'bg-destructive-soft' },
  warning: { card: 'border-l-warning', chip: 'bg-warning/10' },
  positive: { card: 'border-l-success', chip: 'bg-success/10' },
  info: { card: 'border-l-info', chip: 'bg-info/10' },
}

interface RecommendationCardProps {
  recommendation: Recommendation
  /** Off on the habit's own page, where the link would point at itself */
  showHabit?: boolean
  /** History: no actions, just the outcome */
  readOnly?: boolean
  /** The top high-priority item in the feed: larger and highlighted */
  featured?: boolean
}

export function RecommendationCard({
  recommendation,
  showHabit = true,
  readOnly = false,
  featured = false,
}: RecommendationCardProps) {
  const update = useUpdateRecommendation()
  const { emoji, tone, badge } = ruleMeta(recommendation.rule)
  const reasons = scoreFactorReasons(recommendation.scoreFactors)
  const highPriority = recommendation.status === 'pending' && recommendation.priority === 'high'
  const decide = (status: 'accepted' | 'dismissed') => update.mutate({ id: recommendation.id, status })

  return (
    <article
      aria-label={recommendation.message}
      data-tone={tone}
      data-priority={recommendation.priority ?? undefined}
      data-featured={featured || undefined}
      className={cn(
        'flex gap-3 rounded-xl border border-l-4 bg-card px-4 py-3',
        TONE_CLASSES[tone].card,
        featured && 'bg-primary-soft/50 px-5 py-4 shadow-sm ring-1 ring-primary/20',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative flex size-9 shrink-0 items-center justify-center rounded-full text-lg',
          TONE_CLASSES[tone].chip,
          featured && 'size-11 text-xl',
        )}
      >
        {emoji}
        {badge ? <span className="absolute -right-1 -bottom-1 text-[12px]">{badge}</span> : null}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {highPriority ? (
          <Badge variant="destructive" className="w-fit">
            High priority
          </Badge>
        ) : null}
        {showHabit && recommendation.habitId && recommendation.habitTitle ? (
          <Link
            to={`/habits/${recommendation.habitId}`}
            className="w-fit rounded-md text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-focus-ring"
          >
            {recommendation.habitTitle}
          </Link>
        ) : null}
        <p className={cn('text-sm', featured && 'text-base font-medium')}>{recommendation.message}</p>
        <details className="text-[13px]">
          <summary className="w-fit cursor-pointer rounded-md font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-focus-ring">
            Why am I seeing this?
          </summary>
          <p className="mt-1 text-muted-foreground">{recommendation.reason}</p>
          {reasons.length > 0 ? (
            <ul className="mt-1 list-disc pl-5 text-muted-foreground" aria-label="Ranking reasons">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </details>
        {readOnly ? (
          <Badge variant={recommendation.status === 'dismissed' ? 'secondary' : 'default'} className="mt-1">
            {recommendation.status === 'accepted' ? 'Accepted' : recommendation.status === 'dismissed' ? 'Dismissed' : 'Pending'}
          </Badge>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            {recommendation.rule === 'streak_at_risk' && recommendation.habitId ? (
              <Link to={`/habits/${recommendation.habitId}`} className={buttonVariants({ size: 'sm' })}>
                Go to habit
                <ArrowRightIcon />
              </Link>
            ) : null}
            {recommendation.rule === 'checkin_gap' ? (
              <Link to="/check-ins" className={buttonVariants({ size: 'sm' })}>
                <SmilePlusIcon />
                Check in
              </Link>
            ) : null}
            <Button
              size="sm"
              variant={recommendation.rule === 'checkin_gap' || recommendation.rule === 'streak_at_risk' ? 'secondary' : 'default'}
              onClick={() => decide('accepted')}
              disabled={update.isPending}
            >
              <CheckIcon />
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={() => decide('dismissed')} disabled={update.isPending}>
              <XIcon />
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
