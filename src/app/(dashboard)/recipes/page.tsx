'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSKUs } from '@/hooks/useMasterData'
import { useItems } from '@/hooks/useItems'
import { useUnits } from '@/hooks/useMasterData'
import { useRecipes, useCreateRecipe, useCreateUnit, useUpdateRecipe, useDeleteRecipe } from '@/hooks/useRecipes'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api-client'
import DataTable from '@/components/common/DataTable'
import Modal from '@/components/common/Modal'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { formatDate, formatCurrency } from '@/lib/utils'
import StatusBadge from '@/components/common/StatusBadge'
import type { RecipeVersion, RecipeFormData, CurrentIngredient, UnitFormData, Item, Unit, SKU } from '@/types'
import { Button } from '@/components/common/Button'
import { Plus, Pencil, Trash } from '@phosphor-icons/react'

export default function RecipesPage() {
  const router = useRouter()
  const toast = useToast()
  const [selectedSKU, setSelectedSKU] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [recipeToDelete, setRecipeToDelete] = useState<number | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeVersion | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('true')
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState<RecipeFormData>({
    skuId: '',
    versionNumber: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    isActive: true,
    ingredients: [],
  })
  const [currentIngredient, setCurrentIngredient] = useState<CurrentIngredient>({
    itemId: '',
    quantity: '',
    unitId: '',
  })
  const [newUnit, setNewUnit] = useState<UnitFormData>({
    code: '',
    name: '',
    baseUnitId: '',
    conversionFactor: '1',
  })

  const { data: skusData, isLoading: skusLoading } = useSKUs()
  const { data: itemsData, isLoading: itemsLoading } = useItems()
  const { data: unitsData, isLoading: unitsLoading } = useUnits()
  const { data: recipesData, isLoading: recipesLoading } = useRecipes(selectedSKU)
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const deleteRecipe = useDeleteRecipe()
  const createUnit = useCreateUnit()

  // Calculate recipe cost and filter recipes
  const recipes = (recipesData?.recipes || []).map((recipe: RecipeVersion) => {
    const totalCost = recipe.ingredients?.reduce((sum: number, ing: any) => {
      const itemCost = ing.item?.standardCost || 0
      const quantity = ing.quantity || 0
      return sum + (itemCost * quantity)
    }, 0) || 0
    return { ...recipe, totalCost }
  }).filter((recipe: RecipeVersion & { totalCost: number }) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!recipe.versionNumber?.toLowerCase().includes(query)) {
        return false
      }
    }
    if (statusFilter !== '') {
      const isActive = statusFilter === 'true'
      if (recipe.isActive !== isActive) {
        return false
      }
    }
    return true
  })

  const handleAddIngredient = useCallback(() => {
    if (!currentIngredient.itemId || !currentIngredient.quantity || !currentIngredient.unitId) {
      toast.warning('Please fill in all ingredient fields')
      return
    }

    const quantity = parseFloat(currentIngredient.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Quantity must be a positive number')
      return
    }

    const item = itemsData?.items.find((i: Item) => i.id === parseInt(currentIngredient.itemId))
    const unit = unitsData?.units.find((u: Unit) => u.id === parseInt(currentIngredient.unitId))

    if (!item || !unit) {
      toast.error('Item or unit not found')
      return
    }

    // Check if ingredient already exists
    const exists = formData.ingredients.some(
      (ing) => ing.itemId === item.id && ing.unitId === unit.id
    )
    if (exists) {
      toast.warning('This ingredient is already added')
      return
    }

    setFormData((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          itemId: item.id,
          quantity,
          unitId: unit.id,
          item,
          unit,
        },
      ],
    }))

    setCurrentIngredient({
      itemId: '',
      quantity: '',
      unitId: '',
    })
    toast.success('Ingredient added')
  }, [currentIngredient, itemsData, unitsData, formData.ingredients, toast])

  const handleRemoveIngredient = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }))
    toast.info('Ingredient removed')
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // Validation
    if (!formData.skuId) {
      setFormError('Please select a SKU')
      return
    }

    if (!formData.versionNumber.trim()) {
      setFormError('Version number is required')
      return
    }

    if (formData.ingredients.length === 0) {
      setFormError('Please add at least one ingredient')
      return
    }

    // Validate effective dates
    if (formData.effectiveTo && formData.effectiveFrom > formData.effectiveTo) {
      setFormError('Effective To date must be after Effective From date')
      return
    }

    try {
      await createRecipe.mutateAsync({
        skuId: parseInt(formData.skuId),
        versionNumber: formData.versionNumber.trim(),
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || null,
        isActive: formData.isActive,
        ingredients: formData.ingredients.map((ing) => ({
          itemId: ing.itemId,
          quantity: ing.quantity,
          unitId: ing.unitId,
        })),
      })

      toast.success('Recipe created successfully!')
      setShowForm(false)
      setFormData({
        skuId: '',
        versionNumber: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
        isActive: true,
        ingredients: [],
      })
      setFormError(null)
    } catch (error: any) {
      console.error('Error creating recipe:', error)
      const errorMessage = error?.message || 'Failed to create recipe. Please try again.'
      setFormError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleCreateUnit = async () => {
    if (!newUnit.code.trim() || !newUnit.name.trim()) {
      toast.error('Unit code and name are required')
      return
    }

    const conversionFactor = parseFloat(newUnit.conversionFactor)
    if (isNaN(conversionFactor) || conversionFactor <= 0) {
      toast.error('Conversion factor must be a positive number')
      return
    }

    try {
      await createUnit.mutateAsync({
        code: newUnit.code.trim(),
        name: newUnit.name.trim(),
        baseUnitId: newUnit.baseUnitId ? parseInt(newUnit.baseUnitId) : null,
        conversionFactor,
      })

      toast.success('Unit created successfully!')
      setShowUnitForm(false)
      setNewUnit({ code: '', name: '', baseUnitId: '', conversionFactor: '1' })
    } catch (error: any) {
      console.error('Error creating unit:', error)
      const errorMessage = error?.message || 'Failed to create unit. Please try again.'
      toast.error(errorMessage)
    }
  }

  const columns = [
    {
      key: 'versionNumber',
      header: 'Version',
      render: (recipe: RecipeVersion) => (
        <span className="font-medium">v{recipe.versionNumber}</span>
      ),
    },
    {
      key: 'effectiveFrom',
      header: 'Effective From',
      render: (recipe: RecipeVersion) => formatDate(recipe.effectiveFrom),
    },
    {
      key: 'effectiveTo',
      header: 'Effective To',
      render: (recipe: RecipeVersion) => recipe.effectiveTo ? formatDate(recipe.effectiveTo) : 'Ongoing',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (recipe: RecipeVersion) => <StatusBadge status={recipe.isActive ? 'active' : 'inactive'} size="sm" />,
    },
    {
      key: 'ingredients',
      header: 'Ingredients',
      render: (recipe: RecipeVersion) => `${recipe.ingredients?.length || 0} items`,
    },
    {
      key: 'totalCost',
      header: 'Total Cost',
      render: (recipe: RecipeVersion & { totalCost?: number }) => formatCurrency(recipe.totalCost || 0),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (recipe: RecipeVersion) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEditRecipe(recipe)
            }}
            className="px-2 py-1 text-xs bg-wash text-accent-ink rounded-xl hover:opacity-80"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteRecipe(recipe.id)
            }}
            className="px-2 py-1 text-xs bg-warn-bg text-warn-ink rounded-xl hover:opacity-80"
            title="Delete"
          >
            <Trash size={12} />
          </button>
        </div>
      ),
    },
  ]

  const handleEditRecipe = async (recipe: RecipeVersion) => {
    try {
      const data = await apiClient.get<{ recipe: RecipeVersion }>(`/api/recipes/${recipe.id}`)
      setSelectedRecipe(data.recipe)
      setFormData({
        skuId: String(data.recipe.skuId),
        versionNumber: data.recipe.versionNumber,
        effectiveFrom: new Date(data.recipe.effectiveFrom).toISOString().split('T')[0],
        effectiveTo: data.recipe.effectiveTo ? new Date(data.recipe.effectiveTo).toISOString().split('T')[0] : '',
        isActive: data.recipe.isActive,
        ingredients: [],
      })
      setShowEditForm(true)
    } catch (error: any) {
      console.error('Error loading recipe:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load recipe details'
      toast.error(errorMessage)
    }
  }

  const handleDeleteRecipe = (recipeId: number) => {
    setRecipeToDelete(recipeId)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (recipeToDelete) {
      try {
        await deleteRecipe.mutateAsync(recipeToDelete)
        setShowDeleteConfirm(false)
        setRecipeToDelete(null)
        toast.success('Recipe deleted successfully!')
      } catch (error: any) {
        console.error('Error deleting recipe:', error)
        const errorMessage = error?.response?.data?.error || error?.message || 'Error deleting recipe. Please try again.'
        toast.error(errorMessage)
      }
    }
  }

  const handleUpdateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecipe) return

    try {
      await updateRecipe.mutateAsync({
        id: selectedRecipe.id,
        data: {
          effectiveFrom: formData.effectiveFrom,
          effectiveTo: formData.effectiveTo || null,
          isActive: formData.isActive,
        },
      })
      toast.success('Recipe updated successfully!')
      setShowEditForm(false)
      setSelectedRecipe(null)
    } catch (error: any) {
      console.error('Error updating recipe:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating recipe. Please try again.'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Recipes / QPS Management</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Manage recipes and quality per specification for SKUs</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(true)}
          disabled={skusLoading || !skusData?.skus?.length}
          aria-label="Create new recipe"
        >
          <Plus size={14} /> New Recipe
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="mb-4 space-y-4">
          <FormSelect
            label="Select SKU"
            name="skuId"
            value={selectedSKU}
            onChange={(e) => {
              setSelectedSKU(e.target.value)
            }}
            options={skusData?.skus.map((s: SKU) => ({ value: String(s.id), label: `${s.code} - ${s.name}` })) || []}
            placeholder="Select SKU to view recipes"
            disabled={skusLoading}
          />
          {selectedSKU && (
            <div className="flex gap-4 flex-wrap">
              <input
                type="text"
                placeholder="Search by version number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2 border border-line rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-line rounded-xl"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}
        </div>

        {selectedSKU && (
          <DataTable
            data={recipes}
            columns={columns}
            onRowClick={(recipe) => router.push(`/recipes/${recipe.id}`)}
            loading={recipesLoading}
            emptyMessage="No recipes found for this SKU"
          />
        )}
      </div>

      {/* Recipe Creation Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setFormData({
            skuId: '',
            versionNumber: '',
            effectiveFrom: new Date().toISOString().split('T')[0],
            effectiveTo: '',
            isActive: true,
            ingredients: [],
          })
          setFormError(null)
        }}
        title="Create New Recipe Version"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-warn-bg border border-warn-ink rounded-2xl p-3">
              <p className="text-sm text-warn-ink">{formError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="SKU *"
              name="skuId"
              value={formData.skuId}
              onChange={(e) => setFormData((prev) => ({ ...prev, skuId: e.target.value }))}
              options={skusData?.skus.map((s: SKU) => ({ value: String(s.id), label: `${s.code} - ${s.name}` })) || []}
              required
              placeholder="Select SKU"
              disabled={skusLoading}
            />
            <FormInput
              label="Version Number *"
              name="versionNumber"
              value={formData.versionNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, versionNumber: e.target.value }))}
              required
              placeholder="e.g., 1.0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Effective From *"
              name="effectiveFrom"
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) => setFormData((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
              required
            />
            <FormInput
              label="Effective To (Optional)"
              name="effectiveTo"
              type="date"
              value={formData.effectiveTo}
              onChange={(e) => setFormData((prev) => ({ ...prev, effectiveTo: e.target.value }))}
              min={formData.effectiveFrom}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Ingredients *</h4>
            {formData.ingredients.length === 0 && (
              <p className="text-sm text-ink-60 mb-2">Add at least one ingredient to create a recipe</p>
            )}
            <div className="grid grid-cols-4 gap-2 mb-2">
              <FormSelect
                label="Item"
                name="itemId"
                value={currentIngredient.itemId}
                onChange={(e) => setCurrentIngredient((prev) => ({ ...prev, itemId: e.target.value }))}
                options={itemsData?.items.map((i: Item) => ({ value: String(i.id), label: `${i.code} - ${i.name}` })) || []}
                placeholder="Select item"
                disabled={itemsLoading}
              />
              <FormInput
                label="Quantity"
                name="quantity"
                type="number"
                step="0.0001"
                min="0"
                value={currentIngredient.quantity}
                onChange={(e) => setCurrentIngredient((prev) => ({ ...prev, quantity: e.target.value }))}
                placeholder="0.00"
              />
              <div className="flex flex-col">
                <FormSelect
                  label="Unit"
                  name="unitId"
                  value={currentIngredient.unitId}
                  onChange={(e) => setCurrentIngredient((prev) => ({ ...prev, unitId: e.target.value }))}
                  options={unitsData?.units.map((u: Unit) => ({ value: String(u.id), label: `${u.code} - ${u.name}` })) || []}
                  placeholder="Select unit"
                  disabled={unitsLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowUnitForm(true)}
                  className="mt-1 text-xs text-accent-ink hover:opacity-70 underline text-left"
                  aria-label="Create new unit"
                >
                  + Create New Unit
                </button>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddIngredient}
                  disabled={!currentIngredient.itemId || !currentIngredient.quantity || !currentIngredient.unitId}
                  className="w-full"
                >
                  Add
                </Button>
              </div>
            </div>

            {formData.ingredients.length > 0 && (
              <div className="border border-line rounded-2xl overflow-hidden mt-2">
                <table className="min-w-full text-sm">
                  <thead className="bg-wash">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Quantity</th>
                      <th className="px-3 py-2 text-left">Unit</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {formData.ingredients.map((ing, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">{ing.item.name}</td>
                        <td className="px-3 py-2">{ing.quantity}</td>
                        <td className="px-3 py-2">{ing.unit.code}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(index)}
                            className="text-warn-ink hover:opacity-70"
                            aria-label={`Remove ${ing.item.name}`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowForm(false)
                setFormData({
                  skuId: '',
                  versionNumber: '',
                  effectiveFrom: new Date().toISOString().split('T')[0],
                  effectiveTo: '',
                  isActive: true,
                  ingredients: [],
                })
                setFormError(null)
              }}
              disabled={createRecipe.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createRecipe.isPending || formData.ingredients.length === 0}
            >
              {createRecipe.isPending && <LoadingSpinner text="" />}
              {createRecipe.isPending ? 'Creating...' : 'Create Recipe'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unit Creation Modal */}
      <Modal
        isOpen={showUnitForm}
        onClose={() => {
          setShowUnitForm(false)
          setNewUnit({ code: '', name: '', baseUnitId: '', conversionFactor: '1' })
        }}
        title="Create New Unit"
        size="md"
      >
        <div className="space-y-4">
          <FormInput
            label="Unit Code *"
            name="code"
            value={newUnit.code}
            onChange={(e) => setNewUnit((prev) => ({ ...prev, code: e.target.value }))}
            required
            placeholder="e.g., ML, KG, L"
          />
          <FormInput
            label="Unit Name *"
            name="name"
            value={newUnit.name}
            onChange={(e) => setNewUnit((prev) => ({ ...prev, name: e.target.value }))}
            required
            placeholder="e.g., Milliliter, Kilogram, Liter"
          />
          <FormSelect
            label="Base Unit (Optional)"
            name="baseUnitId"
            value={newUnit.baseUnitId}
            onChange={(e) => setNewUnit((prev) => ({ ...prev, baseUnitId: e.target.value }))}
            options={unitsData?.units.map((u: Unit) => ({ value: String(u.id), label: `${u.code} - ${u.name}` })) || []}
            placeholder="Select base unit (optional)"
            disabled={unitsLoading}
          />
          <FormInput
            label="Conversion Factor *"
            name="conversionFactor"
            type="number"
            step="0.0001"
            min="0"
            value={newUnit.conversionFactor}
            onChange={(e) => setNewUnit((prev) => ({ ...prev, conversionFactor: e.target.value }))}
            required
            placeholder="1"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowUnitForm(false)
                setNewUnit({ code: '', name: '', baseUnitId: '', conversionFactor: '1' })
              }}
              disabled={createUnit.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateUnit}
              disabled={createUnit.isPending}
            >
              {createUnit.isPending && <LoadingSpinner text="" />}
              {createUnit.isPending ? 'Creating...' : 'Create Unit'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Recipe Modal */}
      <Modal
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false)
          setSelectedRecipe(null)
        }}
        title="Edit Recipe"
        size="md"
      >
        {selectedRecipe && (
          <form onSubmit={handleUpdateRecipe} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Effective From"
                name="effectiveFrom"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => setFormData((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                required
              />
              <FormInput
                label="Effective To (Optional)"
                name="effectiveTo"
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => setFormData((prev) => ({ ...prev, effectiveTo: e.target.value }))}
                min={formData.effectiveFrom}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 accent-accent focus:ring-accent border-line rounded-xl"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-ink">
                Active
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowEditForm(false)
                  setSelectedRecipe(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={updateRecipe.isPending}
              >
                {updateRecipe.isPending ? 'Updating...' : 'Update Recipe'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setRecipeToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Recipe"
        message="Are you sure you want to delete this recipe? This action cannot be undone. Make sure the recipe is not used in any production batches."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
