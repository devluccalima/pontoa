/**
 * Tema claro/escuro (DESIGN.md, "Tema").
 *
 * - Primeira visita: segue `prefers-color-scheme` do sistema.
 * - Escolha manual fica salva e tem prioridade.
 * - Troca instantânea, aplicada em `data-theme` no elemento html.
 */

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'pontoa.theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

export function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function systemTheme(): Theme {
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light'
}

export function initialTheme(): Theme {
  return storedTheme() ?? systemTheme()
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Sem armazenamento: a escolha vale até recarregar.
  }
}

/** Acompanha a troca de tema do sistema enquanto não houver escolha manual. */
export function watchSystemTheme(onChange: (theme: Theme) => void): () => void {
  const query = window.matchMedia?.(DARK_QUERY)
  if (!query) return () => {}
  const listener = (event: MediaQueryListEvent) => {
    if (storedTheme() === null) onChange(event.matches ? 'dark' : 'light')
  }
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
