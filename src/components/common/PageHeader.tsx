import { ArrowLeftIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Buttons on the right */
  actions?: ReactNode
  back?: { to: string; label: string }
}

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      {back ? (
        <Link
          to={back.to}
          className="flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-focus-ring"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-page-title break-words">{title}</h1>
          {description ? <div className="text-muted-foreground">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
