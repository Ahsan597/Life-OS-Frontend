import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'

export function AppLayout() {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-background">
      {isDesktop ? (
        <aside
          className={cn(
            'sticky top-0 h-svh shrink-0 overflow-hidden border-r transition-[width] duration-200 ease-out',
            collapsed ? 'w-18' : 'w-62',
          )}
        >
          <Sidebar collapsed={collapsed} onToggleCollapsed={toggleSidebar} />
        </aside>
      ) : (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-62 gap-0 border-r p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-280 flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
