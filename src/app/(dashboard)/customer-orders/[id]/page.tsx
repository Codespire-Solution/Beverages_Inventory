'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useCustomerOrder, useConfirmCustomerOrder, useCancelCustomerOrder } from '@/hooks/useCustomerOrders'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import StatusBadge from '@/components/common/StatusBadge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/common/Button'
import { ArrowLeft, Check, Pencil, Trash, Truck } from '@phosphor-icons/react'

export default function CustomerOrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = parseInt(params.id as string)

  const { data, isLoading } = useCustomerOrder(id)
  const confirmOrder = useConfirmCustomerOrder()
  const cancelOrder = useCancelCustomerOrder()

  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'deliveries' | 'history'>('overview')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  if (isLoading) {
    return <LoadingSpinner text="Loading order..." />
  }

  if (!data?.order) {
    return <div>Order not found</div>
  }

  const order = data.order
  const canDeliver = order.status === 'confirmed' || order.status === 'pending'
  const canEdit = true
  const canConfirm = order.status === 'pending'
  const canCancel = order.status === 'pending' || order.status === 'confirmed'

  const handleConfirm = async () => {
    try {
      await confirmOrder.mutateAsync(id)
      toast.success('Customer order confirmed successfully!')
    } catch (error: any) {
      console.error('Error confirming order:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error confirming customer order'
      toast.error(errorMessage)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelOrder.mutateAsync(id)
      toast.success('Customer order cancelled successfully!')
      setShowCancelConfirm(false)
    } catch (error: any) {
      console.error('Error cancelling order:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error cancelling customer order'
      toast.error(errorMessage)
    }
  }

  const handleEdit = () => {
    router.push(`/customer-orders/${id}/edit`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Customer Order: {order.orderNumber}</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
        </div>
        <div className="flex gap-3">
          {canConfirm && (
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={confirmOrder.isPending}
            >
              {confirmOrder.isPending && <LoadingSpinner text="" />}
              <Check weight="bold" size={14} />
              Confirm
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              onClick={handleEdit}
            >
              <Pencil weight="bold" size={14} />
              Edit
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              onClick={() => setShowCancelConfirm(true)}
              disabled={cancelOrder.isPending}
            >
              <Trash weight="bold" size={14} />
              Cancel
            </Button>
          )}
          {canDeliver && (
            <Button
              variant="primary"
              onClick={() => router.push(`/customer-orders/${id}/deliver`)}
            >
              <Truck weight="bold" size={14} />
              Create Delivery
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => router.push('/customer-orders')}
          >
            <ArrowLeft weight="bold" size={14} />
            Back to List
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-line">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-ink-60 hover:text-ink hover:border-line'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items'
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-ink-60 hover:text-ink hover:border-line'
            }`}
          >
            Items
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deliveries'
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-ink-60 hover:text-ink hover:border-line'
            }`}
          >
            Deliveries ({order.deliveries?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-ink-60 hover:text-ink hover:border-line'
            }`}
          >
            History
          </button>
        </nav>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Customer</h3>
                <div className="space-y-1">
                  <p className="text-lg font-medium">{order.customer.name}</p>
                  {order.customer.code && <p className="text-sm text-ink-60">Code: {order.customer.code}</p>}
                  {order.customer.contactPerson && (
                    <p className="text-sm text-ink-60">Contact: {order.customer.contactPerson}</p>
                  )}
                  {order.customer.email && <p className="text-sm text-ink-60">Email: {order.customer.email}</p>}
                  {order.customer.phone && <p className="text-sm text-ink-60">Phone: {order.customer.phone}</p>}
                  {order.customer.address && <p className="text-sm text-ink-60">Address: {order.customer.address}</p>}
                  {order.customer.taxRate !== undefined && (
                    <p className="text-sm text-ink-60">Tax Rate: {order.customer.taxRate}%</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Status</h3>
                <StatusBadge status={order.status} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Order Date</h3>
                <p>{formatDate(order.orderDate)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Expected Delivery</h3>
                <p>{order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '-'}</p>
              </div>
              {order.creator && (
                <div>
                  <h3 className="text-sm font-medium text-ink-60 mb-2">Created By</h3>
                  <p>{order.creator.fullName || order.creator.email}</p>
                </div>
              )}
              {order.notes && (
                <div>
                  <h3 className="text-sm font-medium text-ink-60 mb-2">Notes</h3>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-wash p-4 rounded-2xl">
                  <div className="text-sm text-ink-60">Total Items</div>
                  <div className="text-2xl font-bold">{order.items?.length || 0}</div>
                </div>
                <div className="bg-wash p-4 rounded-2xl">
                  <div className="text-sm text-ink-60">Total Quantity</div>
                  <div className="text-2xl font-bold">
                    {order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0}
                  </div>
                </div>
                <div className="bg-wash p-4 rounded-2xl">
                  <div className="text-sm text-ink-60">Grand Total</div>
                  <div className="text-2xl font-bold">{formatCurrency(order.grandTotal || 0)}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Items Tab */}
        {activeTab === 'items' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-wash">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Tax Rate</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Fulfilled</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Remaining</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items?.map((item: any) => {
                    const remaining = item.quantity - (item.fulfilledQuantity || 0)
                    const isOutstanding = remaining > 0
                    return (
                      <tr key={item.id} className={isOutstanding ? 'bg-warn-bg' : ''}>
                        <td className="px-4 py-2">
                          <div>
                            <div className="font-medium">{item.sku.name}</div>
                            <div className="text-xs text-ink-60">{item.sku.code}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {item.quantity.toLocaleString()} {item.unit.code}
                        </td>
                        <td className="px-4 py-2">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2">{item.taxRate || 0}%</td>
                        <td className="px-4 py-2">
                          <span className={item.fulfilledQuantity === item.quantity ? 'text-ok-ink font-medium' : ''}>
                            {item.fulfilledQuantity || 0} / {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={isOutstanding ? 'text-warn-ink font-medium' : 'text-ink-60'}>
                            {remaining} {item.unit.code}
                          </span>
                        </td>
                        <td className="px-4 py-2">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-6 mt-6 flex justify-end">
              <div className="text-right space-y-1">
                <div className="text-sm text-ink-60">
                  Subtotal: <span className="font-medium">{formatCurrency(order.totalAmount || 0)}</span>
                </div>
                <div className="text-sm text-ink-60">
                  Tax: <span className="font-medium">{formatCurrency(order.taxAmount || 0)}</span>
                </div>
                <div className="text-lg font-bold">
                  Grand Total: {formatCurrency(order.grandTotal || 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Deliveries</h3>
            {!order.deliveries || order.deliveries.length === 0 ? (
              <div className="text-center py-8 text-ink-60">
                No deliveries yet. Click &ldquo;Create Delivery&rdquo; to create a delivery for this order.
              </div>
            ) : (
              <div className="space-y-4">
                {order.deliveries.map((delivery: any) => (
                  <div key={delivery.id} className="border border-line rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-medium text-lg">{delivery.deliveryNumber}</p>
                        <p className="text-sm text-ink-60">{formatDate(delivery.deliveryDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{delivery.warehouse.name}</p>
                        {delivery.notes && <p className="text-xs text-ink-60 mt-1">{delivery.notes}</p>}
                      </div>
                    </div>
                    {delivery.items && delivery.items.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Items Delivered:</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-wash">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">SKU</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Batch</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Expiry Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {delivery.items.map((item: any) => (
                                <tr key={item.id}>
                                  <td className="px-3 py-2">
                                    <div>
                                      <div className="font-medium">{item.sku.name}</div>
                                      <div className="text-xs text-ink-60">{item.sku.code}</div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">{item.batch?.batchNumber || 'N/A'}</td>
                                  <td className="px-3 py-2">
                                    {item.quantity.toLocaleString()} {item.unit.code}
                                  </td>
                                  <td className="px-3 py-2">
                                    {item.batch?.expiryDate ? formatDate(item.batch.expiryDate) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Status History</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-accent pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-sm text-ink-60">{formatDate(order.orderDate)}</p>
                  </div>
                  <StatusBadge status="pending" />
                </div>
              </div>
              {order.status !== 'pending' && (
                <div className="border-l-4 border-ok-ink pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Confirmed</p>
                      <p className="text-sm text-ink-60">
                        {order.status === 'confirmed' || order.status === 'delivered'
                          ? 'Confirmed'
                          : '-'}
                      </p>
                    </div>
                    <StatusBadge status="confirmed" />
                  </div>
                </div>
              )}
              {order.deliveries && order.deliveries.length > 0 && (
                <div className="border-l-4 border-accent pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Deliveries Created</p>
                      <p className="text-sm text-ink-60">{order.deliveries.length} delivery(ies)</p>
                    </div>
                  </div>
                </div>
              )}
              {order.status === 'delivered' && (
                <div className="border-l-4 border-ink-60 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Delivered</p>
                      <p className="text-sm text-ink-60">All items delivered</p>
                    </div>
                    <StatusBadge status="delivered" />
                  </div>
                </div>
              )}
              {order.status === 'cancelled' && (
                <div className="border-l-4 border-warn-ink pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Cancelled</p>
                      <p className="text-sm text-ink-60">Customer order cancelled</p>
                    </div>
                    <StatusBadge status="cancelled" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel Customer Order"
        message={`Are you sure you want to cancel customer order ${order.orderNumber}? This action cannot be undone.`}
        confirmText="Cancel Order"
        cancelText="Keep Order"
        isDestructive
      />
    </div>
  )
}
