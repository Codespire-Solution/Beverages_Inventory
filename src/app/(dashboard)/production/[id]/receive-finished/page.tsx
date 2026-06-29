'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useProductionBatch } from '@/hooks/useProduction'
import { useCompleteProductionBatch } from '@/hooks/useProduction'
import { useCreateFinishedGoodsReceipt } from '@/hooks/useProduction'
import { useWarehouses } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/common/Button'

export default function ReceiveFinishedGoodsPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = parseInt(params.id as string)

  const { data, isLoading } = useProductionBatch(id)
  const { data: warehousesData } = useWarehouses()
  const completeBatch = useCompleteProductionBatch()
  const createReceipt = useCreateFinishedGoodsReceipt()

  const [formData, setFormData] = useState({
    warehouseId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    actualQuantity: '',
    wasteQuantity: '0',
    batchNumber: '',
    expiryDate: '',
    notes: '',
  })

  const [formErrors, setFormErrors] = useState<{
    actualQuantity?: string
    wasteQuantity?: string
    expiryDate?: string
  }>({})

  if (isLoading) {
    return <LoadingSpinner text="Loading production batch..." />
  }

  if (!data?.batch) {
    return <div>Production batch not found</div>
  }

  const batch = data.batch
  const skuUnit = batch.sku.unit

  // Validate form
  const validateForm = (): boolean => {
    const errors: typeof formErrors = {}

    // Validate actual quantity
    const actualQty = parseFloat(formData.actualQuantity)
    if (isNaN(actualQty) || actualQty <= 0) {
      errors.actualQuantity = 'Actual quantity must be greater than 0'
    }

    // Validate waste quantity
    const wasteQty = parseFloat(formData.wasteQuantity || '0')
    if (isNaN(wasteQty) || wasteQty < 0) {
      errors.wasteQuantity = 'Waste quantity must be 0 or greater'
    }

    // Validate that actual + waste doesn't exceed target (with some tolerance)
    if (!errors.actualQuantity && !errors.wasteQuantity) {
      const total = actualQty + wasteQty
      if (total > batch.targetQuantity * 1.1) {
        // Allow 10% tolerance
        errors.actualQuantity = `Total (actual + waste) exceeds target quantity by more than 10%`
      }
    }

    // Validate expiry date if SKU has expiry
    if (batch.sku.hasExpiry && formData.expiryDate) {
      const expiryDate = new Date(formData.expiryDate)
      const receiptDate = new Date(formData.receiptDate)
      if (expiryDate < receiptDate) {
        errors.expiryDate = 'Expiry date cannot be before receipt date'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field
    setFormErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.warehouseId) {
      toast.error('Please select a warehouse')
      return
    }

    if (!validateForm()) {
      toast.error('Please fix validation errors before submitting')
      return
    }

    try {
      // First complete the production batch
      await completeBatch.mutateAsync({
        id: batch.id,
        data: {
          actualQuantity: parseFloat(formData.actualQuantity),
          wasteQuantity: parseFloat(formData.wasteQuantity || '0'),
        },
      })

      // Then create finished goods receipt
      await createReceipt.mutateAsync({
        productionBatchId: id,
        warehouseId: parseInt(formData.warehouseId),
        receiptDate: formData.receiptDate,
        notes: formData.notes,
        items: [
          {
            skuId: batch.skuId,
            batchNumber: formData.batchNumber || undefined,
            quantity: parseFloat(formData.actualQuantity),
            unitId: batch.sku.unitId,
            expiryDate: formData.expiryDate || null,
            productionDate: formData.receiptDate,
          },
        ],
      })

      toast.success('Finished goods received successfully!')
      router.push(`/production/${id}`)
    } catch (error: any) {
      console.error('Error receiving finished goods:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error receiving finished goods'
      toast.error(errorMessage)
    }
  }

  // Calculate yield and waste percentages
  const actualQty = parseFloat(formData.actualQuantity || '0')
  const wasteQty = parseFloat(formData.wasteQuantity || '0')
  const totalProduced = actualQty + wasteQty
  const yieldPercentage = batch.targetQuantity > 0 ? (actualQty / batch.targetQuantity) * 100 : 0
  const wastePercentage = batch.targetQuantity > 0 ? (wasteQty / batch.targetQuantity) * 100 : 0
  const efficiency = batch.targetQuantity > 0 ? (actualQty / batch.targetQuantity) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-medium text-4xl">Receive Finished Goods. {batch.batchNumber}</h1>
        <div className="h-[3px] w-16 bg-accent mt-3" />
      </div>

      <div className="bg-wash border border-line rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold">Target Quantity:</span>{' '}
            {batch.targetQuantity.toLocaleString()} {skuUnit?.code || ''}
          </div>
          <div>
            <span className="font-semibold">SKU:</span> {batch.sku.name} ({batch.sku.code})
          </div>
          <div>
            <span className="font-semibold">Production Date:</span> {formatDate(batch.productionDate)}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-paper rounded-2xl shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Warehouse"
            name="warehouseId"
            value={formData.warehouseId}
            onChange={(e) => handleFieldChange('warehouseId', e.target.value)}
            options={warehousesData?.warehouses.map((w: any) => ({ value: w.id, label: w.name })) || []}
            required
            placeholder="Select warehouse"
          />
          <FormInput
            label="Receipt Date"
            name="receiptDate"
            type="date"
            value={formData.receiptDate}
            onChange={(e) => handleFieldChange('receiptDate', e.target.value)}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Actual Quantity Produced"
            name="actualQuantity"
            type="number"
            step="0.01"
            min="0"
            value={formData.actualQuantity}
            onChange={(e) => handleFieldChange('actualQuantity', e.target.value)}
            required
            error={formErrors.actualQuantity}
            helperText={skuUnit ? `Unit: ${skuUnit.code}` : undefined}
          />
          <FormInput
            label="Waste Quantity"
            name="wasteQuantity"
            type="number"
            step="0.01"
            min="0"
            value={formData.wasteQuantity}
            onChange={(e) => handleFieldChange('wasteQuantity', e.target.value)}
            error={formErrors.wasteQuantity}
            helperText={skuUnit ? `Unit: ${skuUnit.code}` : undefined}
          />
        </div>

        {/* Yield and Waste Display */}
        {actualQty > 0 && (
          <div className="grid grid-cols-3 gap-4 bg-wash border border-line rounded-2xl p-4">
            <div>
              <div className="text-sm text-ink-60">Yield</div>
              <div className={`text-lg font-semibold ${yieldPercentage >= 95 ? 'text-ok-ink' : yieldPercentage >= 90 ? 'text-warn-ink' : 'text-warn-ink'}`}>
                {yieldPercentage.toFixed(2)}%
              </div>
              <div className="text-xs text-ink-60">
                {actualQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                {skuUnit?.code || ''} / {batch.targetQuantity.toLocaleString()} {skuUnit?.code || ''}
              </div>
            </div>
            <div>
              <div className="text-sm text-ink-60">Waste</div>
              <div className={`text-lg font-semibold ${wastePercentage <= 5 ? 'text-ok-ink' : wastePercentage <= 10 ? 'text-warn-ink' : 'text-warn-ink'}`}>
                {wastePercentage.toFixed(2)}%
              </div>
              <div className="text-xs text-ink-60">
                {wasteQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                {skuUnit?.code || ''} / {batch.targetQuantity.toLocaleString()} {skuUnit?.code || ''}
              </div>
            </div>
            <div>
              <div className="text-sm text-ink-60">Efficiency</div>
              <div className={`text-lg font-semibold ${efficiency >= 95 ? 'text-ok-ink' : efficiency >= 90 ? 'text-warn-ink' : 'text-warn-ink'}`}>
                {efficiency.toFixed(2)}%
              </div>
              <div className="text-xs text-ink-60">
                Total: {totalProduced.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                {skuUnit?.code || ''}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Batch Number (Optional)"
            name="batchNumber"
            value={formData.batchNumber}
            onChange={(e) => handleFieldChange('batchNumber', e.target.value)}
            placeholder="Auto-generated if empty"
          />
          <FormInput
            label={batch.sku.hasExpiry ? 'Expiry Date (Required)' : 'Expiry Date (Optional)'}
            name="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={(e) => handleFieldChange('expiryDate', e.target.value)}
            min={formData.receiptDate}
            required={batch.sku.hasExpiry}
            error={formErrors.expiryDate}
            helperText={batch.sku.hasExpiry && !formData.expiryDate ? 'Required for SKUs with expiry' : undefined}
          />
        </div>

        <FormInput
          label="Notes (Optional)"
          name="notes"
          value={formData.notes}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
        />

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
            disabled={completeBatch.isPending || createReceipt.isPending}
          >
            {(completeBatch.isPending || createReceipt.isPending) && <LoadingSpinner text="" />}
            {(completeBatch.isPending || createReceipt.isPending) ? 'Processing...' : 'Receive Finished Goods'}
          </Button>
        </div>
      </form>
    </div>
  )
}
