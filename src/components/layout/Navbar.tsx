import { MenuIcon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { UserMenu } from '@/components/layout/UserMenu'
import { Button } from '@/components/ui/button'
import { useNow } from '@/hooks/useNow'
import { formatShortDate } from '@/lib/datetime'
import { getPageTitle } from '@/lib/navigation'
import { useAuthStore } from '@/store/authStore'

export function Navbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation()
  const user = useAuthStore((state) => state.user)
  const now = useNow()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 md:px-8">
      <Button variant="ghost" size="icon" className="-ml-2 md:hidden" onClick={onOpenMenu} aria-label="Open menu">
        <MenuIcon className="size-5" />
      </Button>
      <p className="truncate font-heading text-lg font-semibold">{getPageTitle(pathname)}</p>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {user ? (
          <time className="mr-2 hidden text-sm text-muted-foreground tabular-nums sm:block">
            {formatShortDate(now, user.timezone)}
          </time>
        ) : null}
        <ThemeToggle />
        {user ? <UserMenu user={user} /> : null}
      </div>
    </header>
  )
}
