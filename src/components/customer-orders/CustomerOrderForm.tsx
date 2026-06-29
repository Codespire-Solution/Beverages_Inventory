'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomers, useSKUs, useUnits } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api-client'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/common/Button'
import { Pencil, Trash } from '@phosphor-icons/react'

interface OrderItemPayload {
  skuId: number
  quantity: number
  unitId: number
  unitPrice: number
  taxRate: number
}

interface OrderPayload {
  customerId: number
  orderDate: string
  expectedDeliveryDate: string
  notes: string
  items: OrderItemPayload[]
}

interface CustomerOrderFormInitialData {
  customerId?: number | string
  orderDate?: string
  expectedDeliveryDate?: string
  notes?: string
  items?: any[]
}

interface CustomerOrderFormProps {
  mode: 'create' | 'edit'
  initialData?: CustomerOrderFormInitialData
  onSubmit: (payload: OrderPayload) => Promise<void>
  onSubmitAndConfirm?: (payload: OrderPayload) => Promise<void>
  submitting?: boolean
}

export default function CustomerOrderForm({
  mode,
  initialData,
  onSubmit,
  onSubmitAndConfirm,
  submitting = false,
}: CustomerOrderFormProps) {
  const router = useRouter()
  const toast = useToast()
  const [formData, setFormData] = useState({
    customerId: initialData?.customerId ? String(initialData.customerId) : '',
    orderDate: initialData?.orderDate || new Date().toISOString().split('T')[0],
    expectedDeliveryDate: initialData?.expectedDeliveryDate || '',
    notes: initialData?.notes || '',
    items: (initialData?.items || []) as any[],
  })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [currentItem, setCurrentItem] = useState({
    skuId: '',
    quantity: '',
    unitId: '',
    unitPrice: '',
    taxRate: '0',
  })
  const [stockAvailability, setStockAvailability] = useState<Record<number, number>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const { data: customersData } = useCustomers()
  const { data: skusData } = useSKUs()
  const { data: unitsData } = useUnits()

  // Auto-fill customer tax rate when customer is selected
  useEffect(() => {
    if (formData.customerId) {
      const customer = customersData?.customers.find((c: any) => c.id === parseInt(formData.customerId))
      if (customer && customer.taxRate) {
        // Update tax rate for all items if not already set
        setFormData((prev) => ({
          ...prev,
          items: prev.items.map((item) => ({
            ...item,
            taxRate: item.taxRate || customer.taxRate,
          })),
        }))
      }
    }
  }, [formData.customerId, customersData])

  const handleSKUSelect = async (skuId: string) => {
    const sku = skusData?.skus.find((s: any) => s.id === parseInt(skuId))
    if (sku) {
      setCurrentItem((prev) => ({
        ...prev,
        skuId,
        unitId: String(sku.unitId || ''),
        unitPrice: sku.sellingPrice?.toString() || '',
        taxRate: formData.customerId
          ? (customersData?.customers.find((c: any) => c.id === parseInt(formData.customerId))?.taxRate?.toString() || '0')
          : (sku.taxRate?.toString() || '0'),
      }))

      // Check stock availability
      try {
        const stockData = await apiClient.get<{ totalStock: number }>(`/api/inventory/sku/${skuId}/stock`)
        setStockAvailability((prev) => ({
          ...prev,
          [parseInt(skuId)]: stockData.totalStock || 0,
        }))
      } catch (error) {
        console.error('Error checking stock:', error)
        setStockAvailability((prev) => ({
          ...prev,
          [parseInt(skuId)]: 0,
        }))
      }
    }
  }

  const handleAddItem = () => {
    const errors: Record<string, string> = {}

    if (!currentItem.skuId) {
      errors.skuId = 'SKU is required'
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

    const sku = skusData?.skus.find((s: any) => s.id === parseInt(currentItem.skuId))
    if (!sku) {
      toast.error('SKU not found')
      return
    }

    const quantity = parseFloat(currentItem.quantity)

    // Stock availability check — only enforce when stock for this SKU is actually known.
    // In edit mode, pre-filled items were never re-selected, so their stock is unknown;
    // treating unknown as 0 would falsely block every edit.
    const availableStock = stockAvailability[parseInt(currentItem.skuId)]
    if (availableStock !== undefined && quantity > availableStock) {
      toast.error(`Insufficient stock. Available: ${availableStock.toLocaleString()}`)
      setFormErrors({ quantity: `Available stock: ${availableStock.toLocaleString()}` })
      return
    }

    const newItem = {
      skuId: parseInt(currentItem.skuId),
      quantity,
      unitId: parseInt(currentItem.unitId),
      unitPrice: parseFloat(currentItem.unitPrice),
      taxRate: parseFloat(currentItem.taxRate) || 0,
      sku,
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
      skuId: '',
      quantity: '',
      unitId: '',
      unitPrice: '',
      taxRate: formData.customerId
        ? (customersData?.customers.find((c: any) => c.id === parseInt(formData.customerId))?.taxRate?.toString() || '0')
        : '0',
    })
    setFormErrors({})
  }

  const handleEditItem = (index: number) => {
    const item = formData.items[index]
    setCurrentItem({
      skuId: String(item.skuId),
      quantity: String(item.quantity),
      unitId: String(item.unitId),
      unitPrice: String(item.unitPrice),
      taxRate: String(item.taxRate || 0),
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

  const checkStockAvailability = async () => {
    const stockIssues: string[] = []
    for (const item of formData.items) {
      try {
        const stockData = await apiClient.get<{ totalStock: number }>(`/api/inventory/sku/${item.skuId}/stock`)
        const availableStock = stockData.totalStock || 0
        if (item.quantity > availableStock) {
          const sku = skusData?.skus.find((s: any) => s.id === item.skuId)
          stockIssues.push(`${sku?.name || 'SKU'}: Required ${item.quantity}, Available ${availableStock}`)
        }
      } catch (error) {
        console.error('Error checking stock:', error)
      }
    }
    return stockIssues
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

  const buildPayload = (): OrderPayload => ({
    customerId: parseInt(formData.customerId),
    orderDate: formData.orderDate,
    expectedDeliveryDate: formData.expectedDeliveryDate,
    notes: formData.notes,
    items: formData.items.map((item) => ({
      skuId: item.skuId,
      quantity: item.quantity,
      unitId: item.unitId,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate || 0,
    })),
  })

  const handleSubmit = async (e: React.FormEvent, action: 'submit' | 'confirm') => {
    e.preventDefault()

    if (!formData.customerId) {
      toast.error('Please select a customer')
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

    // Check credit limit
    const customer = customersData?.customers.find((c: any) => c.id === parseInt(formData.customerId))
    if (customer && customer.creditLimit && totals.grandTotal > customer.creditLimit) {
      toast.error(`Order total exceeds credit limit of ${formatCurrency(customer.creditLimit)}`)
      return
    }

    // Check stock availability before confirming
    if (action === 'confirm') {
      const stockIssues = await checkStockAvailability()
      if (stockIssues.length > 0) {
        toast.error(`Insufficient stock: ${stockIssues.join(', ')}`)
        return
      }
    }

    const payload = buildPayload()

    if (action === 'confirm' && onSubmitAndConfirm) {
      await onSubmitAndConfirm(payload)
    } else {
      await onSubmit(payload)
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, 'submit')} className="bg-paper rounded-2xl shadow p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Customer"
          name="customerId"
          value={formData.customerId}
          onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
          options={customersData?.customers.map((c: any) => ({ value: String(c.id), label: c.name })) || []}
          required
          placeholder="Select customer"
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

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">Items</h3>
        <div className="grid grid-cols-6 gap-4 mb-4">
          <FormSelect
            label="SKU"
            name="skuId"
            value={currentItem.skuId}
            onChange={(e) => handleSKUSelect(e.target.value)}
            options={skusData?.skus.map((s: any) => ({ value: String(s.id), label: `${s.code} - ${s.name}` })) || []}
            placeholder="Select SKU"
            error={formErrors.skuId}
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
            helperText={currentItem.skuId && stockAvailability[parseInt(currentItem.skuId)] !== undefined
              ? `Available: ${stockAvailability[parseInt(currentItem.skuId)].toLocaleString()}`
              : undefined}
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
            <Button
              type="button"
              variant="primary"
              onClick={handleAddItem}
              disabled={!currentItem.skuId || !currentItem.quantity || !currentItem.unitId || !currentItem.unitPrice}
              className="flex-1"
            >
              {editingIndex !== null ? 'Update' : 'Add'}
            </Button>
            {editingIndex !== null && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingIndex(null)
                  setCurrentItem({
                    skuId: '',
                    quantity: '',
                    unitId: '',
                    unitPrice: '',
                    taxRate: formData.customerId
                      ? (customersData?.customers.find((c: any) => c.id === parseInt(formData.customerId))?.taxRate?.toString() || '0')
                      : '0',
                  })
                  setFormErrors({})
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        {formData.items.length > 0 && (
          <div className="border border-line rounded-2xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-wash">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">SKU</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit Price</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Line Total</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Tax Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Total</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {formData.items.map((item, index) => {
                  const skuDetails = skusData?.skus.find((s: any) => s.id === item.skuId)
                  const unitDetails = item.unit || unitsData?.units.find((u: any) => u.id === item.unitId)
                  const lineTotal = item.quantity * item.unitPrice
                  const lineTax = lineTotal * (item.taxRate || 0) / 100
                  const lineGrandTotal = lineTotal + lineTax
                  const availableStock = stockAvailability[item.skuId]
                  const lowStock = availableStock !== undefined && item.quantity > availableStock
                  return (
                    <tr key={index} className={lowStock ? 'bg-warn-bg' : ''}>
                      <td className="px-4 py-2">
                        <div>
                          <div className="font-medium">{skuDetails?.name}</div>
                          {lowStock && (
                            <div className="text-xs text-warn-ink">Low Stock</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">{item.quantity.toLocaleString()}</td>
                      <td className="px-4 py-2">{unitDetails?.code || '-'}</td>
                      <td className="px-4 py-2">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2">{formatCurrency(lineTotal)}</td>
                      <td className="px-4 py-2">{formatCurrency(lineTax)}</td>
                      <td className="px-4 py-2 font-medium">{formatCurrency(lineGrandTotal)}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditItem(index)}
                            className="text-accent-ink hover:opacity-70"
                            title="Edit"
                          >
                            <Pencil size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-warn-ink hover:opacity-70"
                            title="Remove"
                          >
                            <Trash size={16} weight="bold" />
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
            {formData.customerId && customersData?.customers.find((c: any) => c.id === parseInt(formData.customerId))?.creditLimit && (
              <div className={`text-sm ${
                totals.grandTotal > (customersData?.customers.find((c: any) => c.id === parseInt(formData.customerId))?.creditLimit || 0)
                  ? 'text-warn-ink'
                  : 'text-ink-60'
              }`}>
                Credit Limit: {formatCurrency(customersData?.customers.find((c: any) => c.id === parseInt(formData.customerId))?.creditLimit || 0)}
              </div>
            )}
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
        {mode === 'create' ? (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={(e) => handleSubmit(e, 'submit')}
              disabled={submitting}
            >
              {submitting && <LoadingSpinner text="" />}
              Save as Pending
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={(e) => handleSubmit(e, 'confirm')}
              disabled={submitting}
            >
              {submitting && <LoadingSpinner text="" />}
              {submitting ? 'Creating...' : 'Create & Confirm'}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={(e) => handleSubmit(e, 'submit')}
            disabled={submitting}
          >
            {submitting && <LoadingSpinner text="" />}
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>
    </form>
  )
}
