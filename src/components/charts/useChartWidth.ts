import { useLayoutEffect, useRef, useState } from 'react'

/** Tracks an element's width so SVG charts draw at real pixel size (crisp 2px lines, round dots) */
export function useChartWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      // jsdom (tests) reports 0; keep the fallback there.
      if (element.clientWidth > 0) setWidth(element.clientWidth)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}
