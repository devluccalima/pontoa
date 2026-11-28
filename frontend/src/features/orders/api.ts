import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type { Order, OrderCreate, OrderStatus } from '../../api/types'
import { cashKeys } from '../cash/api'
import { catalogKeys } from '../catalog/api'

export const orderKeys = {
  all: ['orders'] as const,
  current: ['orders', 'current'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
}

/** A fila acompanha outros aparelhos (caixa e cozinha) sem recarregar a página. */
export const QUEUE_REFRESH_MS = 10_000

/** Pedidos do caixa aberto, do mais antigo ao mais novo. */
export function useCurrentOrders() {
  return useQuery({
    queryKey: orderKeys.current,
    queryFn: ({ signal }) => apiRequest<Order[]>('/orders', { signal }),
    refetchInterval: QUEUE_REFRESH_MS,
  })
}

function useOrderMutation<TInput>(mutationFn: (input: TInput) => Promise<Order>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order)
      queryClient.setQueryData<Order[]>(orderKeys.current, (orders) =>
        orders?.map((item) => (item.id === order.id ? order : item)),
      )
    },
    // Conflito com outro aparelho (já avançado, já cancelado): a lista volta ao estado real.
    // O cancelamento devolve itens ao estoque: o saldo dos produtos também é recarregado.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: catalogKeys.products }),
      ]),
  })
}

export function useChangeStatus() {
  return useOrderMutation(({ id, status }: { id: string; status: OrderStatus }) =>
    apiRequest<Order>(`/orders/${id}/status`, { method: 'POST', body: { status } }),
  )
}

export function useCancelOrder() {
  return useOrderMutation(({ id, reason }: { id: string; reason: string }) =>
    apiRequest<Order>(`/orders/${id}/cancel`, { method: 'POST', body: { reason } }),
  )
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
      // "Caixa fechado" ou "estoque insuficiente" podem ter mudado em outro aparelho.
      queryClient.invalidateQueries({ queryKey: cashKeys.current }),
    // A venda baixa o estoque: o saldo mostrado na grade é recarregado.
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogKeys.products }),
  })
}
