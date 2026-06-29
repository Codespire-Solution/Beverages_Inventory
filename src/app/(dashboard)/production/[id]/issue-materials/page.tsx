'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useProductionBatch } from '@/hooks/useProduction'
import { useCreateMaterialIssue } from '@/hooks/useProduction'
import { useWarehouses } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api-client'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/common/Button'

export default function IssueMaterialsPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = parseInt(params.id as string)

  const { data, isLoading } = useProductionBatch(id)
  const { data: warehousesData } = useWarehouses()
  const createIssue = useCreateMaterialIssue()

  const [formData, setFormData] = useState({
    warehouseId: '',
    issueDate: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [materialPreview, setMaterialPreview] = useState<any>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  if (isLoading) {
    return <LoadingSpinner text="Loading production batch..." />
  }

  if (!data?.batch) {
    return <div>Production batch not found</div>
  }

  const batch = data.batch

  // Load material preview when warehouse is selected
  useEffect(() => {
    if (formData.warehouseId) {
      loadMaterialPreview()
    } else {
      setMaterialPreview(null)
    }
  }, [formData.warehouseId, id])

  const loadMaterialPreview = async () => {
    if (!formData.warehouseId) return

    setLoadingPreview(true)
    try {
      const preview = await apiClient.get<any>(
        `/api/production-batches/${id}/preview-material-issue?warehouseId=${formData.warehouseId}`
      )
      setMaterialPreview(preview)
      if (!preview.allSufficient) {
        toast.error('Some materials are insufficient for this production quantity')
      }
    } catch (error: any) {
      console.error('Error loading material preview:', error)
      toast.error(error?.response?.data?.error || 'Error loading material preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.warehouseId) {
      toast.error('Please select a warehouse')
      return
    }

    if (materialPreview && !materialPreview.allSufficient) {
      const confirmed = window.confirm(
        'Some materials are insufficient for this production quantity. Do you want to proceed anyway?'
      )
      if (!confirmed) return
    }

    try {
      await createIssue.mutateAsync({
        productionBatchId: id,
        warehouseId: parseInt(formData.warehouseId),
        issueDate: formData.issueDate,
        notes: formData.notes,
        items: [], // Empty array triggers auto-calculation
      })

      toast.success('Materials issued successfully!')
      router.push(`/production/${id}`)
    } catch (error: any) {
      console.error('Error creating material issue:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error issuing materials'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-medium text-4xl">Issue Materials. {batch.batchNumber}</h1>
        <div className="h-[3px] w-16 bg-accent mt-3" />
      </div>

      {/* Production Batch Summary */}
      <div className="bg-wash border border-line rounded-2xl p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold">SKU:</span> {batch.sku.name} ({batch.sku.code})
          </div>
          <div>
            <span className="font-semibold">Target Quantity:</span> {batch.targetQuantity.toLocaleString()}{' '}
            {batch.sku.unit?.code || ''}
          </div>
          <div>
            <span className="font-semibold">Production Date:</span> {formatDate(batch.productionDate)}
          </div>
        </div>
      </div>

      {/* Recipe Ingredients Summary */}
      {batch.recipeVersion && (
        <div className="bg-wash border border-line rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Recipe Ingredients (Required Quantities):</h3>
          <div className="space-y-2">
            {batch.recipeVersion.ingredients.map((ingredient: any) => {
              const requiredQty = ingredient.quantity * batch.targetQuantity
              return (
                <div key={ingredient.id} className="flex justify-between items-center text-sm">
                  <span>
                    {ingredient.item.name} ({ingredient.item.code})
                  </span>
                  <span className="font-medium">
                    {requiredQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                    {ingredient.unit.code}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-paper rounded-2xl shadow p-6 space-y-6">
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
            label="Issue Date"
            name="issueDate"
            type="date"
            value={formData.issueDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, issueDate: e.target.value }))}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <FormInput
          label="Notes (Optional)"
          name="notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
        />

        {/* Material Calculation and FIFO Preview */}
        {formData.warehouseId && (
          <div className="border border-line rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Material Calculation and FIFO Preview</h3>
              {loadingPreview && <LoadingSpinner text="Calculating..." />}
            </div>
            {materialPreview && (
              <div className="space-y-4">
                <div
                  className={`p-3 rounded-xl ${
                    materialPreview.allSufficient
                      ? 'bg-ok-bg border border-ok-bg'
                      : 'bg-warn-bg border border-warn-bg'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        materialPreview.allSufficient ? 'text-ok-ink' : 'text-warn-ink'
                      }`}
                    >
                      {materialPreview.allSufficient
                        ? 'All materials are sufficient'
                        : 'Some materials are insufficient'}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  {materialPreview.materials.map((material: any, idx: number) => (
                    <div
                      key={idx}
                      className={`border rounded-2xl p-4 ${
                        material.isSufficient ? 'bg-paper border-line' : 'bg-warn-bg border-warn-bg'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">
                            {material.item.name} ({material.item.code})
                          </h4>
                          <p className="text-sm text-ink-60">
                            Recipe: {material.recipeQuantity.toLocaleString()} per 1000 units
                          </p>
                        </div>
                        <div className="text-right">
                          {material.isSufficient ? (
                            <span className="text-ok-ink font-medium">Sufficient</span>
                          ) : (
                            <span className="text-warn-ink font-medium">Insufficient</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-ink-60">Required:</span>{' '}
                          <span className="font-medium">
                            {material.requiredQuantity.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}{' '}
                            {material.unit.code}
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-60">Available:</span>{' '}
                          <span className="font-medium">
                            {material.availableStock.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}{' '}
                            {material.unit.code}
                          </span>
                        </div>
                      </div>
                      {material.fifoError ? (
                        <div className="bg-warn-bg border border-warn-bg rounded-xl p-2 text-sm text-warn-ink">
                          {material.fifoError}
                        </div>
                      ) : material.fifoBatches && material.fifoBatches.length > 0 ? (
                        <div>
                          <h5 className="font-medium text-sm mb-2">FIFO Batch Selection:</h5>
                          <div className="space-y-1">
                            {material.fifoBatches.map((fb: any, batchIdx: number) => (
                              <div
                                key={batchIdx}
                                className="bg-wash border border-line rounded-xl p-2 text-xs"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">
                                    Batch: {fb.batch?.batchNumber || 'N/A'}
                                  </span>
                                  <span>
                                    Qty: {fb.quantity.toLocaleString(undefined, {
                                      maximumFractionDigits: 2,
                                    })}{' '}
                                    {fb.batch?.unit?.code || material.unit.code}
                                  </span>
                                </div>
                                <div className="text-ink-60 mt-1">
                                  {fb.batch?.expiryDate && (
                                    <span>
                                      Expiry: {formatDate(fb.batch.expiryDate)}
                                      {new Date(fb.batch.expiryDate) < new Date() && (
                                        <span className="text-warn-ink ml-1">(Expired)</span>
                                      )}
                                    </span>
                                  )}
                                  {fb.batch?.receivedDate && (
                                    <span className="ml-2">
                                      Received: {formatDate(fb.batch.receivedDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-wash border border-line rounded-2xl p-4">
          <p className="text-sm text-ink">
            <strong>Note:</strong> Materials will be automatically calculated from the recipe and issued using FIFO
            (First In First Out) method. The system will select the oldest batches first, considering expiry dates.
          </p>
        </div>

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
            disabled={createIssue.isPending || loadingPreview}
          >
            {(createIssue.isPending || loadingPreview) && <LoadingSpinner text="" />}
            {createIssue.isPending ? 'Issuing...' : 'Issue Materials'}
          </Button>
        </div>
      </form>
    </div>
  )
}
