import { describe, expect, it } from 'vitest'
import { notificationLink, relativeTime, unreadBadge } from '@/lib/notifications'

describe('notifications', () => {
  it('caps the badge at 9+ and hides it at zero', () => {
    expect(unreadBadge(3)).toBe('3')
    expect(unreadBadge(9)).toBe('9')
    expect(unreadBadge(10)).toBe('9+')
    expect(unreadBadge(0)).toBeNull()
    expect(unreadBadge(undefined)).toBeNull()
  })

  it('deep-links to the at-risk habit, then the dashboard, then the check-in', () => {
    expect(notificationLink({ data: { habitIds: ['18', '19'], atRiskHabitIds: ['19'], checkInMissing: true } })).toBe(
      '/habits/19',
    )
    expect(notificationLink({ data: { habitIds: ['18'], atRiskHabitIds: [], checkInMissing: true } })).toBe('/dashboard')
    expect(notificationLink({ data: { habitIds: [], checkInMissing: true } })).toBe('/check-ins')
    expect(notificationLink({ data: { checkInMissing: false } })).toBeNull()
  })

  it('reads data defensively', () => {
    expect(notificationLink({ data: null })).toBeNull()
    expect(notificationLink({ data: { atRiskHabitIds: 'oops' as unknown as string[], somethingNew: 1 } })).toBeNull()
    expect(notificationLink({ data: { atRiskHabitIds: [42 as unknown as string, '7'] } })).toBe('/habits/7')
  })

  it('formats relative times', () => {
    const now = new Date('2026-10-20T12:00:00Z')
    expect(relativeTime('2026-10-20T11:59:30Z', now)).toBe('just now')
    expect(relativeTime('2026-10-20T11:55:00Z', now)).toBe('5m ago')
    expect(relativeTime('2026-10-20T10:00:00Z', now)).toBe('2h ago')
    expect(relativeTime('2026-10-17T12:00:00Z', now)).toBe('3d ago')
    expect(relativeTime('2026-10-01T12:00:00Z', now)).toBe('1 Oct')
  })
})
