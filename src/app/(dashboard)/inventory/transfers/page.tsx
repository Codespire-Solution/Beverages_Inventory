'use client'

import { useState } from 'react'
import { useStockTransfers, useCreateStockTransfer } from '@/hooks/useInventory'
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

export default function StockTransfersPage() {
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null)
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState<string>('')
  const [toWarehouseFilter, setToWarehouseFilter] = useState<string>('')
  const [itemFilter, setItemFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [formData, setFormData] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    transferDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] as any[],
  })
  const [currentItem, setCurrentItem] = useState({
    itemId: '',
    batchId: '',
    quantity: '',
  })
  const [availableBatches, setAvailableBatches] = useState<any[]>([])

  const { data, isLoading } = useStockTransfers({
    fromWarehouseId: fromWarehouseFilter ? parseInt(fromWarehouseFilter) : undefined,
    toWarehouseId: toWarehouseFilter ? parseInt(toWarehouseFilter) : undefined,
    itemId: itemFilter ? parseInt(itemFilter) : undefined,
    search: searchQuery || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })
  const { data: warehousesData } = useWarehouses()
  const { data: itemsData } = useItems()
  const createTransfer = useCreateStockTransfer()

  const handleClearFilters = () => {
    setFromWarehouseFilter('')
    setToWarehouseFilter('')
    setItemFilter('')
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
  }

  const handleItemChange = async (itemId: string) => {
    setCurrentItem((prev) => ({ ...prev, itemId, batchId: '' }))
    if (itemId && formData.fromWarehouseId) {
      try {
        const batches = await apiClient.get<{ batches: any[] }>(
          `/api/inventory/item/${itemId}?warehouseId=${formData.fromWarehouseId}`
        )
        setAvailableBatches(batches.batches || [])
      } catch (error) {
        console.error('Error fetching batches:', error)
        setAvailableBatches([])
      }
    }
  }

  const handleFromWarehouseChange = (warehouseId: string) => {
    setFormData((prev) => ({ ...prev, fromWarehouseId: warehouseId }))
    setAvailableBatches([])
    setCurrentItem((prev) => ({ ...prev, batchId: '' }))
  }

  const handleAddItem = () => {
    if (!currentItem.itemId || !currentItem.batchId || !currentItem.quantity) {
      toast.warning('Please fill in all item fields')
      return
    }

    const item = itemsData?.items.find((i: any) => i.id === parseInt(currentItem.itemId))
    const batch = availableBatches.find((b: any) => b.id === parseInt(currentItem.batchId))

    if (!item || !batch) {
      toast.error('Item or batch not found')
      return
    }

    if (parseFloat(currentItem.quantity) > batch.quantity) {
      toast.error(`Insufficient stock. Available: ${batch.quantity}`)
      return
    }

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemId: parseInt(currentItem.itemId),
          batchId: parseInt(currentItem.batchId),
          quantity: parseFloat(currentItem.quantity),
          item,
          batch,
        },
      ],
    }))

    setCurrentItem({
      itemId: '',
      batchId: '',
      quantity: '',
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
    if (!formData.fromWarehouseId || !formData.toWarehouseId || formData.items.length === 0) {
      toast.error('Please select warehouses and add at least one item')
      return
    }

    if (formData.fromWarehouseId === formData.toWarehouseId) {
      toast.error('Source and destination warehouses must be different')
      return
    }

    try {
      await createTransfer.mutateAsync({
        fromWarehouseId: parseInt(formData.fromWarehouseId),
        toWarehouseId: parseInt(formData.toWarehouseId),
        transferDate: formData.transferDate,
        notes: formData.notes,
        items: formData.items.map((item) => ({
          itemId: item.itemId,
          batchId: item.batchId,
          quantity: item.quantity,
        })),
      })
      toast.success('Stock transfer created successfully!')
      setShowForm(false)
      setFormData({
        fromWarehouseId: '',
        toWarehouseId: '',
        transferDate: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
      })
    } catch (error: any) {
      console.error('Error creating transfer:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error creating transfer. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleViewDetails = async (transfer: any) => {
    try {
      const data = await apiClient.get<{ transfer: any }>(`/api/stock-transfers/${transfer.id}`)
      setSelectedTransfer(data.transfer)
      setShowDetailModal(true)
    } catch (error: any) {
      console.error('Error loading transfer:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load transfer details'
      toast.error(errorMessage)
    }
  }

  const columns = [
    {
      key: 'transferNumber',
      header: 'Transfer Number',
      render: (transfer: any) => (
        <button
          onClick={() => handleViewDetails(transfer)}
          className="text-accent-ink hover:underline font-medium"
        >
          {transfer.transferNumber}
        </button>
      ),
    },
    {
      key: 'fromWarehouse',
      header: 'From',
      render: (transfer: any) => transfer.fromWarehouse.name,
    },
    {
      key: 'toWarehouse',
      header: 'To',
      render: (transfer: any) => transfer.toWarehouse.name,
    },
    {
      key: 'transferDate',
      header: 'Date',
      render: (transfer: any) => formatDate(transfer.transferDate),
    },
    {
      key: 'status',
      header: 'Status',
      render: (transfer: any) => <StatusBadge status={transfer.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (transfer: any) => (
        <button
          onClick={() => handleViewDetails(transfer)}
          className="px-2 py-1 text-xs bg-wash text-ink rounded-xl hover:bg-line"
          title="View Details"
        >
          View
        </button>
      ),
    },
  ]

  const hasTransfers = data?.transfers && data.transfers.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Stock Transfers</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Transfer inventory between warehouses</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={14} weight="bold" /> New Transfer
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="mb-4 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by transfer number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-line rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <select
              value={fromWarehouseFilter}
              onChange={(e) => setFromWarehouseFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-xl"
            >
              <option value="">All From Warehouses</option>
              {warehousesData?.warehouses.map((wh: any) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
            <select
              value={toWarehouseFilter}
              onChange={(e) => setToWarehouseFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-xl"
            >
              <option value="">All To Warehouses</option>
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

        {!isLoading && !hasTransfers ? (
          <EmptyState
            title="No stock transfers found"
            description="Get started by creating your first stock transfer"
            action={{
              label: 'Create First Transfer',
              onClick: () => setShowForm(true),
            }}
          />
        ) : (
          <DataTable
            data={data?.transfers || []}
            columns={columns}
            loading={isLoading}
            emptyMessage="No transfers found"
          />
        )}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setFormData({
            fromWarehouseId: '',
            toWarehouseId: '',
            transferDate: new Date().toISOString().split('T')[0],
            notes: '',
            items: [],
          })
          setAvailableBatches([])
          setCurrentItem({
            itemId: '',
            batchId: '',
            quantity: '',
          })
        }}
        title="Create Stock Transfer"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="From Warehouse"
              name="fromWarehouseId"
              value={formData.fromWarehouseId}
              onChange={(e) => handleFromWarehouseChange(e.target.value)}
              options={warehousesData?.warehouses.map((w: any) => ({ value: String(w.id), label: w.name })) || []}
              required
              placeholder="Select source warehouse"
            />
            <FormSelect
              label="To Warehouse"
              name="toWarehouseId"
              value={formData.toWarehouseId}
              onChange={(e) => setFormData((prev) => ({ ...prev, toWarehouseId: e.target.value }))}
              options={warehousesData?.warehouses
                .filter((w: any) => w.id !== parseInt(formData.fromWarehouseId || '0'))
                .map((w: any) => ({ value: String(w.id), label: w.name })) || []}
              required
              placeholder="Select destination warehouse"
            />
          </div>

          <FormInput
            label="Transfer Date"
            name="transferDate"
            type="date"
            value={formData.transferDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, transferDate: e.target.value }))}
            required
          />

          <FormInput
            label="Notes (Optional)"
            name="notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
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
                label="Quantity"
                name="quantity"
                type="number"
                step="0.01"
                value={currentItem.quantity}
                onChange={(e) => setCurrentItem((prev) => ({ ...prev, quantity: e.target.value }))}
                required
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!currentItem.itemId || !currentItem.batchId || !currentItem.quantity}
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
                      <th className="px-3 py-2 text-left">Quantity</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">{item.item.name}</td>
                        <td className="px-3 py-2">{item.batch.batchNumber}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
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
                  fromWarehouseId: '',
                  toWarehouseId: '',
                  transferDate: new Date().toISOString().split('T')[0],
                  notes: '',
                  items: [],
                })
                setAvailableBatches([])
                setCurrentItem({
                  itemId: '',
                  batchId: '',
                  quantity: '',
                })
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createTransfer.isPending || formData.items.length === 0}
            >
              {createTransfer.isPending ? 'Creating...' : 'Create Transfer'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedTransfer(null)
        }}
        title="Transfer Details"
        size="lg"
      >
        {selectedTransfer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink">Transfer Number</label>
                <p className="mt-1 text-sm text-ink">{selectedTransfer.transferNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Date</label>
                <p className="mt-1 text-sm text-ink">{formatDate(selectedTransfer.transferDate)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">From Warehouse</label>
                <p className="mt-1 text-sm text-ink">{selectedTransfer.fromWarehouse?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">To Warehouse</label>
                <p className="mt-1 text-sm text-ink">{selectedTransfer.toWarehouse?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Status</label>
                <p className="mt-1">
                  <StatusBadge status={selectedTransfer.status} size="sm" />
                </p>
              </div>
              {selectedTransfer.notes && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-ink">Notes</label>
                  <p className="mt-1 text-sm text-ink">{selectedTransfer.notes}</p>
                </div>
              )}
            </div>
            <div className="border-t border-line pt-4">
              <h4 className="font-semibold mb-2">Items</h4>
              <div className="border border-line rounded-2xl overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-wash">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Batch</th>
                      <th className="px-3 py-2 text-left">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {selectedTransfer.items?.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-3 py-2">{item.item?.name}</td>
                        <td className="px-3 py-2">{item.batch?.batchNumber || '-'}</td>
                        <td className="px-3 py-2">
                          {item.quantity} {item.unit?.code || ''}
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
