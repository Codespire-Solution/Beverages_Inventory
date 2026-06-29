'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Unit, SKU, Warehouse, Supplier, Customer } from '@/types'

// Units
export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: () => apiClient.get<{ units: Unit[] }>('/api/units'),
  })
}

// Warehouses
export function useWarehouses(filters?: { search?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['warehouses', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      const queryString = params.toString()
      return apiClient.get<{ warehouses: any[] }>(`/api/warehouses${queryString ? `?${queryString}` : ''}`)
    },
  })
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ warehouse: any }>('/api/warehouses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
  })
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ warehouse: any }>(`/api/warehouses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse'] })
    },
  })
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse'] })
    },
  })
}

// Suppliers
export function useSuppliers(filters?: { search?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['suppliers', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      const queryString = params.toString()
      return apiClient.get<{ suppliers: any[] }>(`/api/suppliers${queryString ? `?${queryString}` : ''}`)
    },
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ supplier: any }>('/api/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ supplier: any }>(`/api/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier'] })
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier'] })
    },
  })
}

// Customers
export function useCustomers(filters?: { search?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      const queryString = params.toString()
      return apiClient.get<{ customers: any[] }>(`/api/customers${queryString ? `?${queryString}` : ''}`)
    },
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ customer: any }>('/api/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ customer: any }>(`/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer'] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer'] })
    },
  })
}

// SKUs
export function useSKUs(filters?: { search?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['skus', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.search) params.append('search', filters.search)
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString())
      const queryString = params.toString()
      return apiClient.get<{ skus: any[] }>(`/api/skus${queryString ? `?${queryString}` : ''}`)
    },
  })
}

export function useSKU(id: number | null) {
  return useQuery({
    queryKey: ['sku', id],
    queryFn: () => apiClient.get<{ sku: any }>(`/api/skus/${id}`),
    enabled: !!id,
  })
}

export function useCreateSKU() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<{ sku: any }>('/api/skus', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus'] })
    },
  })
}

export function useUpdateSKU() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ sku: any }>(`/api/skus/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus'] })
      queryClient.invalidateQueries({ queryKey: ['sku'] })
    },
  })
}

export function useDeleteSKU() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/skus/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus'] })
      queryClient.invalidateQueries({ queryKey: ['sku'] })
    },
  })
}
