import { LogOutIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useThemeToggle } from '@/hooks/useThemeToggle'
import { logout } from '@/lib/session'
import { getInitials } from '@/lib/user'
import type { User } from '@/types/auth'

export function UserMenu({ user }: { user: User }) {
  const navigate = useNavigate()
  const { isDark, toggle } = useThemeToggle()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open user menu"
        className="cursor-pointer rounded-full outline-none transition-shadow duration-150 focus-visible:ring-3 focus-visible:ring-focus-ring"
      >
        <Avatar size="lg">
          <AvatarFallback className="bg-primary-soft font-semibold text-primary">{getInitials(user)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-1.5">
        <div className="flex flex-col gap-0.5 px-2 py-2">
          {user.name ? <p className="truncate text-sm font-semibold text-foreground">{user.name}</p> : null}
          <p className="truncate text-[13px] text-muted-foreground">{user.email}</p>
          <p className="truncate text-[13px] text-muted-foreground">{user.timezone}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggle} className="h-9 px-2">
          {isDark ? <SunIcon /> : <MoonIcon />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleLogout} className="h-9 px-2">
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
