'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function usePurchaseOrders(filters?: {
  supplierId?: number
  status?: string
  startDate?: string
  endDate?: string
  search?: string
}) {
  const queryString = new URLSearchParams()
  if (filters?.supplierId) queryString.append('supplierId', String(filters.supplierId))
  if (filters?.status) queryString.append('status', filters.status)
  if (filters?.startDate) queryString.append('startDate', filters.startDate)
  if (filters?.endDate) queryString.append('endDate', filters.endDate)
  if (filters?.search) queryString.append('search', filters.search)

  return useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: () => apiClient.get<{ purchaseOrders: any[] }>(`/api/purchase-orders?${queryString.toString()}`),
  })
}

export function usePurchaseOrder(id: number | null) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => apiClient.get<{ purchaseOrder: any }>(`/api/purchase-orders/${id}`),
    enabled: !!id,
  })
}

export function usePurchaseSuggestions(threshold?: number) {
  const queryString = threshold ? `?threshold=${threshold}` : ''
  return useQuery({
    queryKey: ['purchase-suggestions', threshold],
    queryFn: () => apiClient.get<{ suggestions: any[] }>(`/api/purchase-orders/suggestions${queryString}`),
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ purchaseOrder: any }>('/api/purchase-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ purchaseOrder: any }>(`/api/purchase-orders/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] })
    },
  })
}

export function useConfirmPurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.put<{ purchaseOrder: any }>(`/api/purchase-orders/${id}/confirm`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
    },
  })
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.put<{ purchaseOrder: any }>(`/api/purchase-orders/${id}`, { status: 'cancelled' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
    },
  })
}

export function useGoodsReceipts() {
  return useQuery({
    queryKey: ['goods-receipts'],
    queryFn: () => apiClient.get<{ receipts: any[] }>('/api/goods-receipts'),
  })
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ receipt: any }>('/api/goods-receipts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
