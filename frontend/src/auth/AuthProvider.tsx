import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, apiRequest, onUnauthorized } from '../api/client'
import type { LoginResponse, MeResponse } from '../api/types'
import { clearDrafts } from '../lib/sessionDraft'
import { clearToken, readToken, saveToken } from './tokenStore'
import { AuthContext } from './useAuth'
import type { AuthState } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>(() =>
    readToken() ? { status: 'loading' } : { status: 'anonymous' },
  )

  useEffect(() => {
    // Sessão expirada ou revogada em qualquer requisição: volta ao login.
    onUnauthorized(() => {
      clearToken()
      queryClient.clear()
      setState({ status: 'anonymous', reason: 'expired' })
    })
    return () => onUnauthorized(null)
  }, [queryClient])

  useEffect(() => {
    if (state.status !== 'loading') return
    const controller = new AbortController()
    apiRequest<MeResponse>('/auth/me', { signal: controller.signal })
      .then(({ user, business }) => setState({ status: 'authenticated', user, business }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) return // tratado em onUnauthorized
        // Sem conexão ou API fora do ar: mantém o token, para não deslogar no meio do turno.
        setState({ status: 'unavailable', error })
      })
    return () => controller.abort()
  }, [state.status])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    saveToken(response.access_token)
    setState({ status: 'authenticated', user: response.user, business: response.business })
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' })
    } catch {
      // Mesmo sem conexão, o aparelho sai; a sessão expira sozinha no servidor.
    }
    clearToken()
    clearDrafts()
    // Dados do usuário anterior não podem aparecer para quem entrar depois no aparelho.
    queryClient.clear()
    setState({ status: 'anonymous' })
  }, [queryClient])

  const retry = useCallback(() => setState({ status: 'loading' }), [])

  const value = useMemo(
    () => ({ state, login, logout, retry }),
    [state, login, logout, retry],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
