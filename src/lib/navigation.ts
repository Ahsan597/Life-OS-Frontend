import {
  CalendarDaysIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  SettingsIcon,
  SmileIcon,
  SparklesIcon,
  TrendingUpIcon,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/habits', label: 'Habits', icon: ListChecksIcon },
  { to: '/check-ins', label: 'Check-in', icon: SmileIcon },
  { to: '/history', label: 'History', icon: CalendarDaysIcon },
  { to: '/insights', label: 'Insights', icon: SparklesIcon },
  { to: '/predictions', label: 'Forecasts', icon: TrendingUpIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

/** Pages that aren't in the sidebar but still need a navbar title */
const EXTRA_TITLES: Record<string, string> = {
  '/notifications': 'Notifications',
  '/login': 'Log in',
  '/register': 'Create account',
}

export function isNavItemActive(item: NavItem, pathname: string) {
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** The browser tab title: "Habits · Life OS" */
export function getDocumentTitle(pathname: string) {
  const title = getPageTitle(pathname)
  return title === 'Life OS' ? title : `${title} · Life OS`
}

export function getPageTitle(pathname: string) {
  return NAV_ITEMS.find((item) => isNavItemActive(item, pathname))?.label ?? EXTRA_TITLES[pathname] ?? 'Life OS'
}
