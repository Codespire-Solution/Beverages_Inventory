'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useItem, useItemStock, useUpdateItem } from '@/hooks/useItems'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import StatusBadge from '@/components/common/StatusBadge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Modal from '@/components/common/Modal'
import ItemForm from '@/components/items/ItemForm'
import { Button } from '@/components/common/Button'
import { Pencil, ArrowLeft } from '@phosphor-icons/react'

export default function ItemDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = parseInt(params.id as string)

  const { data, isLoading } = useItem(id)
  const { data: stockData } = useItemStock(id)
  const updateItem = useUpdateItem()

  const [showForm, setShowForm] = useState(false)

  if (isLoading) {
    return <LoadingSpinner text="Loading item..." />
  }

  if (!data?.item) {
    return <div>Item not found</div>
  }

  const item = data.item
  const stockLevels = stockData?.stockLevels || []

  const handleFormSubmit = async (formData: any) => {
    try {
      await updateItem.mutateAsync({ id: item.id, data: formData })
      toast.success('Item updated successfully!')
      setShowForm(false)
    } catch (error: any) {
      console.error('Error saving item:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error saving item. Please try again.'
      toast.error(errorMessage)
    }
  }

  const categoryLabels: { [key: string]: string } = {
    raw_material: 'Raw Material',
    packaging: 'Packaging',
    finished_good: 'Finished Good',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">{item.name}</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Code: {item.code}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => setShowForm(true)}
          >
            <Pencil size={14} /> Edit
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/items')}
          >
            <ArrowLeft size={14} /> Back to List
          </Button>
        </div>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Code</h3>
            <p className="text-lg font-medium">{item.code}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Name</h3>
            <p className="text-lg font-medium">{item.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Category</h3>
            <p>{categoryLabels[item.category] || item.category}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Base Unit</h3>
            <p>{item.baseUnit ? `${item.baseUnit.code} - ${item.baseUnit.name}` : '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Standard Cost</h3>
            <p>{formatCurrency(item.standardCost || 0)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">MOQ</h3>
            <p>{item.moq != null ? item.moq : '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Min Stock Quantity</h3>
            <p>{item.minStockQuantity != null ? item.minStockQuantity : '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Tax Rate</h3>
            <p>{item.taxRate || 0}%</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Has Expiry</h3>
            <p>{item.hasExpiry ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Status</h3>
            <StatusBadge status={item.isActive ? 'active' : 'inactive'} />
          </div>
        </div>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Current Stock</h3>
        {stockLevels.length === 0 ? (
          <div className="text-center py-8 text-ink-60">No stock available for this item.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-wash">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Warehouse</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Batch Number</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stockLevels.flatMap((level: any) =>
                  (level.batches || []).map((batch: any) => (
                    <tr key={batch.id}>
                      <td className="px-4 py-2">{level.warehouse?.name || '-'}</td>
                      <td className="px-4 py-2">{batch.batchNumber || 'N/A'}</td>
                      <td className="px-4 py-2">
                        {batch.quantity?.toLocaleString()} {batch.unit?.code || ''}
                      </td>
                      <td className="px-4 py-2">{batch.expiryDate ? formatDate(batch.expiryDate) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Edit Item"
        size="lg"
      >
        <ItemForm
          item={item}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  )
}
