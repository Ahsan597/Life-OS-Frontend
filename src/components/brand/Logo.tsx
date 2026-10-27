import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  /** Icon-only, for the collapsed sidebar rail */
  compact?: boolean
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight', className)}>
      <span aria-hidden="true" className="text-[1.35em] leading-none">
        ◐
      </span>
      <span className={cn(compact && 'sr-only')}>Life OS</span>
    </span>
  )
}
