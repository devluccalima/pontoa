import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type { Payment, PaymentMethod } from '../../api/types'
import { cashKeys } from '../cash/api'
import { orderKeys } from '../orders/api'

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
