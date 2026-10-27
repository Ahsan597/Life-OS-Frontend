import {
  CalendarDaysIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  SmileIcon,
  SparklesIcon,
  TrendingUpIcon,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Not shipped by the backend yet: shown greyed out with a "Soon" badge */
  soon?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { to: '/habits', label: 'Habits', icon: ListChecksIcon },
  { to: '/check-ins', label: 'Check-in', icon: SmileIcon },
  { to: '/history', label: 'History', icon: CalendarDaysIcon },
  { to: '/insights', label: 'Insights', icon: SparklesIcon },
  { to: '/predictions', label: 'Forecasts', icon: TrendingUpIcon },
]

export function isNavItemActive(item: NavItem, pathname: string) {
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

export function getPageTitle(pathname: string) {
  return NAV_ITEMS.find((item) => isNavItemActive(item, pathname))?.label ?? 'Life OS'
}
