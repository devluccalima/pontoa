import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type { Dashboard } from '../../api/types'

export function useDashboard(start: string, end: string) {
  return useQuery({
    queryKey: ['dashboard', start, end],
    queryFn: ({ signal }) => apiRequest<Dashboard>('/dashboard', { signal, query: { start, end } }),
    // Ao trocar o período, mantém os números anteriores até chegarem os novos (sem piscar).
    placeholderData: keepPreviousData,
  })
}
