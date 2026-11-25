import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { applyTheme, initialTheme, saveTheme, watchSystemTheme } from './theme'
import type { Theme } from './theme'
import { ThemeContext } from './useTheme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => watchSystemTheme(setTheme), [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      saveTheme(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])
  return <ThemeContext value={value}>{children}</ThemeContext>
}
