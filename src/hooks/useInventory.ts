'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useInventory(filters?: {
  warehouseId?: number
  itemId?: number
  lowStock?: boolean
  expiringSoon?: boolean
  search?: string
  receivedDateFrom?: string
  receivedDateTo?: string
  expiryDateFrom?: string
  expiryDateTo?: string
}) {
  const queryString = new URLSearchParams()
  if (filters?.warehouseId) queryString.append('warehouseId', String(filters.warehouseId))
  if (filters?.itemId) queryString.append('itemId', String(filters.itemId))
  if (filters?.lowStock) queryString.append('lowStock', 'true')
  if (filters?.expiringSoon) queryString.append('expiringSoon', 'true')
  if (filters?.search) queryString.append('search', filters.search)
  if (filters?.receivedDateFrom) queryString.append('receivedDateFrom', filters.receivedDateFrom)
  if (filters?.receivedDateTo) queryString.append('receivedDateTo', filters.receivedDateTo)
  if (filters?.expiryDateFrom) queryString.append('expiryDateFrom', filters.expiryDateFrom)
  if (filters?.expiryDateTo) queryString.append('expiryDateTo', filters.expiryDateTo)

  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => apiClient.get<{ batches: any[] }>(`/api/inventory?${queryString.toString()}`),
  })
}

export function useLowStock(threshold?: number) {
  const queryString = threshold ? `?threshold=${threshold}` : ''
  return useQuery({
    queryKey: ['low-stock', threshold],
    queryFn: () => apiClient.get<{ lowStockItems: any[]; threshold: number }>(`/api/inventory/low-stock${queryString}`),
  })
}

export function useExpiringItems(days?: number) {
  const queryString = days ? `?days=${days}` : ''
  return useQuery({
    queryKey: ['expiring-items', days],
    queryFn: () => apiClient.get<{ batches: any[]; days: number }>(`/api/inventory/expiring${queryString}`),
  })
}

export function useStockAdjustments(filters?: {
  warehouseId?: number
  itemId?: number
  startDate?: string
  endDate?: string
  search?: string
}) {
  const queryString = new URLSearchParams()
  if (filters?.warehouseId) queryString.append('warehouseId', String(filters.warehouseId))
  if (filters?.itemId) queryString.append('itemId', String(filters.itemId))
  if (filters?.startDate) queryString.append('startDate', filters.startDate)
  if (filters?.endDate) queryString.append('endDate', filters.endDate)
  if (filters?.search) queryString.append('search', filters.search)

  return useQuery({
    queryKey: ['stock-adjustments', filters],
    queryFn: () => apiClient.get<{ adjustments: any[] }>(`/api/stock-adjustments?${queryString.toString()}`),
  })
}

export function useCreateStockAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ adjustment: any }>('/api/stock-adjustments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
    },
  })
}

export function useStockTransfers(filters?: {
  fromWarehouseId?: number
  toWarehouseId?: number
  itemId?: number
  startDate?: string
  endDate?: string
  search?: string
}) {
  const queryString = new URLSearchParams()
  if (filters?.fromWarehouseId) queryString.append('fromWarehouseId', String(filters.fromWarehouseId))
  if (filters?.toWarehouseId) queryString.append('toWarehouseId', String(filters.toWarehouseId))
  if (filters?.itemId) queryString.append('itemId', String(filters.itemId))
  if (filters?.startDate) queryString.append('startDate', filters.startDate)
  if (filters?.endDate) queryString.append('endDate', filters.endDate)
  if (filters?.search) queryString.append('search', filters.search)

  return useQuery({
    queryKey: ['stock-transfers', filters],
    queryFn: () => apiClient.get<{ transfers: any[] }>(`/api/stock-transfers?${queryString.toString()}`),
  })
}

export function useCreateStockTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ transfer: any }>('/api/stock-transfers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
    },
  })
}

