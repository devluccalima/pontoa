import { describe, expect, it, vi } from 'vitest'
import { initialTheme, saveTheme } from './theme'

function systemPrefersDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: dark, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  )
}

describe('initialTheme', () => {
  it('follows the system on the first visit', () => {
    systemPrefersDark(true)
    expect(initialTheme()).toBe('dark')
  })

  it('prefers the saved manual choice', () => {
    systemPrefersDark(true)
    saveTheme('light')
    expect(initialTheme()).toBe('light')
  })
})
