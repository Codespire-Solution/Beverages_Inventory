'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useProductionBatches(filters?: {
  status?: string
  skuId?: number
  startDate?: string
  endDate?: string
  search?: string
}) {
  const queryString = new URLSearchParams()
  if (filters?.status) queryString.append('status', filters.status)
  if (filters?.skuId) queryString.append('skuId', String(filters.skuId))
  if (filters?.startDate) queryString.append('startDate', filters.startDate)
  if (filters?.endDate) queryString.append('endDate', filters.endDate)
  if (filters?.search) queryString.append('search', filters.search)

  return useQuery({
    queryKey: ['production-batches', filters],
    queryFn: () => apiClient.get<{ batches: any[] }>(`/api/production-batches?${queryString.toString()}`),
  })
}

export function useProductionBatch(id: number | null) {
  return useQuery({
    queryKey: ['production-batch', id],
    queryFn: () => apiClient.get<{ batch: any }>(`/api/production-batches/${id}`),
    enabled: !!id,
  })
}

export function useCreateProductionBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ batch: any }>('/api/production-batches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] })
    },
  })
}

export function useUpdateProductionBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ batch: any }>(`/api/production-batches/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] })
      queryClient.invalidateQueries({ queryKey: ['production-batch', variables.id] })
    },
  })
}

export function useCancelProductionBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.put<{ batch: any }>(`/api/production-batches/${id}`, { status: 'cancelled' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] })
      queryClient.invalidateQueries({ queryKey: ['production-batch', id] })
    },
  })
}

export function useCompleteProductionBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ batch: any; yieldPercentage: string }>(`/api/production-batches/${id}/complete`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] })
      queryClient.invalidateQueries({ queryKey: ['production-batch', variables.id] })
    },
  })
}

export function useMaterialIssues() {
  return useQuery({
    queryKey: ['material-issues'],
    queryFn: () => apiClient.get<{ issues: any[] }>('/api/material-issues'),
  })
}

export function useCreateMaterialIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ issue: any }>('/api/material-issues', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-issues'] })
      queryClient.invalidateQueries({ queryKey: ['production-batches'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useFinishedGoodsReceipts() {
  return useQuery({
    queryKey: ['finished-goods-receipts'],
    queryFn: () => apiClient.get<{ receipts: any[] }>('/api/finished-goods-receipts'),
  })
}

export function useCreateFinishedGoodsReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ receipt: any }>('/api/finished-goods-receipts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finished-goods-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['production-batches'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
