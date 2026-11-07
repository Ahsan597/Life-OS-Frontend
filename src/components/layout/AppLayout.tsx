import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useRouteChrome } from '@/hooks/useRouteChrome'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'

export function AppLayout() {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = useRouteChrome()

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
          {/* Keyed by route: an error on one page is cleared by navigating to another. */}
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

/** Shown while a page's code chunk loads */
function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading page">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
