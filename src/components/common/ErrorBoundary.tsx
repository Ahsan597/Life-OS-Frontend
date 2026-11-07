import { RotateCwIcon, TriangleAlertIcon } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Full-screen when nothing else of the app is left to show */
  fullScreen?: boolean
}

/**
 * Catches render errors (and failed page-chunk loads) so one broken page doesn't blank
 * the whole app. Keyed by route in AppLayout, so navigating away resets it.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        role="alert"
        className={
          this.props.fullScreen
            ? 'flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center'
            : 'flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center'
        }
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive-soft text-destructive">
          <TriangleAlertIcon className="size-7" aria-hidden="true" />
        </span>
        <div className="flex max-w-md flex-col gap-1">
          <h1 className="text-page-title">Something went wrong</h1>
          <p className="text-muted-foreground">
            This page hit an unexpected error. Your data is safe. Try again, or reload if it keeps happening.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
          <Button onClick={() => window.location.reload()}>
            <RotateCwIcon />
            Reload
          </Button>
        </div>
      </div>
    )
  }
}
