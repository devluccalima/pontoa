/**
 * Rascunhos da aba (como a comanda em montagem) no sessionStorage:
 * sobrevivem a recarregar a página e à troca de tela, e somem ao sair.
 */

const PREFIX = 'pontoa.draft.'

export function readDraft<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeDraft(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Sem armazenamento: o rascunho vale enquanto a tela estiver aberta.
  }
}

export function clearDrafts(): void {
  try {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith(PREFIX)) window.sessionStorage.removeItem(key)
    }
  } catch {
    // Nada a limpar.
  }
}
