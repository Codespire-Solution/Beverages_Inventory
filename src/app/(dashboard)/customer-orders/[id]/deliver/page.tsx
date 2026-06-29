'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useCustomerOrder } from '@/hooks/useCustomerOrders'
import { useCreateSalesDelivery } from '@/hooks/useCustomerOrders'
import { useWarehouses } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api-client'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/common/Button'
import { Check, Package } from '@phosphor-icons/react'

export default function CreateDeliveryPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = parseInt(params.id as string)

  const { data, isLoading } = useCustomerOrder(id)
  const { data: warehousesData } = useWarehouses()
  const createDelivery = useCreateSalesDelivery()

  const [formData, setFormData] = useState({
    warehouseId: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] as any[],
  })

  const [itemQuantities, setItemQuantities] = useState<{ [key: number]: string }>({})
  const [deliveryPreview, setDeliveryPreview] = useState<any>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [formErrors, setFormErrors] = useState<{ [key: number]: { quantity?: string } }>({})

  useEffect(() => {
    if (data?.order && formData.items.length === 0) {
      const initialItems = data.order.items
        .filter((item: any) => item.fulfilledQuantity < item.quantity)
        .map((item: any) => ({
          skuId: item.skuId,
          quantity: item.quantity - item.fulfilledQuantity,
          unitId: item.unitId,
          sku: item.sku,
          unit: item.unit,
        }))

      setFormData((prev) => ({ ...prev, items: initialItems }))

      const initialQuantities: any = {}
      initialItems.forEach((item: any) => {
        initialQuantities[item.skuId] = item.quantity.toString()
      })
      setItemQuantities(initialQuantities)
    }
  }, [data?.order, formData.items.length])

  // Load delivery preview when warehouse or quantities change
  useEffect(() => {
    if (formData.warehouseId && formData.items.length > 0) {
      loadDeliveryPreview()
    } else {
      setDeliveryPreview(null)
    }
  }, [formData.warehouseId, itemQuantities, id])

  const loadDeliveryPreview = async () => {
    if (!formData.warehouseId) return

    setLoadingPreview(true)
    try {
      const items = formData.items
        .filter((item) => parseFloat(itemQuantities[item.skuId] || '0') > 0)
        .map((item) => ({
          skuId: item.skuId,
          quantity: parseFloat(itemQuantities[item.skuId] || item.quantity.toString()),
        }))

      if (items.length === 0) {
        setDeliveryPreview(null)
        return
      }

      const preview = await apiClient.get<any>(
        `/api/customer-orders/${id}/preview-delivery?warehouseId=${formData.warehouseId}&items=${encodeURIComponent(JSON.stringify(items))}`
      )
      setDeliveryPreview(preview)
      if (!preview.allSufficient) {
        toast.error('Some items have insufficient stock')
      }
    } catch (error: any) {
      console.error('Error loading delivery preview:', error)
      toast.error(error?.response?.data?.error || 'Error loading delivery preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading order..." />
  }

  if (!data?.order) {
    return <div>Order not found</div>
  }

  const order = data.order

  const handleQuantityChange = (skuId: number, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      setFormErrors((prev) => ({
        ...prev,
        [skuId]: { quantity: 'Quantity must be 0 or greater' },
      }))
      return
    }

    const orderItem = order.items.find((oi: any) => oi.skuId === skuId)
    const remaining = orderItem ? orderItem.quantity - orderItem.fulfilledQuantity : 0

    if (numValue > remaining) {
      setFormErrors((prev) => ({
        ...prev,
        [skuId]: { quantity: `Cannot exceed remaining quantity: ${remaining}` },
      }))
      return
    }

    setItemQuantities((prev) => ({
      ...prev,
      [skuId]: value,
    }))

    // Clear error
    setFormErrors((prev) => ({
      ...prev,
      [skuId]: {},
    }))
  }

  const validateForm = (): boolean => {
    const errors: { [key: number]: { quantity?: string } } = {}

    formData.items.forEach((item) => {
      const quantity = parseFloat(itemQuantities[item.skuId] || '0')
      const orderItem = order.items.find((oi: any) => oi.skuId === item.skuId)
      const remaining = orderItem ? orderItem.quantity - orderItem.fulfilledQuantity : 0

      if (quantity <= 0) {
        errors[item.skuId] = { quantity: 'Quantity must be greater than 0' }
      } else if (quantity > remaining) {
        errors[item.skuId] = { quantity: `Cannot exceed remaining quantity: ${remaining}` }
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
      toast.error('No items to deliver')
      return
    }

    if (!validateForm()) {
      toast.error('Please fix validation errors before submitting')
      return
    }

    if (deliveryPreview && !deliveryPreview.allSufficient) {
      const confirmed = window.confirm(
        'Some items have insufficient stock. Do you want to proceed anyway?'
      )
      if (!confirmed) return
    }

    try {
      const deliveryItems = formData.items
        .filter((item) => parseFloat(itemQuantities[item.skuId] || '0') > 0)
        .map((item) => ({
          skuId: item.skuId,
          quantity: parseFloat(itemQuantities[item.skuId] || item.quantity.toString()),
          unitId: item.unitId,
        }))

      await createDelivery.mutateAsync({
        orderId: id,
        warehouseId: parseInt(formData.warehouseId),
        deliveryDate: formData.deliveryDate,
        notes: formData.notes,
        items: deliveryItems,
      })

      toast.success('Delivery created successfully!')
      router.push(`/customer-orders/${id}`)
    } catch (error: any) {
      console.error('Error creating delivery:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error creating delivery'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-medium text-4xl">Deliver Order {order.orderNumber}</h1>
        <div className="h-[3px] w-16 bg-accent mt-3" />
      </div>

      {/* Order Summary */}
      <div className="bg-wash border border-line rounded-2xl p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold">Customer:</span> {order.customer.name}
          </div>
          <div>
            <span className="font-semibold">Order Date:</span> {formatDate(order.orderDate)}
          </div>
          <div>
            <span className="font-semibold">Status:</span> {order.status}
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
            label="Delivery Date"
            name="deliveryDate"
            type="date"
            value={formData.deliveryDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
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
              All items have been fulfilled
            </div>
          ) : (
            <>
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full">
                  <thead className="bg-wash">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Ordered</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Fulfilled</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Remaining</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Deliver Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {formData.items.map((item) => {
                      const orderItem = order.items.find((oi: any) => oi.skuId === item.skuId)
                      const remaining = orderItem ? orderItem.quantity - orderItem.fulfilledQuantity : item.quantity
                      const errors = formErrors[item.skuId] || {}
                      return (
                        <tr key={item.skuId} className={errors.quantity ? 'bg-warn-bg' : ''}>
                          <td className="px-4 py-2">
                            <div>
                              <div className="font-medium">{item.sku.name}</div>
                              <div className="text-xs text-ink-60">{item.sku.code}</div>
                            </div>
                          </td>
                          <td className="px-4 py-2">{orderItem?.quantity || item.quantity}</td>
                          <td className="px-4 py-2">{orderItem?.fulfilledQuantity || 0}</td>
                          <td className="px-4 py-2">
                            <span className="font-medium text-accent-ink">{remaining}</span>
                          </td>
                          <td className="px-4 py-2">
                            <div>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={remaining}
                                value={itemQuantities[item.skuId] || remaining}
                                onChange={(e) => handleQuantityChange(item.skuId, e.target.value)}
                                className={`w-24 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent ${
                                  errors.quantity ? 'border-warn-ink' : 'border-line'
                                }`}
                                required
                              />
                              {errors.quantity && (
                                <p className="mt-1 text-xs text-warn-ink">{errors.quantity}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-sm text-ink-60">{item.unit?.code || ''}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* FIFO Preview */}
        {formData.warehouseId && deliveryPreview && (
          <div className="border border-line rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">FIFO Batch Selection Preview</h3>
              {loadingPreview && <LoadingSpinner text="Loading..." />}
            </div>
            {deliveryPreview && (
              <div className="space-y-4">
                <div
                  className={`p-3 rounded-xl ${
                    deliveryPreview.allSufficient
                      ? 'bg-ok-bg border border-ok-ink/30'
                      : 'bg-warn-bg border border-warn-ink/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        deliveryPreview.allSufficient ? 'text-ok-ink' : 'text-warn-ink'
                      }`}
                    >
                      {deliveryPreview.allSufficient
                        ? 'All items have sufficient stock'
                        : 'Some items have insufficient stock'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  {deliveryPreview.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className={`border rounded-2xl p-3 ${
                        item.isSufficient ? 'bg-paper border-line' : 'bg-warn-bg border-warn-ink/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">
                            {item.sku?.name} ({item.sku?.code})
                          </h4>
                        </div>
                        <div className="text-right">
                          {item.isSufficient ? (
                            <span className="text-ok-ink font-medium">Sufficient</span>
                          ) : (
                            <span className="text-warn-ink font-medium">Insufficient</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-ink-60">Required:</span>{' '}
                          <span className="font-medium">{item.requiredQuantity.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-ink-60">Available:</span>{' '}
                          <span className="font-medium">{item.availableStock.toLocaleString()}</span>
                        </div>
                      </div>
                      {item.fifoError ? (
                        <div className="bg-warn-bg border border-warn-ink/30 rounded-xl p-2 text-sm text-warn-ink">
                          {item.fifoError}
                        </div>
                      ) : item.fifoBatches && item.fifoBatches.length > 0 ? (
                        <div>
                          <h5 className="font-medium text-sm mb-2">Selected Batches (FIFO):</h5>
                          <div className="space-y-1">
                            {item.fifoBatches.map((fb: any, batchIdx: number) => (
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
                                    })}
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

        <div className="bg-warn-bg border border-warn-ink/30 rounded-2xl p-4">
          <p className="text-sm text-warn-ink">
            <strong>Note:</strong> Batches will be automatically selected using FIFO (First In First Out) method.
            The system will select the oldest batches first, considering expiry dates.
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
            disabled={createDelivery.isPending || loadingPreview}
          >
            {(createDelivery.isPending || loadingPreview) && <LoadingSpinner text="" />}
            <Package weight="bold" size={14} />
            {createDelivery.isPending ? 'Creating...' : 'Create Delivery'}
          </Button>
        </div>
      </form>
    </div>
  )
}
