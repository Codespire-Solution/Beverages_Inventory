'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useCustomerOrders(filters?: {
  customerId?: number
  status?: string
  startDate?: string
  endDate?: string
  search?: string
}) {
  const queryString = new URLSearchParams()
  if (filters?.customerId) queryString.append('customerId', String(filters.customerId))
  if (filters?.status) queryString.append('status', filters.status)
  if (filters?.startDate) queryString.append('startDate', filters.startDate)
  if (filters?.endDate) queryString.append('endDate', filters.endDate)
  if (filters?.search) queryString.append('search', filters.search)

  return useQuery({
    queryKey: ['customer-orders', filters],
    queryFn: () => apiClient.get<{ orders: any[] }>(`/api/customer-orders?${queryString.toString()}`),
  })
}

export function useCustomerOrder(id: number | null) {
  return useQuery({
    queryKey: ['customer-order', id],
    queryFn: () => apiClient.get<{ order: any }>(`/api/customer-orders/${id}`),
    enabled: !!id,
  })
}

export function useCreateCustomerOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ order: any }>('/api/customer-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
    },
  })
}

export function useUpdateCustomerOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ order: any }>(`/api/customer-orders/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
      queryClient.invalidateQueries({ queryKey: ['customer-order', variables.id] })
    },
  })
}

export function useConfirmCustomerOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.put<{ order: any }>(`/api/customer-orders/${id}/confirm`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
      queryClient.invalidateQueries({ queryKey: ['customer-order', id] })
    },
  })
}

export function useCancelCustomerOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.put<{ order: any }>(`/api/customer-orders/${id}`, { status: 'cancelled' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
      queryClient.invalidateQueries({ queryKey: ['customer-order', id] })
    },
  })
}

export function useSalesDeliveries() {
  return useQuery({
    queryKey: ['sales-deliveries'],
    queryFn: () => apiClient.get<{ deliveries: any[] }>('/api/sales-deliveries'),
  })
}

export function useCreateSalesDelivery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ delivery: any }>('/api/sales-deliveries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
