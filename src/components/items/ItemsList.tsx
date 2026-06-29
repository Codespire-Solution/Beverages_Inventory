'use client'

import { useState } from 'react'
import DataTable from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import { useItems } from '@/hooks/useItems'
import { formatCurrency } from '@/lib/utils'
import type { Item } from '@/types'
import { Pencil, Trash } from '@phosphor-icons/react'

interface ItemsListProps {
  onItemClick?: (item: Item) => void
  onEdit?: (item: Item) => void
  onDelete?: (itemId: number) => void
  onToggleStatus?: (item: Item) => void
}

export default function ItemsList({ onItemClick, onEdit, onDelete, onToggleStatus }: ItemsListProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('true')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const { data, isLoading } = useItems({
    category: categoryFilter || undefined,
    isActive: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
    search: searchQuery || undefined,
  })

  // Use items directly from API (search is handled server-side)
  const filteredItems = data?.items || []

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
      key: 'category',
      header: 'Category',
      render: (item: Item) => (
        <span className="capitalize">{item.category.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'standardCost',
      header: 'Standard Cost',
      render: (item: Item) => formatCurrency(item.standardCost),
    },
    {
      key: 'moq',
      header: 'MOQ',
      render: (item: Item) => item.moq ? item.moq.toLocaleString() : '-',
    },
    {
      key: 'minStockQuantity',
      header: 'Min Stock',
      render: (item: Item) => item.minStockQuantity ? item.minStockQuantity.toLocaleString() : '-',
    },
    {
      key: 'totalStock',
      header: 'Total Stock',
      render: (item: any) => {
        const totalStock = item.totalStock || 0
        const minStock = item.minStockQuantity || 0
        const isLowStock = totalStock < minStock && minStock > 0
        const displayUnit = item.displayUnit || item.baseUnit

        return (
          <span className={isLowStock ? 'text-warn-ink font-semibold' : ''}>
            {totalStock.toLocaleString()} {displayUnit?.code || ''}
          </span>
        )
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item: Item) => (
        <StatusBadge status={item.isActive ? 'active' : 'inactive'} size="sm" />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Item) => (
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(item)
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
                onToggleStatus(item)
              }}
              className={`px-2 py-1 text-xs rounded-xl hover:opacity-80 ${
                item.isActive
                  ? 'bg-warn-bg text-warn-ink'
                  : 'bg-ok-bg text-ok-ink'
              }`}
              title={item.isActive ? 'Deactivate' : 'Activate'}
            >
              {item.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item.id)
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
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-line rounded-xl"
        >
          <option value="">All Categories</option>
          <option value="raw_material">Raw Material</option>
          <option value="packaging">Packaging</option>
          <option value="finished_good">Finished Good</option>
        </select>
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
        data={filteredItems}
        columns={columns}
        onRowClick={onItemClick}
        loading={isLoading}
        emptyMessage="No items found"
      />
    </div>
  )
}

