import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type { CashMovement, CashMovementKind, CashSession, CurrentCashSession } from '../../api/types'

export const cashKeys = {
  all: ['cash'] as const,
  current: ['cash', 'current'] as const,
  history: ['cash', 'history'] as const,
  movements: (sessionId: string) => ['cash', sessionId, 'movements'] as const,
}

/** Caixa aberto agora; `session` é `null` quando está fechado. Usado também pela tela de vendas. */
export function useCurrentCash() {
  return useQuery({
    queryKey: cashKeys.current,
    queryFn: ({ signal }) => apiRequest<CurrentCashSession>('/cash-sessions/current', { signal }),
    select: (data) => data.session,
  })
}

export function useCashHistory(enabled: boolean) {
  return useQuery({
    queryKey: cashKeys.history,
    queryFn: ({ signal }) => apiRequest<CashSession[]>('/cash-sessions', { signal, query: { limit: 10 } }),
    enabled,
  })
}

export function useCashMovements(sessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: cashKeys.movements(sessionId ?? ''),
    queryFn: ({ signal }) => apiRequest<CashMovement[]>(`/cash-sessions/${sessionId}/movements`, { signal }),
    enabled: enabled && Boolean(sessionId),
  })
}

function useCashMutation<TInput, TOutput>(mutationFn: (input: TInput) => Promise<TOutput>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cashKeys.all }),
  })
}

export function useOpenCash() {
  return useCashMutation((openingAmount: string) =>
    apiRequest<CashSession>('/cash-sessions', { method: 'POST', body: { opening_amount: openingAmount } }),
  )
}

export function useAddMovement() {
  return useCashMutation((input: { kind: CashMovementKind; amount: string; description: string }) =>
    apiRequest<CashMovement>('/cash-sessions/current/movements', { method: 'POST', body: input }),
  )
}

export function useCloseCash() {
  return useCashMutation((input: { counted_amount: string; notes: string | null }) =>
    apiRequest<CashSession>('/cash-sessions/current/close', { method: 'POST', body: input }),
  )
}
