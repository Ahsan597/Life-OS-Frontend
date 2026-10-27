import { Logo } from '@/components/brand/Logo'

export function SplashScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background" role="status" aria-live="polite">
      <Logo className="animate-pulse text-2xl text-primary" />
      <span className="sr-only">Loading your session…</span>
    </div>
  )
}
