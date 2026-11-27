import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type { Business, BusinessUpdate } from '../../api/types'
import { useAuth } from '../../auth/useAuth'

export function useUpdateBusiness() {
  const queryClient = useQueryClient()
  const { updateBusiness } = useAuth()
  return useMutation({
    mutationFn: (data: BusinessUpdate) => apiRequest<Business>('/business', { method: 'PATCH', body: data }),
    onSuccess: (saved, data) => {
      // Nome e fuso aparecem no menu e em todas as datas: a sessão passa a usar os novos.
      updateBusiness(saved)
      // Com outro fuso, "hoje" e os períodos do painel mudam: recarrega o que estiver em tela.
      if (data.timezone) void queryClient.invalidateQueries()
    },
  })
}
