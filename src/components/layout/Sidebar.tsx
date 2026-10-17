import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const links = [{ to: '/', label: 'Dashboard' }]

export function Sidebar() {
  return (
    <aside className="w-48 shrink-0 border-r p-4">
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-2 text-sm hover:bg-accent',
                isActive && 'bg-accent font-medium',
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
