'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { usePurchaseOrder } from '@/hooks/usePurchaseOrders'
import { useCreateGoodsReceipt } from '@/hooks/usePurchaseOrders'
import { useWarehouses } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import { Button } from '@/components/common/Button'
import { formatDate, formatCurrency } from '@/lib/utils'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function ReceiveGoodsPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = parseInt(params.id as string)

  const { data, isLoading } = usePurchaseOrder(id)
  const { data: warehousesData } = useWarehouses()
  const createReceipt = useCreateGoodsReceipt()

  const [formData, setFormData] = useState({
    warehouseId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] as any[],
  })

  const [itemData, setItemData] = useState<{ [key: number]: { batchNumber: string; quantity: string; expiryDate: string; unitCost: string } }>({})
  const [formErrors, setFormErrors] = useState<{ [key: number]: { quantity?: string; expiryDate?: string; unitCost?: string } }>({})

  if (isLoading) {
    return <LoadingSpinner text="Loading purchase order..." />
  }

  if (!data?.purchaseOrder) {
    return <div>Purchase order not found</div>
  }

  const po = data.purchaseOrder

  // Initialize items from PO if not already set
  useEffect(() => {
    if (formData.items.length === 0 && po.items.length > 0) {
      const initialItems = po.items.map((item: any) => ({
        itemId: item.itemId,
        quantity: item.quantity - (item.receivedQuantity || 0),
        unitId: item.unitId,
        item: item.item,
        unit: item.unit,
        orderedQuantity: item.quantity,
        receivedQuantity: item.receivedQuantity || 0,
        unitPrice: item.unitPrice,
      })).filter((item: any) => item.quantity > 0)

      setFormData((prev) => ({ ...prev, items: initialItems }))

      // Initialize item data with auto-filled values
      const initialItemData: any = {}
      initialItems.forEach((item: any) => {
        initialItemData[item.itemId] = {
          batchNumber: '', // Will be auto-generated if empty
          quantity: item.quantity.toString(),
          expiryDate: '',
          unitCost: item.unitPrice?.toString() || '', // Auto-fill from PO
        }
      })
      setItemData(initialItemData)
    }
  }, [po.items, formData.items.length])

  const handleItemDataChange = (itemId: number, field: string, value: string) => {
    setItemData((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))

    // Clear error for this field
    setFormErrors((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: undefined,
      },
    }))
  }

  const validateForm = (): boolean => {
    const errors: { [key: number]: { quantity?: string; expiryDate?: string; unitCost?: string } } = {}

    formData.items.forEach((item) => {
      const data = itemData[item.itemId]
      if (!data) return

      // Validate quantity
      const quantity = parseFloat(data.quantity || '0')
      if (isNaN(quantity) || quantity <= 0) {
        errors[item.itemId] = { ...errors[item.itemId], quantity: 'Quantity must be greater than 0' }
      } else if (quantity > item.quantity) {
        errors[item.itemId] = { ...errors[item.itemId], quantity: `Cannot exceed remaining quantity: ${item.quantity}` }
      }

      // Validate expiry date if item has expiry
      if (item.item.hasExpiry && data.expiryDate) {
        const expiryDate = new Date(data.expiryDate)
        const receiptDate = new Date(formData.receiptDate)
        if (expiryDate < receiptDate) {
          errors[item.itemId] = { ...errors[item.itemId], expiryDate: 'Expiry date cannot be before receipt date' }
        }
      }

      // Validate unit cost if provided
      if (data.unitCost) {
        const unitCost = parseFloat(data.unitCost)
        if (isNaN(unitCost) || unitCost < 0) {
          errors[item.itemId] = { ...errors[item.itemId], unitCost: 'Unit cost must be a positive number' }
        }
      }
    })

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.warehouseId) {
      toast.error('Please select a warehouse')
      return
    }

    if (formData.items.length === 0) {
      toast.error('No items to receive')
      return
    }

    if (!validateForm()) {
      toast.error('Please fix validation errors before submitting')
      return
    }

    try {
      const receiptItems = formData.items.map((item) => ({
        itemId: item.itemId,
        batchNumber: itemData[item.itemId]?.batchNumber || '', // Will be auto-generated if empty
        quantity: parseFloat(itemData[item.itemId]?.quantity || item.quantity.toString()),
        unitId: item.unitId,
        expiryDate: itemData[item.itemId]?.expiryDate || null,
        unitCost: itemData[item.itemId]?.unitCost ? parseFloat(itemData[item.itemId].unitCost) : null,
      }))

      await createReceipt.mutateAsync({
        poId: id,
        warehouseId: parseInt(formData.warehouseId),
        receiptDate: formData.receiptDate,
        notes: formData.notes,
        items: receiptItems,
      })

      toast.success('Goods received successfully!')
      router.push(`/purchase-orders/${id}`)
    } catch (error: any) {
      console.error('Error creating receipt:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error receiving goods'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-medium text-4xl">Receive Goods. {po.poNumber}</h1>
        <div className="h-[3px] w-16 bg-accent mt-3" />
      </div>

      {/* PO Summary */}
      <div className="bg-wash border border-line rounded-2xl p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold">PO Date:</span> {formatDate(po.orderDate)}
          </div>
          <div>
            <span className="font-semibold">Supplier:</span> {po.supplier.name}
          </div>
          <div>
            <span className="font-semibold">Status:</span> {po.status}
          </div>
        </div>
      </div>

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
            label="Receipt Date"
            name="receiptDate"
            type="date"
            value={formData.receiptDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, receiptDate: e.target.value }))}
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

        <div className="border-t border-line pt-6">
          <h3 className="text-lg font-semibold mb-4">Items</h3>
          {formData.items.length === 0 ? (
            <div className="text-center py-8 text-ink-60">
              All items have been received
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-wash">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Ordered</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Received</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Remaining</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Batch Number</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Expiry Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {formData.items.map((item) => {
                    const data = itemData[item.itemId] || {}
                    const errors = formErrors[item.itemId] || {}
                    const remainingQuantity = item.quantity
                    const quantity = parseFloat(data.quantity || '0')

                    return (
                      <tr key={item.itemId} className={errors.quantity ? 'bg-warn-bg' : ''}>
                        <td className="px-4 py-2">
                          <div>
                            <div className="font-medium">{item.item.name}</div>
                            <div className="text-xs text-ink-60">{item.item.code}</div>
                            {item.item.hasExpiry && (
                              <div className="text-xs text-warn-ink">Has Expiry</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {item.orderedQuantity.toLocaleString()} {item.unit.code}
                        </td>
                        <td className="px-4 py-2">
                          {item.receivedQuantity.toLocaleString()} {item.unit.code}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`font-medium ${remainingQuantity > 0 ? 'text-accent-ink' : 'text-ink-60'}`}>
                            {remainingQuantity.toLocaleString()} {item.unit.code}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={data.batchNumber || ''}
                            onChange={(e) => handleItemDataChange(item.itemId, 'batchNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-line rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                            placeholder="Auto-generated if empty"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={remainingQuantity}
                              value={data.quantity || ''}
                              onChange={(e) => handleItemDataChange(item.itemId, 'quantity', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent ${
                                errors.quantity ? 'border-warn-ink' : 'border-line'
                              }`}
                              required
                            />
                            {errors.quantity && (
                              <p className="mt-1 text-xs text-warn-ink">{errors.quantity}</p>
                            )}
                            {!errors.quantity && remainingQuantity > 0 && (
                              <p className="mt-1 text-xs text-ink-60">
                                Max: {remainingQuantity.toLocaleString()} {item.unit.code}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-sm text-ink-60">{item.unit.code}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div>
                            <input
                              type="date"
                              value={data.expiryDate || ''}
                              onChange={(e) => handleItemDataChange(item.itemId, 'expiryDate', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent ${
                                errors.expiryDate ? 'border-warn-ink' : 'border-line'
                              }`}
                              min={formData.receiptDate}
                              required={item.item.hasExpiry}
                            />
                            {errors.expiryDate && (
                              <p className="mt-1 text-xs text-warn-ink">{errors.expiryDate}</p>
                            )}
                            {item.item.hasExpiry && !data.expiryDate && (
                              <p className="mt-1 text-xs text-warn-ink">Required for items with expiry</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={data.unitCost || ''}
                              onChange={(e) => handleItemDataChange(item.itemId, 'unitCost', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent ${
                                errors.unitCost ? 'border-warn-ink' : 'border-line'
                              }`}
                              placeholder={item.unitPrice ? `PO: ${formatCurrency(item.unitPrice)}` : 'Optional'}
                            />
                            {errors.unitCost && (
                              <p className="mt-1 text-xs text-warn-ink">{errors.unitCost}</p>
                            )}
                            {item.unitPrice && !data.unitCost && (
                              <p className="mt-1 text-xs text-ink-60">
                                PO Price: {formatCurrency(item.unitPrice)}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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
            disabled={createReceipt.isPending}
          >
            {createReceipt.isPending && <LoadingSpinner text="" />}
            {createReceipt.isPending ? 'Receiving...' : 'Receive Goods'}
          </Button>
        </div>
      </form>
    </div>
  )
}
