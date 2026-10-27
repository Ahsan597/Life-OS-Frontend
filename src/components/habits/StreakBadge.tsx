import { FlameIcon } from 'lucide-react'
import { formatStreak } from '@/lib/habits'
import { cn } from '@/lib/utils'
import type { Frequency } from '@/types/habit'

export function StreakBadge({ frequency, streak }: { frequency: Frequency; streak: number }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium',
        streak > 0 ? 'bg-streak-soft text-foreground' : 'bg-muted text-muted-foreground',
      )}
      title="Current streak"
    >
      <FlameIcon className={cn('size-3.5', streak > 0 ? 'text-streak' : 'text-subtle')} aria-hidden="true" />
      <span className="sr-only">Current streak: </span>
      {formatStreak(frequency, streak)}
    </span>
  )
}
