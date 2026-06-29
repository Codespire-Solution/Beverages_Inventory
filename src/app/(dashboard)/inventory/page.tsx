'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/common/DataTable'
import EmptyState from '@/components/common/EmptyState'
import { useInventory, useLowStock, useExpiringItems } from '@/hooks/useInventory'
import { useWarehouses } from '@/hooks/useMasterData'
import { useItems } from '@/hooks/useItems'
import { formatDate, formatCurrency } from '@/lib/utils'
import StatusBadge from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { Warning } from '@phosphor-icons/react'

export default function InventoryPage() {
  const router = useRouter()
  const [warehouseFilter, setWarehouseFilter] = useState<string>('')
  const [itemFilter, setItemFilter] = useState<string>('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [expiringOnly, setExpiringOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [receivedDateFrom, setReceivedDateFrom] = useState<string>('')
  const [receivedDateTo, setReceivedDateTo] = useState<string>('')
  const [expiryDateFrom, setExpiryDateFrom] = useState<string>('')
  const [expiryDateTo, setExpiryDateTo] = useState<string>('')

  const { data, isLoading } = useInventory({
    warehouseId: warehouseFilter ? parseInt(warehouseFilter) : undefined,
    itemId: itemFilter ? parseInt(itemFilter) : undefined,
    lowStock: lowStockOnly,
    expiringSoon: expiringOnly,
    search: searchQuery || undefined,
    receivedDateFrom: receivedDateFrom || undefined,
    receivedDateTo: receivedDateTo || undefined,
    expiryDateFrom: expiryDateFrom || undefined,
    expiryDateTo: expiryDateTo || undefined,
  })

  const { data: warehousesData } = useWarehouses()
  const { data: itemsData } = useItems()
  const { data: lowStockData } = useLowStock()
  const { data: expiringData } = useExpiringItems()

  const handleClearFilters = () => {
    setWarehouseFilter('')
    setItemFilter('')
    setLowStockOnly(false)
    setExpiringOnly(false)
    setSearchQuery('')
    setReceivedDateFrom('')
    setReceivedDateTo('')
    setExpiryDateFrom('')
    setExpiryDateTo('')
  }

  const columns = [
    {
      key: 'item',
      header: 'Item',
      render: (batch: any) => (
        <div>
          <button
            onClick={() => router.push(`/items/${batch.item.id}`)}
            className="font-medium text-accent-ink hover:underline text-left"
          >
            {batch.item.name}
          </button>
          <div className="text-xs text-ink-60">{batch.item.code}</div>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (batch: any) => batch.warehouse.name,
    },
    {
      key: 'batchNumber',
      header: 'Batch Number',
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (batch: any) => (
        <span className={batch.quantity < 100 ? 'text-red-600 font-semibold' : ''}>
          {batch.quantity.toLocaleString()} {batch.unit.code}
        </span>
      ),
    },
    {
      key: 'unitCost',
      header: 'Unit Cost',
      render: (batch: any) => formatCurrency(batch.unitCost || 0),
    },
    {
      key: 'totalValue',
      header: 'Total Value',
      render: (batch: any) => {
        const value = (batch.quantity || 0) * (batch.unitCost || 0)
        return formatCurrency(value)
      },
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      render: (batch: any) => batch.expiryDate ? formatDate(batch.expiryDate) : '-',
    },
    {
      key: 'receivedDate',
      header: 'Received Date',
      render: (batch: any) => formatDate(batch.receivedDate),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Inventory Management</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Track inventory levels, batches, and expiry dates</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => router.push('/inventory/adjustments')}
          >
            + Create Adjustment
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push('/inventory/transfers')}
          >
            + Create Transfer
          </Button>
        </div>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="mb-4 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by item code, name, or batch number..."
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
              <label className="block text-sm text-ink mb-1">Received Date From</label>
              <input
                type="date"
                value={receivedDateFrom}
                onChange={(e) => setReceivedDateFrom(e.target.value)}
                className="px-4 py-2 border border-line rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm text-ink mb-1">Received Date To</label>
              <input
                type="date"
                value={receivedDateTo}
                onChange={(e) => setReceivedDateTo(e.target.value)}
                min={receivedDateFrom}
                className="px-4 py-2 border border-line rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm text-ink mb-1">Expiry Date From</label>
              <input
                type="date"
                value={expiryDateFrom}
                onChange={(e) => setExpiryDateFrom(e.target.value)}
                className="px-4 py-2 border border-line rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm text-ink mb-1">Expiry Date To</label>
              <input
                type="date"
                value={expiryDateTo}
                onChange={(e) => setExpiryDateTo(e.target.value)}
                min={expiryDateFrom}
                className="px-4 py-2 border border-line rounded-xl"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm">Low Stock Only</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={expiringOnly}
                onChange={(e) => setExpiringOnly(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-sm">Expiring Soon</span>
            </label>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-ink bg-paper border border-line rounded-xl hover:bg-wash"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {lowStockData && lowStockData.lowStockItems.length > 0 && (
          <div className="mb-4 p-3 bg-warn-bg border border-warn-bg rounded-2xl flex items-center gap-2">
            <Warning className="text-warn-ink" size={16} weight="bold" />
            <p className="text-sm font-medium text-warn-ink">
              {lowStockData.lowStockItems.length} items are low on stock
            </p>
          </div>
        )}

        {expiringData && expiringData.batches.length > 0 && (
          <div className="mb-4 p-3 bg-warn-bg border border-warn-bg rounded-2xl flex items-center gap-2">
            <Warning className="text-warn-ink" size={16} weight="bold" />
            <p className="text-sm font-medium text-warn-ink">
              {expiringData.batches.length} batches expiring soon
            </p>
          </div>
        )}

        {!isLoading && (!data?.batches || data.batches.length === 0) ? (
          <EmptyState
            title="No inventory batches found"
            description="Inventory will appear here after receiving goods from purchase orders or production"
          />
        ) : (
          <DataTable
            data={data?.batches || []}
            columns={columns}
            loading={isLoading}
            emptyMessage="No inventory batches found"
          />
        )}
      </div>
    </div>
  )
}
