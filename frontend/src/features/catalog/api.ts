import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type {
  Category,
  CategoryCreate,
  CategoryUpdate,
  Product,
  ProductCreate,
  ProductUpdate,
} from '../../api/types'

export const catalogKeys = {
  categories: ['categories'] as const,
  products: ['products'] as const,
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: ({ signal }) => apiRequest<Category[]>('/categories', { signal }),
  })
}

export function useProducts() {
  return useQuery({
    queryKey: catalogKeys.products,
    queryFn: ({ signal }) => apiRequest<Product[]>('/products', { signal }),
  })
}

function useInvalidateCatalog() {
  const queryClient = useQueryClient()
  // Produtos mostram o nome da categoria: qualquer mudança no catálogo recarrega os dois.
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: catalogKeys.categories }),
      queryClient.invalidateQueries({ queryKey: catalogKeys.products }),
    ])
}

export function useSaveProduct() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: ProductCreate | ProductUpdate }) =>
      id
        ? apiRequest<Product>(`/products/${id}`, { method: 'PATCH', body: data })
        : apiRequest<Product>('/products', { method: 'POST', body: data }),
    onSuccess: invalidate,
  })
}

export function useSaveCategory() {
  const invalidate = useInvalidateCatalog()
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: CategoryCreate | CategoryUpdate }) =>
      id
        ? apiRequest<Category>(`/categories/${id}`, { method: 'PATCH', body: data })
        : apiRequest<Category>('/categories', { method: 'POST', body: data }),
    onSuccess: invalidate,
  })
}

/** Só os campos alterados, para o PATCH (ADR-0006: campos ausentes não mudam). */
export function changedFields<T extends object>(original: T, edited: Partial<T>): Partial<T> {
  const changes: Partial<T> = {}
  for (const key of Object.keys(edited) as (keyof T)[]) {
    if (edited[key] !== original[key]) changes[key] = edited[key]
  }
  return changes
}
