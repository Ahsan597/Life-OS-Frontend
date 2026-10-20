import { describe, expect, it } from 'vitest'
import { getInitials } from '@/lib/user'

describe('getInitials', () => {
  it('uses up to two initials from the name', () => {
    expect(getInitials({ name: 'Ahsan', email: 'a@example.com' })).toBe('A')
    expect(getInitials({ name: 'ahsan azyy', email: 'a@example.com' })).toBe('AA')
    expect(getInitials({ name: '  Muhammad  Ahsan Azyy ', email: 'a@example.com' })).toBe('MA')
  })

  it('falls back to the first letter of the email when there is no name', () => {
    expect(getInitials({ name: null, email: 'zara@example.com' })).toBe('Z')
    expect(getInitials({ name: '   ', email: 'zara@example.com' })).toBe('Z')
  })
})
