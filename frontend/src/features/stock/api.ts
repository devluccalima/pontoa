import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type { Product, StockMovement, StockSet } from '../../api/types'
import { catalogKeys } from '../catalog/api'

export const stockKeys = {
  movements: (productId: string) => ['stock', 'movements', productId] as const,
}

export function useStockMovements(productId: string, enabled: boolean) {
  return useQuery({
    queryKey: stockKeys.movements(productId),
    queryFn: ({ signal }) => apiRequest<StockMovement[]>(`/products/${productId}/stock/movements`, { signal }),
    enabled,
  })
}

function useStockMutation<TInput extends { productId: string }>(mutationFn: (input: TInput) => Promise<Product>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (product) => {
      queryClient.setQueryData<Product[]>(catalogKeys.products, (products) =>
        products?.map((item) => (item.id === product.id ? product : item)),
      )
    },
    onSettled: (_product, _error, input) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: catalogKeys.products }),
        queryClient.invalidateQueries({ queryKey: stockKeys.movements(input.productId) }),
      ]),
  })
}

export function useSetStock() {
  return useStockMutation(({ productId, data }: { productId: string; data: StockSet }) =>
    apiRequest<Product>(`/products/${productId}/stock`, { method: 'PUT', body: data }),
  )
}

export function useDisableStock() {
  return useStockMutation(({ productId }: { productId: string }) =>
    apiRequest<Product>(`/products/${productId}/stock`, { method: 'DELETE' }),
  )
}
