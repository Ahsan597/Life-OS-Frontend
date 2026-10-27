import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  value: ReactNode
  /** e.g. "days", shown after the value */
  unit?: string
  hint?: ReactNode
  icon?: LucideIcon
  /** Tailwind classes for the icon chip */
  iconClassName?: string
}

export function StatTile({ label, value, unit, hint, icon: Icon, iconClassName }: StatTileProps) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex items-start gap-3">
        {Icon ? (
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary',
              iconClassName,
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
        ) : null}
        <dl className="flex min-w-0 flex-col">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="flex items-baseline gap-1.5">
            <span className="font-heading text-3xl font-bold">{value}</span>
            {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
          </dd>
          {hint ? <dd className="text-[13px] text-muted-foreground">{hint}</dd> : null}
        </dl>
      </CardContent>
    </Card>
  )
}
