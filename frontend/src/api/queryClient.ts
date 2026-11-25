import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Erro de regra ou permissão não melhora tentando de novo; rede e 5xx, uma vez.
        retry: (failureCount, error) =>
          failureCount < 1 && error instanceof ApiError && (error.status === 0 || error.status >= 500),
      },
      mutations: { retry: false },
    },
  })
}
