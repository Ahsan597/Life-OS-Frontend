import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/lib/queryClient'
import { initSession, syncSessionAcrossTabs } from '@/lib/session'

// Outside React on purpose: StrictMode double-runs effects, and this must run exactly once
// (a second /auth/refresh with the same token would revoke every session).
void initSession()
syncSessionAcrossTabs()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* storageKey must match the inline script in index.html */}
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      storageKey="lifeos-theme"
      disableTransitionOnChange
      // Its inline script never runs in a client-rendered app (index.html does that job); a data
      // type keeps React 19 from warning about it.
      scriptProps={{ type: 'application/json' }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delay={300}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </TooltipProvider>
        <Toaster position="top-right" duration={4000} closeButton />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
