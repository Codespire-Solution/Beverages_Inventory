'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreatePurchaseOrder, useConfirmPurchaseOrder } from '@/hooks/usePurchaseOrders'
import { useSuppliers, useUnits } from '@/hooks/useMasterData'
import { useItems } from '@/hooks/useItems'
import { useToast } from '@/contexts/ToastContext'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { Button } from '@/components/common/Button'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash } from '@phosphor-icons/react'

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const toast = useToast()
  const [formData, setFormData] = useState({
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    notes: '',
    items: [] as any[],
  })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [currentItem, setCurrentItem] = useState({
    itemId: '',
    quantity: '',
    unitId: '',
    unitPrice: '',
    taxRate: '0',
    notes: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const { data: suppliersData } = useSuppliers()
  const { data: itemsData } = useItems()
  const { data: unitsData } = useUnits()
  const createPO = useCreatePurchaseOrder()
  const confirmPO = useConfirmPurchaseOrder()

  const handleItemSelect = (itemId: string) => {
    const item = itemsData?.items.find((i: any) => i.id === parseInt(itemId))
    if (item) {
      setCurrentItem((prev) => ({
        ...prev,
        itemId,
        unitId: String(item.baseUnitId || ''),
        unitPrice: item.standardCost?.toString() || '',
        taxRate: item.taxRate?.toString() || '0',
      }))
    }
  }

  const handleAddItem = () => {
    const errors: Record<string, string> = {}

    if (!currentItem.itemId) {
      errors.itemId = 'Item is required'
    }
    if (!currentItem.quantity) {
      errors.quantity = 'Quantity is required'
    }
    if (!currentItem.unitId) {
      errors.unitId = 'Unit is required'
    }
    if (!currentItem.unitPrice) {
      errors.unitPrice = 'Unit price is required'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error('Please fill in all required fields')
      return
    }

    const item = itemsData?.items.find((i: any) => i.id === parseInt(currentItem.itemId))
    if (!item) {
      toast.error('Item not found')
      return
    }

    const quantity = parseFloat(currentItem.quantity)

    // MOQ validation
    if (item.moq && quantity < item.moq) {
      toast.error(`Quantity must be at least ${item.moq} (MOQ)`)
      setFormErrors({ quantity: `Minimum order quantity is ${item.moq}` })
      return
    }

    const newItem = {
      itemId: parseInt(currentItem.itemId),
      quantity,
      unitId: parseInt(currentItem.unitId),
      unitPrice: parseFloat(currentItem.unitPrice),
      taxRate: parseFloat(currentItem.taxRate) || 0,
      notes: currentItem.notes,
      item,
      unit: unitsData?.units.find((u: any) => u.id === parseInt(currentItem.unitId)),
    }

    if (editingIndex !== null) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((it, idx) => idx === editingIndex ? newItem : it),
      }))
      setEditingIndex(null)
      toast.success('Item updated')
    } else {
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }))
      toast.success('Item added')
    }

    setCurrentItem({
      itemId: '',
      quantity: '',
      unitId: '',
      unitPrice: '',
      taxRate: '0',
      notes: '',
    })
    setFormErrors({})
  }

  const handleEditItem = (index: number) => {
    const item = formData.items[index]
    setCurrentItem({
      itemId: String(item.itemId),
      quantity: String(item.quantity),
      unitId: String(item.unitId),
      unitPrice: String(item.unitPrice),
      taxRate: String(item.taxRate || 0),
      notes: item.notes || '',
    })
    setEditingIndex(index)
  }

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
    toast.info('Item removed')
  }

  const calculateTotals = () => {
    let total = 0
    let tax = 0
    formData.items.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice
      const lineTax = lineTotal * (item.taxRate || 0) / 100
      total += lineTotal
      tax += lineTax
    })
    return { total, tax, grandTotal: total + tax }
  }

  const totals = calculateTotals()

  const handleSubmit = async (e: React.FormEvent, status: string) => {
    e.preventDefault()

    if (!formData.supplierId) {
      toast.error('Please select a supplier')
      return
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    // Validate expected delivery date
    if (formData.expectedDeliveryDate && formData.expectedDeliveryDate < formData.orderDate) {
      toast.error('Expected delivery date must be after order date')
      return
    }

    try {
      const result = await createPO.mutateAsync({
        ...formData,
        supplierId: parseInt(formData.supplierId),
        status,
        items: formData.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitId: item.unitId,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
        })),
      })

      if (status === 'confirmed') {
        await confirmPO.mutateAsync(result.purchaseOrder.id)
        toast.success('Purchase order created and confirmed successfully!')
      } else {
        toast.success('Purchase order saved as draft!')
      }

      router.push(`/purchase-orders/${result.purchaseOrder.id}`)
    } catch (error: any) {
      console.error('Error creating PO:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error creating purchase order. Please try again.'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-medium text-4xl">Create Purchase Order</h1>
        <div className="h-[3px] w-16 bg-accent mt-3" />
      </div>

      <form onSubmit={(e) => handleSubmit(e, 'draft')} className="bg-paper rounded-2xl shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormSelect
            label="Supplier"
            name="supplierId"
            value={formData.supplierId}
            onChange={(e) => setFormData((prev) => ({ ...prev, supplierId: e.target.value }))}
            options={suppliersData?.suppliers.map((s: any) => ({ value: String(s.id), label: s.name })) || []}
            required
            placeholder="Select supplier"
          />
          <FormInput
            label="Order Date"
            name="orderDate"
            type="date"
            value={formData.orderDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, orderDate: e.target.value }))}
            required
          />
        </div>

        <FormInput
          label="Expected Delivery Date (Optional)"
          name="expectedDeliveryDate"
          type="date"
          value={formData.expectedDeliveryDate}
          onChange={(e) => setFormData((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))}
          min={formData.orderDate}
        />

        <FormInput
          label="Notes (Optional)"
          name="notes"
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
        />

        <div className="border-t border-line pt-4">
          <h3 className="text-lg font-semibold mb-4">Items</h3>
          <div className="grid grid-cols-6 gap-4 mb-4">
            <FormSelect
              label="Item"
              name="itemId"
              value={currentItem.itemId}
              onChange={(e) => handleItemSelect(e.target.value)}
              options={itemsData?.items.map((i: any) => ({ value: String(i.id), label: `${i.code} - ${i.name}` })) || []}
              placeholder="Select item"
              error={formErrors.itemId}
            />
            <FormInput
              label="Quantity"
              name="quantity"
              type="number"
              step="0.01"
              value={currentItem.quantity}
              onChange={(e) => {
                setCurrentItem((prev) => ({ ...prev, quantity: e.target.value }))
                setFormErrors((prev) => ({ ...prev, quantity: '' }))
              }}
              error={formErrors.quantity}
            />
            <FormSelect
              label="Unit"
              name="unitId"
              value={currentItem.unitId}
              onChange={(e) => setCurrentItem((prev) => ({ ...prev, unitId: e.target.value }))}
              options={unitsData?.units.map((u: any) => ({ value: String(u.id), label: `${u.code} - ${u.name}` })) || []}
              placeholder="Select unit"
              error={formErrors.unitId}
            />
            <FormInput
              label="Unit Price"
              name="unitPrice"
              type="number"
              step="0.01"
              value={currentItem.unitPrice}
              onChange={(e) => setCurrentItem((prev) => ({ ...prev, unitPrice: e.target.value }))}
              error={formErrors.unitPrice}
            />
            <FormInput
              label="Tax Rate (%)"
              name="taxRate"
              type="number"
              step="0.01"
              value={currentItem.taxRate}
              onChange={(e) => setCurrentItem((prev) => ({ ...prev, taxRate: e.target.value }))}
            />
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!currentItem.itemId || !currentItem.quantity || !currentItem.unitId || !currentItem.unitPrice}
                className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 bg-ink text-white rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <Plus weight="bold" size={13} />
                {editingIndex !== null ? 'Update' : 'Add'}
              </button>
              {editingIndex !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null)
                    setCurrentItem({
                      itemId: '',
                      quantity: '',
                      unitId: '',
                      unitPrice: '',
                      taxRate: '0',
                      notes: '',
                    })
                    setFormErrors({})
                  }}
                  className="px-4 py-2 bg-wash text-ink rounded-xl hover:bg-line text-sm font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {formData.items.length > 0 && (
            <div className="border border-line rounded-2xl overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-wash">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Line Total</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Tax Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {formData.items.map((item, index) => {
                    const itemDetails = itemsData?.items.find((i: any) => i.id === item.itemId)
                    const lineTotal = item.quantity * item.unitPrice
                    const lineTax = lineTotal * (item.taxRate || 0) / 100
                    const lineGrandTotal = lineTotal + lineTax
                    return (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <div>
                            <div className="font-medium">{itemDetails?.name}</div>
                            {itemDetails?.moq && (
                              <div className="text-xs text-ink-60">MOQ: {itemDetails.moq}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">{item.quantity.toLocaleString()}</td>
                        <td className="px-4 py-2">{item.unit?.code || '-'}</td>
                        <td className="px-4 py-2">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2">{formatCurrency(lineTotal)}</td>
                        <td className="px-4 py-2">{formatCurrency(lineTax)}</td>
                        <td className="px-4 py-2 font-medium">{formatCurrency(lineGrandTotal)}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditItem(index)}
                              className="text-ink-60 hover:text-ink"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-warn-ink hover:opacity-80"
                              title="Remove"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <div className="text-right space-y-1">
              <div className="text-sm text-ink-60">
                Subtotal: <span className="font-medium">{formatCurrency(totals.total)}</span>
              </div>
              <div className="text-sm text-ink-60">
                Tax: <span className="font-medium">{formatCurrency(totals.tax)}</span>
              </div>
              <div className="text-lg font-bold">
                Grand Total: {formatCurrency(totals.grandTotal)}
              </div>
            </div>
          </div>
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
            type="button"
            variant="ghost"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={createPO.isPending}
          >
            {createPO.isPending && <LoadingSpinner text="" />}
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={(e) => handleSubmit(e, 'confirmed')}
            disabled={createPO.isPending || confirmPO.isPending}
          >
            {(createPO.isPending || confirmPO.isPending) && <LoadingSpinner text="" />}
            {createPO.isPending || confirmPO.isPending ? 'Creating...' : 'Create & Confirm'}
          </Button>
        </div>
      </form>
    </div>
  )
}
