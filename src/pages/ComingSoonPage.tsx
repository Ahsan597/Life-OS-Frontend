import { ArrowLeftIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { NAV_ITEMS, isNavItemActive } from '@/lib/navigation'

export function ComingSoonPage() {
  const { pathname } = useLocation()
  const item = NAV_ITEMS.find((navItem) => isNavItemActive(navItem, pathname))
  const Icon = item?.icon
  const name = item?.label ?? 'This page'

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      {Icon ? (
        <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="size-8" aria-hidden="true" />
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <h1 className="text-page-title">{name} is on its way</h1>
        <p className="text-muted-foreground">We're building this in the next update.</p>
      </div>
      <Link to="/dashboard" className={buttonVariants({ variant: 'secondary', className: 'mt-2' })}>
        <ArrowLeftIcon />
        Back to dashboard
      </Link>
    </div>
  )
}
