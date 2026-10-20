import { describe, expect, it } from 'vitest'
import { getPageTitle, isNavItemActive, NAV_ITEMS } from '@/lib/navigation'

const dashboard = NAV_ITEMS.find((item) => item.to === '/dashboard')!

describe('isNavItemActive', () => {
  it('matches the exact path', () => {
    expect(isNavItemActive(dashboard, '/dashboard')).toBe(true)
  })

  it('matches nested paths', () => {
    expect(isNavItemActive(dashboard, '/dashboard/settings')).toBe(true)
  })

  it('does not match paths that only share a prefix', () => {
    expect(isNavItemActive(dashboard, '/dashboards')).toBe(false)
    expect(isNavItemActive(dashboard, '/habits')).toBe(false)
  })
})

describe('getPageTitle', () => {
  it('returns the label of the matching nav item', () => {
    expect(getPageTitle('/dashboard')).toBe('Dashboard')
    expect(getPageTitle('/habits/123')).toBe('Habits')
  })

  it('falls back to the app name for unknown paths', () => {
    expect(getPageTitle('/nowhere')).toBe('Life OS')
  })
})
