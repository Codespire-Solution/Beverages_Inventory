'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { RecipeVersion } from '@/types'

export function useRecipes(skuId?: string) {
  const queryString = skuId ? `?skuId=${skuId}` : ''
  
  return useQuery({
    queryKey: ['recipes', skuId],
    queryFn: () => apiClient.get<{ recipes: RecipeVersion[] }>(`/api/recipes${queryString}`),
    enabled: !!skuId,
  })
}

export function useRecipe(id: number | null) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => apiClient.get<{ recipe: RecipeVersion }>(`/api/recipes/${id}`),
    enabled: !!id,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      skuId: number
      versionNumber: string
      effectiveFrom: string
      effectiveTo: string | null
      isActive: boolean
      ingredients: Array<{ itemId: number; quantity: number; unitId: number }>
    }) => apiClient.post<{ recipe: RecipeVersion }>('/api/recipes', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', String(variables.skuId)] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      code: string
      name: string
      baseUnitId?: number | null
      conversionFactor?: number
    }) => apiClient.post<{ unit: any }>('/api/units', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put<{ recipe: RecipeVersion }>(`/api/recipes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe'] })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe'] })
    },
  })
}
