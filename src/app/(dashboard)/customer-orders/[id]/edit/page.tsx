'use client'

import { useRouter, useParams } from 'next/navigation'
import { useCustomerOrder, useUpdateCustomerOrder } from '@/hooks/useCustomerOrders'
import { useToast } from '@/contexts/ToastContext'
import CustomerOrderForm from '@/components/customer-orders/CustomerOrderForm'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function EditCustomerOrderPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = parseInt(params.id as string)

  const { data, isLoading } = useCustomerOrder(id)
  const updateOrder = useUpdateCustomerOrder()

  if (isLoading) {
    return <LoadingSpinner text="Loading order..." />
  }

  if (!data?.order) {
    return <div>Order not found</div>
  }

  const order = data.order

  const initialData = {
    customerId: order.customerId,
    orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : '',
    expectedDeliveryDate: order.expectedDeliveryDate
      ? new Date(order.expectedDeliveryDate).toISOString().split('T')[0]
      : '',
    notes: order.notes || '',
    items: (order.items || []).map((item: any) => ({
      skuId: item.skuId,
      quantity: item.quantity,
      unitId: item.unitId,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate || 0,
    })),
  }

  const save = async (payload: any) => {
    try {
      await updateOrder.mutateAsync({ id, data: payload })
      toast.success('Customer order updated successfully!')
      router.push(`/customer-orders/${id}`)
    } catch (error: any) {
      console.error('Error updating order:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating customer order. Please try again.'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-medium text-4xl">Edit Customer Order: {order.orderNumber}</h1>
        <div className="h-[3px] w-16 bg-accent mt-3" />
      </div>

      {order.status !== 'pending' && (
        <div className="bg-warn-bg border border-warn-ink/30 text-warn-ink rounded-2xl p-4">
          This order is already {order.status}. Editing it may not match what has been confirmed or delivered.
        </div>
      )}

      <CustomerOrderForm
        mode="edit"
        initialData={initialData}
        onSubmit={save}
        submitting={updateOrder.isPending}
      />
    </div>
  )
}
