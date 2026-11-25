import { createContext, useContext } from 'react'
import type { Business, User } from '../api/types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous'; reason?: 'expired' }
  | { status: 'unavailable'; error: unknown }
  | { status: 'authenticated'; user: User; business: Business }

export type AuthContextValue = {
  state: AuthState
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}

/** Usuário logado; só pode ser usado dentro de rotas protegidas. */
export function useSession(): { user: User; business: Business } {
  const { state } = useAuth()
  if (state.status !== 'authenticated') throw new Error('useSession fora de rota protegida')
  return { user: state.user, business: state.business }
}
