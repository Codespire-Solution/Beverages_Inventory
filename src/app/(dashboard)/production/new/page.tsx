'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateProductionBatch } from '@/hooks/useProduction'
import { useSKUs } from '@/hooks/useMasterData'
import { useWarehouses } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api-client'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { Button } from '@/components/common/Button'

export default function NewProductionBatchPage() {
  const router = useRouter()
  const toast = useToast()
  const [formData, setFormData] = useState({
    skuId: '',
    recipeVersionId: '',
    warehouseId: '',
    targetQuantity: '',
    productionDate: new Date().toISOString().split('T')[0],
    notes: '',
  })
  const [availableRecipes, setAvailableRecipes] = useState<any[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [materialAvailability, setMaterialAvailability] = useState<any>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const { data: skusData } = useSKUs()
  const { data: warehousesData } = useWarehouses()
  const createBatch = useCreateProductionBatch()

  const handleSKUChange = async (skuId: string) => {
    setFormData((prev) => ({ ...prev, skuId, recipeVersionId: '' }))
    setSelectedRecipe(null)
    setMaterialAvailability(null)
    if (skuId) {
      try {
        const recipes = await apiClient.get<{ recipes: any[] }>(`/api/recipes?skuId=${skuId}`)
        setAvailableRecipes(recipes.recipes || [])
        // Auto-select active recipe
        const activeRecipe = recipes.recipes.find((r: any) => r.isActive)
        if (activeRecipe) {
          await handleRecipeChange(activeRecipe.id.toString())
        }
      } catch (error) {
        console.error('Error fetching recipes:', error)
        toast.error('Error loading recipes')
      }
    }
  }

  const handleRecipeChange = async (recipeId: string) => {
    setFormData((prev) => ({ ...prev, recipeVersionId: recipeId }))
    setMaterialAvailability(null)
    if (recipeId) {
      try {
        const recipe = await apiClient.get<{ recipe: any }>(`/api/recipes/${recipeId}`)
        setSelectedRecipe(recipe.recipe)
      } catch (error) {
        console.error('Error fetching recipe:', error)
        toast.error('Error loading recipe details')
      }
    } else {
      setSelectedRecipe(null)
    }
  }

  const checkMaterialAvailability = async () => {
    if (!formData.recipeVersionId || !formData.warehouseId || !formData.targetQuantity) {
      setMaterialAvailability(null)
      return
    }

    setCheckingAvailability(true)
    try {
      const availability = await apiClient.get<{
        allSufficient: boolean
        materials: any[]
      }>(
        `/api/recipes/${formData.recipeVersionId}/material-availability?warehouseId=${formData.warehouseId}&targetQuantity=${formData.targetQuantity}`
      )
      setMaterialAvailability(availability)
      if (!availability.allSufficient) {
        toast.error('Some materials are insufficient for this production quantity')
      }
    } catch (error: any) {
      console.error('Error checking material availability:', error)
      toast.error(error?.response?.data?.error || 'Error checking material availability')
    } finally {
      setCheckingAvailability(false)
    }
  }

  useEffect(() => {
    // Check availability when recipe, warehouse, or target quantity changes
    if (formData.recipeVersionId && formData.warehouseId && formData.targetQuantity) {
      const timeoutId = setTimeout(() => {
        checkMaterialAvailability()
      }, 500) // Debounce

      return () => clearTimeout(timeoutId)
    } else {
      setMaterialAvailability(null)
    }
  }, [formData.recipeVersionId, formData.warehouseId, formData.targetQuantity])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.skuId || !formData.recipeVersionId || !formData.warehouseId || !formData.targetQuantity) {
      toast.error('Please fill in all required fields')
      return
    }

    // Warn if materials are insufficient
    if (materialAvailability && !materialAvailability.allSufficient) {
      const confirmed = window.confirm(
        'Some materials are insufficient for this production quantity. Do you want to proceed anyway?'
      )
      if (!confirmed) return
    }

    try {
      await createBatch.mutateAsync({
        skuId: parseInt(formData.skuId),
        recipeVersionId: parseInt(formData.recipeVersionId),
        warehouseId: parseInt(formData.warehouseId),
        targetQuantity: parseFloat(formData.targetQuantity),
        productionDate: formData.productionDate,
        notes: formData.notes,
      })
      toast.success('Production batch created successfully!')
      router.push('/production')
    } catch (error: any) {
      console.error('Error creating production batch:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error creating production batch'
      toast.error(errorMessage)
    }
  }

  const selectedSKU = skusData?.skus.find((s: any) => s.id === parseInt(formData.skuId))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-medium text-4xl">Create Production Batch</h1>
        <div className="h-[3px] w-16 bg-accent mt-3" />
      </div>

      <form onSubmit={handleSubmit} className="bg-paper rounded-2xl shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="SKU"
            name="skuId"
            value={formData.skuId}
            onChange={(e) => handleSKUChange(e.target.value)}
            options={skusData?.skus.map((s: any) => ({ value: s.id, label: `${s.code} - ${s.name}` })) || []}
            required
            placeholder="Select SKU"
          />
          <FormSelect
            label="Recipe Version"
            name="recipeVersionId"
            value={formData.recipeVersionId}
            onChange={(e) => handleRecipeChange(e.target.value)}
            options={availableRecipes.map((r: any) => ({
              value: r.id,
              label: `Version ${r.versionNumber}${r.isActive ? ' (Active)' : ''}`,
            }))}
            required
            placeholder="Select recipe version"
            disabled={!formData.skuId}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Warehouse"
            name="warehouseId"
            value={formData.warehouseId}
            onChange={(e) => setFormData((prev) => ({ ...prev, warehouseId: e.target.value }))}
            options={warehousesData?.warehouses.map((w: any) => ({ value: w.id, label: w.name })) || []}
            required
            placeholder="Select warehouse"
          />
          <FormInput
            label="Target Quantity"
            name="targetQuantity"
            type="number"
            step="0.01"
            value={formData.targetQuantity}
            onChange={(e) => setFormData((prev) => ({ ...prev, targetQuantity: e.target.value }))}
            required
            helperText={selectedSKU ? `Unit: ${selectedSKU.unit?.code || 'N/A'}` : undefined}
          />
        </div>

        <FormInput
          label="Production Date"
          name="productionDate"
          type="date"
          value={formData.productionDate}
          onChange={(e) => setFormData((prev) => ({ ...prev, productionDate: e.target.value }))}
          required
        />

        <FormInput
          label="Notes (Optional)"
          name="notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
        />

        {/* Recipe Preview */}
        {selectedRecipe && (
          <div className="border border-line rounded-2xl p-4 bg-wash">
            <h3 className="text-lg font-semibold mb-3">Recipe Preview</h3>
            <div className="space-y-2">
              <div className="text-sm text-ink-60">
                <span className="font-medium">Version:</span> {selectedRecipe.versionNumber}
                {selectedRecipe.isActive && (
                  <span className="ml-2 px-2 py-1 bg-ok-bg text-ok-ink rounded text-xs">Active</span>
                )}
              </div>
              {selectedRecipe.effectiveFrom && (
                <div className="text-sm text-ink-60">
                  <span className="font-medium">Effective From:</span>{' '}
                  {new Date(selectedRecipe.effectiveFrom).toLocaleDateString()}
                </div>
              )}
              {selectedRecipe.effectiveTo && (
                <div className="text-sm text-ink-60">
                  <span className="font-medium">Effective To:</span>{' '}
                  {new Date(selectedRecipe.effectiveTo).toLocaleDateString()}
                </div>
              )}
              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Ingredients:</h4>
                  <div className="space-y-1">
                    {selectedRecipe.ingredients.map((ingredient: any, idx: number) => (
                      <div key={idx} className="text-sm flex justify-between items-center">
                        <span>
                          {ingredient.item?.name || 'N/A'} ({ingredient.item?.code || 'N/A'})
                        </span>
                        <span className="font-medium">
                          {ingredient.quantity.toLocaleString()} {ingredient.unit?.code || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Material Availability Check */}
        {formData.recipeVersionId && formData.warehouseId && formData.targetQuantity && (
          <div className="border border-line rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Material Availability</h3>
              {checkingAvailability && <LoadingSpinner text="Checking..." />}
            </div>
            {materialAvailability && (
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-xl ${
                    materialAvailability.allSufficient
                      ? 'bg-ok-bg border border-ok-bg'
                      : 'bg-warn-bg border border-warn-bg'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${materialAvailability.allSufficient ? 'text-ok-ink' : 'text-warn-ink'}`}>
                      {materialAvailability.allSufficient
                        ? 'All materials are sufficient'
                        : 'Some materials are insufficient'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Material Requirements:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-wash">
                        <tr>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-left">Required</th>
                          <th className="px-3 py-2 text-left">Available</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {materialAvailability.materials.map((material: any, idx: number) => (
                          <tr
                            key={idx}
                            className={material.isSufficient ? '' : 'bg-warn-bg'}
                          >
                            <td className="px-3 py-2">
                              {material.item.name} ({material.item.code})
                            </td>
                            <td className="px-3 py-2">
                              {material.requiredQuantity.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}{' '}
                              {material.unit.code}
                            </td>
                            <td className="px-3 py-2">
                              {material.availableStock.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}{' '}
                              {material.unit.code}
                            </td>
                            <td className="px-3 py-2">
                              {material.isSufficient ? (
                                <span className="text-ok-ink font-medium">Sufficient</span>
                              ) : (
                                <span className="text-warn-ink font-medium">
                                  Shortfall: {material.shortfall.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}{' '}
                                  {material.unit.code}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createBatch.isPending}
          >
            {createBatch.isPending && <LoadingSpinner text="" />}
            {createBatch.isPending ? 'Creating...' : 'Create Batch'}
          </Button>
        </div>
      </form>
    </div>
  )
}
