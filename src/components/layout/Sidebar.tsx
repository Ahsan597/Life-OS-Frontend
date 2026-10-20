import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NAV_ITEMS, isNavItemActive, type NavItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  /** Icon-only rail (desktop) */
  collapsed?: boolean
  /** Omitted in the mobile drawer, which has no collapse toggle */
  onToggleCollapsed?: () => void
  /** Called after a link is clicked, e.g. to close the mobile drawer */
  onNavigate?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapsed, onNavigate }: SidebarProps) {
  const { pathname } = useLocation()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn('flex h-16 shrink-0 items-center px-5', collapsed && 'justify-center px-0')}>
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="rounded-md text-primary outline-none focus-visible:ring-3 focus-visible:ring-focus-ring"
        >
          <Logo compact={collapsed} />
        </Link>
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <SidebarLink
            key={item.to}
            item={item}
            active={isNavItemActive(item, pathname)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {onToggleCollapsed ? (
        <div className="border-t p-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={cn(
              'flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-focus-ring',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? <PanelLeftOpenIcon className="size-4.5" /> : <PanelLeftCloseIcon className="size-4.5" />}
            {collapsed ? null : <span>Collapse</span>}
          </button>
        </div>
      ) : null}
    </div>
  )
}

interface SidebarLinkProps {
  item: NavItem
  active: boolean
  collapsed: boolean
  onNavigate?: () => void
}

function SidebarLink({ item, active, collapsed, onNavigate }: SidebarLinkProps) {
  const Icon = item.icon
  const tooltip = item.soon ? 'Coming in the next update' : collapsed ? item.label : null

  const link = (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-focus-ring',
        active
          ? 'bg-primary-soft text-primary before:absolute before:inset-y-2 before:left-0 before:w-0.75 before:rounded-full before:bg-primary'
          : item.soon
            ? 'text-subtle hover:bg-muted'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
      <span className={cn('flex-1 truncate', collapsed && 'sr-only')}>{item.label}</span>
      {item.soon && !collapsed ? (
        <Badge variant="outline" className="text-[11px] text-subtle">
          Soon
        </Badge>
      ) : null}
    </Link>
  )

  if (!tooltip) return link

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">
        {collapsed && item.soon ? `${item.label} · Coming in the next update` : tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
