'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/common/DataTable'
import EmptyState from '@/components/common/EmptyState'
import { apiClient } from '@/lib/api-client'
import { useWarehouses } from '@/hooks/useMasterData'
import { useSKUs } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import StatusBadge from '@/components/common/StatusBadge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { useQuery } from '@tanstack/react-query'

export default function FinishedGoodsInventoryPage() {
  const router = useRouter()
  const toast = useToast()
  const [warehouseFilter, setWarehouseFilter] = useState<string>('')
  const [skuFilter, setSkuFilter] = useState<string>('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const { data: warehousesData } = useWarehouses()
  const { data: skusData } = useSKUs()

  const { data, isLoading } = useQuery({
    queryKey: ['finished-goods-inventory', warehouseFilter, skuFilter, lowStockOnly, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (warehouseFilter) params.append('warehouseId', warehouseFilter)
      if (skuFilter) params.append('skuId', skuFilter)
      if (lowStockOnly) params.append('lowStock', 'true')
      if (searchQuery) params.append('search', searchQuery)

      return apiClient.get<{ finishedGoods: any[] }>(
        `/api/inventory/finished-goods?${params.toString()}`
      )
    },
  })

  const handleClearFilters = () => {
    setWarehouseFilter('')
    setSkuFilter('')
    setLowStockOnly(false)
    setSearchQuery('')
  }

  const columns = [
    {
      key: 'sku',
      header: 'SKU',
      render: (stock: any) => (
        <div>
          <div className="font-medium">{stock.skuName}</div>
          <div className="text-xs text-ink-60">{stock.skuCode}</div>
        </div>
      ),
    },
    {
      key: 'totalStock',
      header: 'Total Stock',
      render: (stock: any) => (
        <span
          className={
            stock.isLowStock ? 'text-warn-ink font-semibold' : 'font-medium'
          }
        >
          {stock.totalStock.toLocaleString()} {stock.displayUnit.code}
        </span>
      ),
    },
    {
      key: 'minStock',
      header: 'Min Stock',
      render: (stock: any) =>
        stock.minStockQuantity
          ? `${stock.minStockQuantity.toLocaleString()} ${stock.displayUnit.code}`
          : '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (stock: any) => (
        <StatusBadge
          status={stock.isLowStock ? 'low_stock' : 'in_stock'}
          size="sm"
        />
      ),
    },
    {
      key: 'warehouses',
      header: 'Warehouses',
      render: (stock: any) => (
        <div className="text-sm">
          {stock.stockByWarehouse.map((w: any, idx: number) => (
            <div key={idx}>
              {w.warehouse.name}: {w.totalQuantity.toLocaleString()}{' '}
              {stock.displayUnit.code}
            </div>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">
            Finished Goods Inventory
          </h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">
            View stock levels for all finished goods (SKUs)
          </p>
        </div>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="mb-4 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by SKU code or name..."
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
              value={skuFilter}
              onChange={(e) => setSkuFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-xl"
            >
              <option value="">All SKUs</option>
              {skusData?.skus.map((sku: any) => (
                <option key={sku.id} value={sku.id}>
                  {sku.code} - {sku.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 px-4 py-2 border border-line rounded-xl cursor-pointer hover:bg-wash">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-sm">Low Stock Only</span>
            </label>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-ink bg-paper border border-line rounded-xl hover:bg-wash"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Loading finished goods inventory..." />
        ) : !data?.finishedGoods || data.finishedGoods.length === 0 ? (
          <EmptyState
            title="No finished goods found"
            description="Finished goods will appear here once production batches are completed"
          />
        ) : (
          <DataTable
            data={data.finishedGoods}
            columns={columns}
            loading={isLoading}
            emptyMessage="No finished goods found"
          />
        )}
      </div>
    </div>
  )
}
