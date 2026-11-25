import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type { Order, Payment, PaymentMethod } from '../../api/types'
import { cashKeys } from '../cash/api'
import { QUEUE_REFRESH_MS, orderKeys } from '../orders/api'

export type PaymentInput = { method: PaymentMethod; amount: string; received_amount?: string | null }

export function useRegisterPayment(orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: PaymentInput) =>
      apiRequest<Payment>(`/orders/${orderId}/payments`, { method: 'POST', body: data }),
    // Pedido (saldo) e caixa (dinheiro na gaveta) mudam com o pagamento.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: cashKeys.all }),
      ]),
  })
}

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão',
}

/** Pedidos com saldo a receber, de qualquer caixa (RN-004). */
export function usePendingPayments() {
  return useQuery({
    queryKey: [...orderKeys.all, 'pending-payments'],
    queryFn: ({ signal }) => apiRequest<Order[]>('/orders/pending-payments', { signal }),
    refetchInterval: QUEUE_REFRESH_MS,
  })
}

export function useOrderPayments(orderId: string) {
  return useQuery({
    queryKey: [...orderKeys.all, 'payments', orderId],
    queryFn: ({ signal }) => apiRequest<Payment[]>(`/orders/${orderId}/payments`, { signal }),
  })
}

export function useVoidPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiRequest<Payment>(`/payments/${id}/void`, { method: 'POST', body: { reason } }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: cashKeys.all }),
      ]),
  })
}
