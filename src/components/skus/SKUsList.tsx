'use client'

import { useState } from 'react'
import DataTable from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import { useSKUs } from '@/hooks/useMasterData'
import { formatCurrency } from '@/lib/utils'
import type { SKU } from '@/types'
import { Pencil, Trash } from '@phosphor-icons/react'

interface SKUsListProps {
  onSKUClick?: (sku: SKU) => void
  onEdit?: (sku: SKU) => void
  onDelete?: (skuId: number) => void
  onToggleStatus?: (sku: SKU) => void
}

export default function SKUsList({ onSKUClick, onEdit, onDelete, onToggleStatus }: SKUsListProps) {
  const [activeFilter, setActiveFilter] = useState<string>('true')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const { data, isLoading } = useSKUs({
    search: searchQuery || undefined,
    isActive: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
  })

  const filteredSKUs = data?.skus || []

  const columns = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
    },
    {
      key: 'description',
      header: 'Description',
      render: (sku: any) => sku.description || '-',
    },
    {
      key: 'unit',
      header: 'Unit',
      render: (sku: any) => sku.unit?.code || '-',
    },
    {
      key: 'standardCost',
      header: 'Standard Cost',
      render: (sku: any) => formatCurrency(sku.standardCost || 0),
    },
    {
      key: 'hasExpiry',
      header: 'Has Expiry',
      render: (sku: any) => (
        <StatusBadge status={sku.hasExpiry ? 'active' : 'inactive'} size="sm" />
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (sku: any) => (
        <StatusBadge status={sku.isActive ? 'active' : 'inactive'} size="sm" />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (sku: any) => (
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(sku)
              }}
              className="px-2 py-1 text-xs bg-wash text-accent-ink rounded-xl hover:opacity-80"
              title="Edit"
            >
              <Pencil size={12} />
            </button>
          )}
          {onToggleStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleStatus(sku)
              }}
              className={`px-2 py-1 text-xs rounded-xl hover:opacity-80 ${
                sku.isActive
                  ? 'bg-warn-bg text-warn-ink'
                  : 'bg-ok-bg text-ok-ink'
              }`}
              title={sku.isActive ? 'Deactivate' : 'Activate'}
            >
              {sku.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(sku.id)
              }}
              className="px-2 py-1 text-xs bg-warn-bg text-warn-ink rounded-xl hover:opacity-80"
              title="Delete"
            >
              <Trash size={12} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by code, name, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-line rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="px-4 py-2 border border-line rounded-xl"
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <DataTable
        data={filteredSKUs}
        columns={columns}
        onRowClick={onSKUClick}
        loading={isLoading}
        emptyMessage="No SKUs found"
      />
    </div>
  )
}

