'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface User {
  id: number
  email: string
  fullName: string
  role: string
  isActive: boolean
  createdAt: string
}

export function useUsers(filters?: { search?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      const queryString = params.toString()
      return apiClient.get<{ users: User[] }>(`/api/users${queryString ? `?${queryString}` : ''}`)
    },
  })
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => apiClient.get<{ user: User }>(`/api/users/${id}`),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ user: User }>('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ user: User }>(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}
