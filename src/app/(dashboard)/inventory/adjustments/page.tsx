'use client'

import { useState } from 'react'
import { useStockAdjustments, useCreateStockAdjustment } from '@/hooks/useInventory'
import { useWarehouses } from '@/hooks/useMasterData'
import { useItems } from '@/hooks/useItems'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/contexts/ToastContext'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import DataTable from '@/components/common/DataTable'
import Modal from '@/components/common/Modal'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/common/StatusBadge'
import EmptyState from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'
import { Plus, Trash } from '@phosphor-icons/react'

export default function StockAdjustmentsPage() {
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAdjustment, setSelectedAdjustment] = useState<any>(null)
  const [warehouseFilter, setWarehouseFilter] = useState<string>('')
  const [itemFilter, setItemFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [formData, setFormData] = useState({
    warehouseId: '',
    adjustmentDate: new Date().toISOString().split('T')[0],
    reason: '',
    items: [] as any[],
  })
  const [currentItem, setCurrentItem] = useState({
    itemId: '',
    batchId: '',
    quantityChange: '',
  })
  const [availableBatches, setAvailableBatches] = useState<any[]>([])

  const { data, isLoading } = useStockAdjustments({
    warehouseId: warehouseFilter ? parseInt(warehouseFilter) : undefined,
    itemId: itemFilter ? parseInt(itemFilter) : undefined,
    search: searchQuery || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })
  const { data: warehousesData } = useWarehouses()
  const { data: itemsData } = useItems()
  const createAdjustment = useCreateStockAdjustment()

  const handleClearFilters = () => {
    setWarehouseFilter('')
    setItemFilter('')
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
  }

  const handleItemChange = async (itemId: string) => {
    setCurrentItem((prev) => ({ ...prev, itemId, batchId: '' }))
    if (itemId && formData.warehouseId) {
      try {
        const batches = await apiClient.get<{ batches: any[] }>(
          `/api/inventory/item/${itemId}?warehouseId=${formData.warehouseId}`
        )
        setAvailableBatches(batches.batches || [])
      } catch (error) {
        console.error('Error fetching batches:', error)
        setAvailableBatches([])
      }
    }
  }

  const handleWarehouseChange = (warehouseId: string) => {
    setFormData((prev) => ({ ...prev, warehouseId }))
    setAvailableBatches([])
    setCurrentItem((prev) => ({ ...prev, batchId: '' }))
  }

  const handleAddItem = () => {
    if (!currentItem.itemId || !currentItem.batchId || !currentItem.quantityChange) {
      toast.warning('Please fill in all item fields')
      return
    }

    const item = itemsData?.items.find((i: any) => i.id === parseInt(currentItem.itemId))
    const batch = availableBatches.find((b: any) => b.id === parseInt(currentItem.batchId))

    if (!item || !batch) {
      toast.error('Item or batch not found')
      return
    }

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemId: parseInt(currentItem.itemId),
          batchId: parseInt(currentItem.batchId),
          quantityChange: parseFloat(currentItem.quantityChange),
          item,
          batch,
        },
      ],
    }))

    setCurrentItem({
      itemId: '',
      batchId: '',
      quantityChange: '',
    })
    toast.success('Item added')
  }

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
    toast.info('Item removed')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.warehouseId || formData.items.length === 0) {
      toast.error('Please select a warehouse and add at least one item')
      return
    }

    try {
      await createAdjustment.mutateAsync({
        warehouseId: parseInt(formData.warehouseId),
        adjustmentDate: formData.adjustmentDate,
        reason: formData.reason,
        items: formData.items.map((item) => ({
          itemId: item.itemId,
          batchId: item.batchId,
          quantityChange: item.quantityChange,
        })),
      })
      toast.success('Stock adjustment created successfully!')
      setShowForm(false)
      setFormData({
        warehouseId: '',
        adjustmentDate: new Date().toISOString().split('T')[0],
        reason: '',
        items: [],
      })
    } catch (error: any) {
      console.error('Error creating adjustment:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error creating adjustment. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleViewDetails = async (adjustment: any) => {
    try {
      const data = await apiClient.get<{ adjustment: any }>(`/api/stock-adjustments/${adjustment.id}`)
      setSelectedAdjustment(data.adjustment)
      setShowDetailModal(true)
    } catch (error: any) {
      console.error('Error loading adjustment:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load adjustment details'
      toast.error(errorMessage)
    }
  }

  const columns = [
    {
      key: 'adjustmentNumber',
      header: 'Adjustment Number',
      render: (adj: any) => (
        <button
          onClick={() => handleViewDetails(adj)}
          className="text-accent-ink hover:underline font-medium"
        >
          {adj.adjustmentNumber}
        </button>
      ),
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (adj: any) => adj.warehouse.name,
    },
    {
      key: 'adjustmentDate',
      header: 'Date',
      render: (adj: any) => formatDate(adj.adjustmentDate),
    },
    {
      key: 'reason',
      header: 'Reason',
    },
    {
      key: 'status',
      header: 'Status',
      render: (adj: any) => <StatusBadge status={adj.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (adj: any) => (
        <button
          onClick={() => handleViewDetails(adj)}
          className="px-2 py-1 text-xs bg-wash text-ink rounded-xl hover:bg-line"
          title="View Details"
        >
          View
        </button>
      ),
    },
  ]

  const hasAdjustments = data?.adjustments && data.adjustments.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Stock Adjustments</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Adjust inventory quantities</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={14} weight="bold" /> New Adjustment
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="mb-4 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by adjustment number or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-line rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-xl"
            >
              <option value="">All Warehouses</option>
              {warehousesData?.warehouses.map((wh: any) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
            <select
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-xl"
            >
              <option value="">All Items</option>
              {itemsData?.items.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="block text-sm text-ink mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-line rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm text-ink mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="px-4 py-2 border border-line rounded-xl"
              />
            </div>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-ink bg-paper border border-line rounded-xl hover:bg-wash"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {!isLoading && !hasAdjustments ? (
          <EmptyState
            title="No stock adjustments found"
            description="Get started by creating your first stock adjustment"
            action={{
              label: 'Create First Adjustment',
              onClick: () => setShowForm(true),
            }}
          />
        ) : (
          <DataTable
            data={data?.adjustments || []}
            columns={columns}
            loading={isLoading}
            emptyMessage="No adjustments found"
          />
        )}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setFormData({
            warehouseId: '',
            adjustmentDate: new Date().toISOString().split('T')[0],
            reason: '',
            items: [],
          })
          setAvailableBatches([])
          setCurrentItem({
            itemId: '',
            batchId: '',
            quantityChange: '',
          })
        }}
        title="Create Stock Adjustment"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Warehouse"
              name="warehouseId"
              value={formData.warehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              options={warehousesData?.warehouses.map((w: any) => ({ value: String(w.id), label: w.name })) || []}
              required
              placeholder="Select warehouse"
            />
            <FormInput
              label="Adjustment Date"
              name="adjustmentDate"
              type="date"
              value={formData.adjustmentDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, adjustmentDate: e.target.value }))}
              required
            />
          </div>

          <FormInput
            label="Reason"
            name="reason"
            value={formData.reason}
            onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
            required
          />

          <div className="border-t border-line pt-4">
            <h4 className="font-semibold mb-2">Items</h4>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <FormSelect
                label="Item"
                name="itemId"
                value={currentItem.itemId}
                onChange={(e) => handleItemChange(e.target.value)}
                options={itemsData?.items.map((i: any) => ({ value: String(i.id), label: `${i.code} - ${i.name}` })) || []}
                placeholder="Select item"
              />
              <FormSelect
                label="Batch"
                name="batchId"
                value={currentItem.batchId}
                onChange={(e) => setCurrentItem((prev) => ({ ...prev, batchId: e.target.value }))}
                options={availableBatches.map((b: any) => ({
                  value: String(b.id),
                  label: `${b.batchNumber} (Qty: ${b.quantity})`,
                }))}
                placeholder="Select batch"
                disabled={!currentItem.itemId}
              />
              <FormInput
                label="Quantity Change"
                name="quantityChange"
                type="number"
                step="0.01"
                value={currentItem.quantityChange}
                onChange={(e) => setCurrentItem((prev) => ({ ...prev, quantityChange: e.target.value }))}
                placeholder="+/- quantity"
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!currentItem.itemId || !currentItem.batchId || !currentItem.quantityChange}
                  className="w-full px-4 py-2 bg-ink text-white rounded-xl hover:bg-black disabled:bg-ink-60 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>

            {formData.items.length > 0 && (
              <div className="border border-line rounded-2xl overflow-hidden mt-2">
                <table className="min-w-full text-sm">
                  <thead className="bg-wash">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Batch</th>
                      <th className="px-3 py-2 text-left">Change</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">{item.item.name}</td>
                        <td className="px-3 py-2">{item.batch.batchNumber}</td>
                        <td className="px-3 py-2">
                          <span className={item.quantityChange >= 0 ? 'text-ok-ink' : 'text-warn-ink'}>
                            {item.quantityChange >= 0 ? '+' : ''}{item.quantityChange}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-warn-ink hover:opacity-70"
                          >
                            <Trash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowForm(false)
                setFormData({
                  warehouseId: '',
                  adjustmentDate: new Date().toISOString().split('T')[0],
                  reason: '',
                  items: [],
                })
                setAvailableBatches([])
                setCurrentItem({
                  itemId: '',
                  batchId: '',
                  quantityChange: '',
                })
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createAdjustment.isPending || formData.items.length === 0}
            >
              {createAdjustment.isPending ? 'Creating...' : 'Create Adjustment'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedAdjustment(null)
        }}
        title="Adjustment Details"
        size="lg"
      >
        {selectedAdjustment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink">Adjustment Number</label>
                <p className="mt-1 text-sm text-ink">{selectedAdjustment.adjustmentNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Warehouse</label>
                <p className="mt-1 text-sm text-ink">{selectedAdjustment.warehouse?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Date</label>
                <p className="mt-1 text-sm text-ink">{formatDate(selectedAdjustment.adjustmentDate)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Status</label>
                <p className="mt-1">
                  <StatusBadge status={selectedAdjustment.status} size="sm" />
                </p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-ink">Reason</label>
                <p className="mt-1 text-sm text-ink">{selectedAdjustment.reason}</p>
              </div>
            </div>
            <div className="border-t border-line pt-4">
              <h4 className="font-semibold mb-2">Items</h4>
              <div className="border border-line rounded-2xl overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-wash">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Batch</th>
                      <th className="px-3 py-2 text-left">Quantity Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {selectedAdjustment.items?.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-3 py-2">{item.item?.name}</td>
                        <td className="px-3 py-2">{item.batch?.batchNumber || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={item.quantityChange >= 0 ? 'text-ok-ink' : 'text-warn-ink'}>
                            {item.quantityChange >= 0 ? '+' : ''}{item.quantityChange} {item.unit?.code || ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
