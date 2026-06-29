'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePurchaseSuggestions } from '@/hooks/usePurchaseOrders'
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders'
import { useSuppliers } from '@/hooks/useMasterData'
import DataTable from '@/components/common/DataTable'
import FormSelect from '@/components/common/FormSelect'
import { Button } from '@/components/common/Button'
import { formatCurrency } from '@/lib/utils'
import Modal from '@/components/common/Modal'
import { Plus } from '@phosphor-icons/react'

export default function PurchaseSuggestionsPage() {
  const router = useRouter()
  const [threshold, setThreshold] = useState(100)
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedItems, setSelectedItems] = useState<any[]>([])

  const { data, isLoading, refetch } = usePurchaseSuggestions(threshold)
  const { data: suppliersData } = useSuppliers()
  const createPO = useCreatePurchaseOrder()

  const columns = [
    {
      key: 'item',
      header: 'Item',
      render: (suggestion: any) => (
        <div>
          <div className="font-medium">{suggestion.item.name}</div>
          <div className="text-xs text-ink-60">{suggestion.item.code}</div>
        </div>
      ),
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      render: (suggestion: any) => suggestion.currentStock.toLocaleString(),
    },
    {
      key: 'requiredQuantity',
      header: 'Required',
      render: (suggestion: any) => suggestion.requiredQuantity.toLocaleString(),
    },
    {
      key: 'moq',
      header: 'MOQ',
      render: (suggestion: any) => suggestion.moq ? suggestion.moq.toLocaleString() : '-',
    },
    {
      key: 'suggestedQuantity',
      header: 'Suggested Quantity',
      render: (suggestion: any) => (
        <span className="font-semibold text-accent-ink">
          {suggestion.suggestedQuantity.toLocaleString()} {suggestion.unit.code}
        </span>
      ),
    },
  ]

  const handleCreatePO = async () => {
    if (!selectedSupplier || selectedItems.length === 0) return

    try {
      const items = selectedItems.map((item) => ({
        itemId: item.item.id,
        quantity: item.suggestedQuantity,
        unitId: item.unit.id,
        unitPrice: item.item.standardCost || 0,
        taxRate: item.item.taxRate || 0,
      }))

      await createPO.mutateAsync({
        supplierId: parseInt(selectedSupplier),
        orderDate: new Date().toISOString().split('T')[0],
        items,
        status: 'draft',
      })

      setShowCreateModal(false)
      setSelectedItems([])
      router.push('/purchase-orders')
    } catch (error) {
      console.error('Error creating PO:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Purchase Suggestions</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="number"
            value={threshold}
            onChange={(e) => {
              setThreshold(parseInt(e.target.value))
              refetch()
            }}
            className="px-4 py-2 border border-line rounded-xl"
            placeholder="Stock threshold"
          />
          <Button
            variant="primary"
            onClick={() => {
              if (data?.suggestions && data.suggestions.length > 0) {
                setSelectedItems(data.suggestions)
                setShowCreateModal(true)
              }
            }}
            disabled={!data?.suggestions || data.suggestions.length === 0}
          >
            <Plus weight="bold" size={14} />
            Create PO from All
          </Button>
        </div>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <DataTable
          data={data?.suggestions || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="No purchase suggestions found"
          onRowClick={(suggestion) => {
            setSelectedItems([suggestion])
            setShowCreateModal(true)
          }}
        />
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedItems([])
        }}
        title="Create Purchase Order from Suggestions"
        size="lg"
      >
        <div className="space-y-4">
          <FormSelect
            label="Supplier"
            name="supplierId"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            options={suppliersData?.suppliers.map((s: any) => ({ value: s.id, label: s.name })) || []}
            required
            placeholder="Select supplier"
          />

          <div className="border border-line rounded-2xl overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-wash">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-left">Suggested Qty</th>
                  <th className="px-3 py-2 text-left">Unit Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {selectedItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">{item.item.name}</td>
                    <td className="px-3 py-2">{item.suggestedQuantity} {item.unit.code}</td>
                    <td className="px-3 py-2">{formatCurrency(item.item.standardCost || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false)
                setSelectedItems([])
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreatePO}
              disabled={!selectedSupplier}
            >
              Create Purchase Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
