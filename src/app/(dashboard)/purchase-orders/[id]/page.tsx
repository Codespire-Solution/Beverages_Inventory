'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { usePurchaseOrder, useConfirmPurchaseOrder, useCancelPurchaseOrder } from '@/hooks/usePurchaseOrders'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import StatusBadge from '@/components/common/StatusBadge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/common/Button'
import { ArrowLeft, Check, Pencil, Package } from '@phosphor-icons/react'

export default function PurchaseOrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = parseInt(params.id as string)

  const { data, isLoading } = usePurchaseOrder(id)
  const confirmPO = useConfirmPurchaseOrder()
  const cancelPO = useCancelPurchaseOrder()

  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'receipts' | 'history'>('overview')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  if (isLoading) {
    return <LoadingSpinner text="Loading purchase order..." />
  }

  if (!data?.purchaseOrder) {
    return <div>Purchase order not found</div>
  }

  const po = data.purchaseOrder
  const canReceive = po.status === 'confirmed' || po.status === 'partially_received'
  const canEdit = po.status === 'draft'
  const canConfirm = po.status === 'draft'
  const canCancel = po.status === 'draft' || po.status === 'confirmed' || po.status === 'partially_received'

  const handleConfirm = async () => {
    try {
      await confirmPO.mutateAsync(id)
      toast.success('Purchase order confirmed successfully!')
    } catch (error: any) {
      console.error('Error confirming PO:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error confirming purchase order'
      toast.error(errorMessage)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelPO.mutateAsync(id)
      toast.success('Purchase order cancelled successfully!')
      setShowCancelConfirm(false)
    } catch (error: any) {
      console.error('Error cancelling PO:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error cancelling purchase order'
      toast.error(errorMessage)
    }
  }

  const handleEdit = () => {
    router.push(`/purchase-orders/${id}/edit`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Purchase Order: {po.poNumber}</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
        </div>
        <div className="flex gap-3">
          {canConfirm && (
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={confirmPO.isPending}
            >
              {confirmPO.isPending && <LoadingSpinner text="" />}
              <Check weight="bold" size={14} />
              Confirm
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              onClick={handleEdit}
            >
              <Pencil size={14} />
              Edit
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              onClick={() => setShowCancelConfirm(true)}
              disabled={cancelPO.isPending}
              className="border-warn-ink text-warn-ink hover:bg-warn-bg"
            >
              Cancel PO
            </Button>
          )}
          {canReceive && (
            <Button
              variant="primary"
              onClick={() => router.push(`/purchase-orders/${id}/receive`)}
            >
              <Package size={14} />
              Receive Goods
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => router.push('/purchase-orders')}
          >
            <ArrowLeft size={14} />
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
            onClick={() => setActiveTab('receipts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'receipts'
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-ink-60 hover:text-ink hover:border-line'
            }`}
          >
            Receipts ({po.receipts?.length || 0})
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
                <h3 className="text-sm font-medium text-ink-60 mb-2">Supplier</h3>
                <div className="space-y-1">
                  <p className="text-lg font-medium">{po.supplier.name}</p>
                  {po.supplier.code && <p className="text-sm text-ink-60">Code: {po.supplier.code}</p>}
                  {po.supplier.contactPerson && (
                    <p className="text-sm text-ink-60">Contact: {po.supplier.contactPerson}</p>
                  )}
                  {po.supplier.email && <p className="text-sm text-ink-60">Email: {po.supplier.email}</p>}
                  {po.supplier.phone && <p className="text-sm text-ink-60">Phone: {po.supplier.phone}</p>}
                  {po.supplier.address && <p className="text-sm text-ink-60">Address: {po.supplier.address}</p>}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Status</h3>
                <StatusBadge status={po.status} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Order Date</h3>
                <p>{formatDate(po.orderDate)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Expected Delivery</h3>
                <p>{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '-'}</p>
              </div>
              {po.creator && (
                <div>
                  <h3 className="text-sm font-medium text-ink-60 mb-2">Created By</h3>
                  <p>{po.creator.fullName || po.creator.email}</p>
                </div>
              )}
              {po.notes && (
                <div>
                  <h3 className="text-sm font-medium text-ink-60 mb-2">Notes</h3>
                  <p className="text-sm">{po.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-line pt-6">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-wash p-4 rounded-2xl">
                  <div className="text-sm text-ink-60">Total Items</div>
                  <div className="text-2xl font-bold">{po.items?.length || 0}</div>
                </div>
                <div className="bg-wash p-4 rounded-2xl">
                  <div className="text-sm text-ink-60">Total Quantity</div>
                  <div className="text-2xl font-bold">
                    {po.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0}
                  </div>
                </div>
                <div className="bg-wash p-4 rounded-2xl">
                  <div className="text-sm text-ink-60">Grand Total</div>
                  <div className="text-2xl font-bold">{formatCurrency(po.grandTotal || 0)}</div>
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Tax Rate</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Received</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Remaining</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {po.items?.map((item: any) => {
                    const remaining = item.quantity - (item.receivedQuantity || 0)
                    const isOutstanding = remaining > 0
                    return (
                      <tr key={item.id} className={isOutstanding ? 'bg-warn-bg' : ''}>
                        <td className="px-4 py-2">
                          <div>
                            <div className="font-medium">{item.item.name}</div>
                            <div className="text-xs text-ink-60">{item.item.code}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {item.quantity.toLocaleString()} {item.unit.code}
                        </td>
                        <td className="px-4 py-2">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2">{item.taxRate || 0}%</td>
                        <td className="px-4 py-2">
                          <span className={item.receivedQuantity === item.quantity ? 'text-ok-ink font-medium' : ''}>
                            {item.receivedQuantity || 0} / {item.quantity}
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

            <div className="border-t border-line pt-6 mt-6 flex justify-end">
              <div className="text-right space-y-1">
                <div className="text-sm text-ink-60">
                  Subtotal: <span className="font-medium">{formatCurrency(po.totalAmount || 0)}</span>
                </div>
                <div className="text-sm text-ink-60">
                  Tax: <span className="font-medium">{formatCurrency(po.taxAmount || 0)}</span>
                </div>
                <div className="text-lg font-bold">
                  Grand Total: {formatCurrency(po.grandTotal || 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receipts Tab */}
        {activeTab === 'receipts' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Goods Receipts</h3>
            {!po.receipts || po.receipts.length === 0 ? (
              <div className="text-center py-8 text-ink-60">
                No receipts yet. Click "Receive Goods" to create a receipt.
              </div>
            ) : (
              <div className="space-y-4">
                {po.receipts.map((receipt: any) => (
                  <div key={receipt.id} className="border border-line rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-medium text-lg">{receipt.receiptNumber}</p>
                        <p className="text-sm text-ink-60">{formatDate(receipt.receiptDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{receipt.warehouse.name}</p>
                        {receipt.notes && <p className="text-xs text-ink-60 mt-1">{receipt.notes}</p>}
                      </div>
                    </div>
                    {receipt.items && receipt.items.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Items Received:</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-wash">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Item</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Batch Number</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Unit Cost</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Expiry Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {receipt.items.map((item: any) => (
                                <tr key={item.id}>
                                  <td className="px-3 py-2">
                                    <div>
                                      <div className="font-medium">{item.item.name}</div>
                                      <div className="text-xs text-ink-60">{item.item.code}</div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">{item.batchNumber}</td>
                                  <td className="px-3 py-2">
                                    {item.quantity.toLocaleString()} {item.unit.code}
                                  </td>
                                  <td className="px-3 py-2">
                                    {item.unitCost ? formatCurrency(item.unitCost) : '-'}
                                  </td>
                                  <td className="px-3 py-2">
                                    {item.expiryDate ? formatDate(item.expiryDate) : '-'}
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
                    <p className="text-sm text-ink-60">{formatDate(po.orderDate)}</p>
                  </div>
                  <StatusBadge status="draft" />
                </div>
              </div>
              {po.status !== 'draft' && (
                <div className="border-l-4 border-ok-ink pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Confirmed</p>
                      <p className="text-sm text-ink-60">
                        {po.status === 'confirmed' || po.status === 'partially_received' || po.status === 'received'
                          ? 'Confirmed'
                          : '-'}
                      </p>
                    </div>
                    <StatusBadge status="confirmed" />
                  </div>
                </div>
              )}
              {po.receipts && po.receipts.length > 0 && (
                <div className="border-l-4 border-accent pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Receipts Created</p>
                      <p className="text-sm text-ink-60">{po.receipts.length} receipt(s)</p>
                    </div>
                  </div>
                </div>
              )}
              {po.status === 'received' && (
                <div className="border-l-4 border-line pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Fully Received</p>
                      <p className="text-sm text-ink-60">All items received</p>
                    </div>
                    <StatusBadge status="received" />
                  </div>
                </div>
              )}
              {po.status === 'cancelled' && (
                <div className="border-l-4 border-warn-ink pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Cancelled</p>
                      <p className="text-sm text-ink-60">Purchase order cancelled</p>
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
        title="Cancel Purchase Order"
        message={`Are you sure you want to cancel purchase order ${po.poNumber}? This action cannot be undone.`}
        confirmText="Cancel PO"
        cancelText="Keep PO"
        isDestructive
      />
    </div>
  )
}
