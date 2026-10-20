import { CompassIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Logo className="text-primary" />
      <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <CompassIcon className="size-8" aria-hidden="true" />
      </span>
      <h1 className="text-page-title">404 — This page wandered off.</h1>
      <Link to="/" className={buttonVariants({ size: 'lg' })}>
        Back home
      </Link>
    </div>
  )
}
