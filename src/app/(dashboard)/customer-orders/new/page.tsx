'use client'

import { useRouter } from 'next/navigation'
import { useCreateCustomerOrder, useConfirmCustomerOrder } from '@/hooks/useCustomerOrders'
import { useToast } from '@/contexts/ToastContext'
import CustomerOrderForm from '@/components/customer-orders/CustomerOrderForm'

export default function NewCustomerOrderPage() {
  const router = useRouter()
  const toast = useToast()
  const createOrder = useCreateCustomerOrder()
  const confirmOrder = useConfirmCustomerOrder()

  const savePending = async (payload: any) => {
    try {
      const result = await createOrder.mutateAsync({
        ...payload,
        status: 'pending',
      })
      toast.success('Customer order saved as pending!')
      router.push(`/customer-orders/${result.order.id}`)
    } catch (error: any) {
      console.error('Error creating order:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error creating customer order. Please try again.'
      toast.error(errorMessage)
    }
  }

  const createAndConfirm = async (payload: any) => {
    try {
      const result = await createOrder.mutateAsync({
        ...payload,
        status: 'pending',
      })
      await confirmOrder.mutateAsync(result.order.id)
      toast.success('Customer order created and confirmed successfully!')
      router.push(`/customer-orders/${result.order.id}`)
    } catch (error: any) {
      console.error('Error creating order:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error creating customer order. Please try again.'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-medium text-4xl">Create Customer Order</h1>
        <div className="h-[3px] w-16 bg-accent mt-3" />
      </div>

      <CustomerOrderForm
        mode="create"
        onSubmit={savePending}
        onSubmitAndConfirm={createAndConfirm}
        submitting={createOrder.isPending || confirmOrder.isPending}
      />
    </div>
  )
}
