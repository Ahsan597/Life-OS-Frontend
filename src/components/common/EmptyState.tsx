import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/60 px-6 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{title}</p>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
