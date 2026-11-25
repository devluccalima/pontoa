import { describe, expect, it, vi } from 'vitest'
import { clearToken, readToken, saveToken } from './tokenStore'

describe('tokenStore', () => {
  it('keeps the token across reloads in localStorage', () => {
    saveToken('abc')
    expect(window.localStorage.getItem('pontoa.session')).toBe('abc')
    expect(readToken()).toBe('abc')

    clearToken()
    expect(readToken()).toBeNull()
  })

  it('falls back to memory when localStorage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    saveToken('abc')
    expect(readToken()).toBe('abc')
    clearToken()
    expect(readToken()).toBeNull()
  })
})
