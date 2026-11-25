/**
 * Guarda o token da sessão no navegador (ADR-0010).
 *
 * Todo acesso ao token passa por aqui: trocar o armazenamento
 * (por exemplo, por cookie HttpOnly) muda só este arquivo.
 * O localStorage pode estar indisponível (modo privado, bloqueio
 * do navegador); nesse caso o login vale só enquanto a aba existir.
 */

const STORAGE_KEY = 'pontoa.session'

// Usado só quando o localStorage está indisponível.
let memoryToken: string | null = null

export function readToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return memoryToken
  }
}

export function saveToken(token: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, token)
  } catch {
    memoryToken = token
  }
}

export function clearToken(): void {
  memoryToken = null
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nada a limpar.
  }
}
