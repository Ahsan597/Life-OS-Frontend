import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useNow } from '@/hooks/useNow'
import { useThemeToggle } from '@/hooks/useThemeToggle'

const setTheme = vi.fn()
let resolvedTheme = 'light'
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}))

describe('useNow', () => {
  it('ticks forward on every interval and stops when unmounted', () => {
    vi.useFakeTimers({ now: new Date('2026-01-01T10:00:00Z') })
    try {
      const { result, unmount } = renderHook(() => useNow(1000))
      expect(result.current.toISOString()).toBe('2026-01-01T10:00:00.000Z')

      act(() => vi.advanceTimersByTime(1000))
      expect(result.current.toISOString()).toBe('2026-01-01T10:00:01.000Z')

      unmount()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('useMediaQuery', () => {
  it('returns the current match and updates when it changes', () => {
    let matches = false
    const listeners = new Set<() => void>()
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          get matches() {
            return matches
          },
          media: query,
          addEventListener: (_: string, cb: () => void) => listeners.add(cb),
          removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
        }) as unknown as MediaQueryList,
    )

    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(false)

    act(() => {
      matches = true
      listeners.forEach((cb) => cb())
    })
    expect(result.current).toBe(true)

    unmount()
    expect(listeners.size).toBe(0)
  })
})

describe('useThemeToggle', () => {
  it('switches from light to dark', () => {
    resolvedTheme = 'light'
    const { result } = renderHook(() => useThemeToggle())

    expect(result.current.isDark).toBe(false)
    result.current.toggle()
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('switches from dark to light', () => {
    resolvedTheme = 'dark'
    const { result } = renderHook(() => useThemeToggle())

    expect(result.current.isDark).toBe(true)
    result.current.toggle()
    expect(setTheme).toHaveBeenCalledWith('light')
  })
})
