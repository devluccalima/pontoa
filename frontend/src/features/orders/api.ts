import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type { Order, OrderCreate } from '../../api/types'
import { cashKeys } from '../cash/api'

export const orderKeys = {
  all: ['orders'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<Order>(`/orders/${id}`, { signal }),
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: OrderCreate) => apiRequest<Order>('/orders', { method: 'POST', body: data }),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order)
      return queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
    onError: () =>
      // "Caixa fechado" pode ter mudado em outro aparelho: atualiza o estado do caixa.
      queryClient.invalidateQueries({ queryKey: cashKeys.current }),
  })
}
