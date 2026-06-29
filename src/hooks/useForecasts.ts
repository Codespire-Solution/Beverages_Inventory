'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useForecasts(filters?: { 
  skuId?: number
  month?: string
  startDate?: string
  endDate?: string
  minAccuracy?: number
  maxAccuracy?: number
}) {
  const queryString = new URLSearchParams()
  if (filters?.skuId) queryString.append('skuId', String(filters.skuId))
  if (filters?.month) queryString.append('month', filters.month)
  if (filters?.startDate) queryString.append('startDate', filters.startDate)
  if (filters?.endDate) queryString.append('endDate', filters.endDate)
  if (filters?.minAccuracy) queryString.append('minAccuracy', String(filters.minAccuracy))
  if (filters?.maxAccuracy) queryString.append('maxAccuracy', String(filters.maxAccuracy))

  return useQuery({
    queryKey: ['forecasts', filters],
    queryFn: () => apiClient.get<{ forecasts: any[] }>(`/api/forecasts?${queryString.toString()}`),
  })
}

export function useForecast(id: number | null) {
  return useQuery({
    queryKey: ['forecast', id],
    queryFn: () => apiClient.get<{ forecast: any }>(`/api/forecasts/${id}`),
    enabled: !!id,
  })
}

export function useForecastHistoricalSales(id: number | null) {
  return useQuery({
    queryKey: ['forecast-historical-sales', id],
    queryFn: () => apiClient.get<{ historicalData: Array<{ month: Date; quantity: number }> }>(`/api/forecasts/${id}/historical-sales`),
    enabled: !!id,
  })
}

export function useGenerateForecasts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { skuId: number; months?: number }) =>
      apiClient.post<{ forecasts: any[]; average: number }>('/api/forecasts/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
    },
  })
}

export function useCreateForecast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ forecast: any }>('/api/forecasts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
    },
  })
}

export function useUpdateForecast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ forecast: any }>(`/api/forecasts/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
      queryClient.invalidateQueries({ queryKey: ['forecast', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['forecast-accuracy'] })
    },
  })
}

export function useDeleteForecast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/forecasts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
      queryClient.invalidateQueries({ queryKey: ['forecast-accuracy'] })
    },
  })
}

export function useForecastAccuracy(skuId?: number) {
  const queryString = skuId ? `?skuId=${skuId}` : ''
  return useQuery({
    queryKey: ['forecast-accuracy', skuId],
    queryFn: () => apiClient.get<{ accuracyData: any[]; averageAccuracy: string; totalForecasts: number; mape?: string }>(`/api/forecasts/accuracy${queryString}`),
  })
}

export function usePurchaseForecasts() {
  return useQuery({
    queryKey: ['purchase-forecasts'],
    queryFn: () => apiClient.get<{ purchaseSuggestions: any[] }>('/api/purchase-forecasts'),
  })
}
