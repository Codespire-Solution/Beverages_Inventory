'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/common/DataTable'
import EmptyState from '@/components/common/EmptyState'
import StatusBadge from '@/components/common/StatusBadge'
import { useProductionBatches } from '@/hooks/useProduction'
import { useSKUs } from '@/hooks/useMasterData'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/common/Button'
import { Plus } from '@phosphor-icons/react'

export default function ProductionPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [skuFilter, setSkuFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const { data, isLoading } = useProductionBatches({
    status: statusFilter || undefined,
    skuId: skuFilter ? parseInt(skuFilter) : undefined,
    search: searchQuery || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const { data: skusData } = useSKUs()

  const handleClearFilters = () => {
    setStatusFilter('')
    setSkuFilter('')
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
  }

  const columns = [
    {
      key: 'batchNumber',
      header: 'Batch Number',
      render: (batch: any) => (
        <button
          onClick={() => router.push(`/production/${batch.id}`)}
          className="text-accent-ink hover:underline font-medium"
        >
          {batch.batchNumber}
        </button>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (batch: any) => (
        <div>
          <div className="font-medium">{batch.sku.name}</div>
          <div className="text-xs text-ink-60">{batch.sku.code}</div>
        </div>
      ),
    },
    {
      key: 'recipeVersion',
      header: 'Recipe Version',
      render: (batch: any) => batch.recipeVersion ? `v${batch.recipeVersion.versionNumber}` : '-',
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (batch: any) => batch.warehouse?.name || '-',
    },
    {
      key: 'targetQuantity',
      header: 'Target',
      render: (batch: any) => (
        <span>
          {batch.targetQuantity.toLocaleString()} {batch.sku.unit?.code || ''}
        </span>
      ),
    },
    {
      key: 'actualQuantity',
      header: 'Actual',
      render: (batch: any) => batch.actualQuantity ? (
        <span>
          {batch.actualQuantity.toLocaleString()} {batch.sku.unit?.code || ''}
        </span>
      ) : '-',
    },
    {
      key: 'yield',
      header: 'Yield',
      render: (batch: any) => {
        if (!batch.actualQuantity) return '-'
        const yieldPct = (batch.actualQuantity / batch.targetQuantity) * 100
        return `${yieldPct.toFixed(1)}%`
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (batch: any) => <StatusBadge status={batch.status} size="sm" />,
    },
    {
      key: 'productionDate',
      header: 'Production Date',
      render: (batch: any) => formatDate(batch.productionDate),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Production Management</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/production/new')}
        >
          <Plus weight="bold" size={14} />
          New Production Batch
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="mb-4 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by batch number or SKU name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-line rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent"
            />
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-xl"
            >
              <option value="">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="block text-sm text-ink mb-1">Production Date From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-line rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm text-ink mb-1">Production Date To</label>
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

        {!isLoading && (!data?.batches || data.batches.length === 0) ? (
          <EmptyState
            title="No production batches found"
            description="Get started by creating your first production batch"
            action={{
              label: 'Create First Batch',
              onClick: () => router.push('/production/new'),
            }}
          />
        ) : (
          <DataTable
            data={data?.batches || []}
            columns={columns}
            loading={isLoading}
            emptyMessage="No production batches found"
          />
        )}
      </div>
    </div>
  )
}
