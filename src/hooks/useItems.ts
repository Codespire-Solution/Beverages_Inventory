'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Item } from '@/types'

export function useItems(filters?: { category?: string; isActive?: boolean; search?: string }) {
  const queryString = new URLSearchParams()
  if (filters?.category) queryString.append('category', filters.category)
  if (filters?.isActive !== undefined) queryString.append('isActive', String(filters.isActive))
  if (filters?.search) queryString.append('search', filters.search)

  return useQuery({
    queryKey: ['items', filters],
    queryFn: () => apiClient.get<{ items: Item[] }>(`/api/items?${queryString.toString()}`),
  })
}

export function useItem(id: number | null) {
  return useQuery({
    queryKey: ['item', id],
    queryFn: () => apiClient.get<{ item: Item }>(`/api/items/${id}`),
    enabled: !!id,
  })
}

export function useItemStock(itemId: number | null) {
  return useQuery({
    queryKey: ['item-stock', itemId],
    queryFn: () => apiClient.get<{ stockLevels: any[] }>(`/api/items/${itemId}/stock`),
    enabled: !!itemId,
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Item>) => apiClient.post<{ item: Item }>('/api/items', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Item> }) =>
      apiClient.put<{ item: Item }>(`/api/items/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['item', variables.id] })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

