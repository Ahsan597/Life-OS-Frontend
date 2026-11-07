import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getDocumentTitle } from '@/lib/navigation'

/** Per-route tab title, and back to the top on a new page (not on ?query changes) */
export function useRouteChrome() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = getDocumentTitle(pathname)
    window.scrollTo(0, 0)
  }, [pathname])

  return pathname
}
