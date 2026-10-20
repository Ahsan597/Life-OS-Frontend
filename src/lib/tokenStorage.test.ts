import { describe, expect, it, vi } from 'vitest'
import { REFRESH_TOKEN_KEY, tokenStorage } from '@/lib/tokenStorage'

const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' }

describe('tokenStorage', () => {
  it('returns null when nothing is stored', () => {
    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })

  it('saves and reads back both tokens', () => {
    tokenStorage.setTokens(tokens)

    expect(tokenStorage.getAccessToken()).toBe('access-1')
    expect(tokenStorage.getRefreshToken()).toBe('refresh-1')
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-1')
  })

  it('always reads fresh values, so a rotation from another tab is picked up', () => {
    tokenStorage.setTokens(tokens)
    localStorage.setItem(REFRESH_TOKEN_KEY, 'rotated-elsewhere')

    expect(tokenStorage.getRefreshToken()).toBe('rotated-elsewhere')
  })

  it('clears both tokens', () => {
    tokenStorage.setTokens(tokens)
    tokenStorage.clear()

    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })

  it('does not throw when storage is unavailable', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked)

    expect(() => tokenStorage.setTokens(tokens)).not.toThrow()
    expect(() => tokenStorage.clear()).not.toThrow()
    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })
})
