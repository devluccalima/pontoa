import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import type { User, UserCreate, UserUpdate } from '../../api/types'

const usersKey = ['users'] as const

export function useUsers() {
  return useQuery({
    queryKey: usersKey,
    queryFn: ({ signal }) => apiRequest<User[]>('/users', { signal }),
  })
}

export function useSaveUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: UserCreate | UserUpdate }) =>
      id
        ? apiRequest<User>(`/users/${id}`, { method: 'PATCH', body: data })
        : apiRequest<User>('/users', { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  })
}

export const PASSWORD_MIN_LENGTH = 8
