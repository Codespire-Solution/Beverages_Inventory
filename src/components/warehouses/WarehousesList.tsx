'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import { useWarehouses } from '@/hooks/useMasterData'
import type { Warehouse } from '@/types'
import { Pencil, Trash, Package } from '@phosphor-icons/react'

interface WarehousesListProps {
  onWarehouseClick?: (warehouse: Warehouse) => void
  onEdit?: (warehouse: Warehouse) => void
  onDelete?: (warehouseId: number) => void
  onToggleStatus?: (warehouse: Warehouse) => void
}

export default function WarehousesList({ onWarehouseClick, onEdit, onDelete, onToggleStatus }: WarehousesListProps) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<string>('true')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const { data, isLoading } = useWarehouses({
    search: searchQuery || undefined,
    isActive: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
  })

  const filteredWarehouses = data?.warehouses || []

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
      key: 'address',
      header: 'Address',
      render: (warehouse: any) => warehouse.address || '-',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (warehouse: any) => (
        <StatusBadge status={warehouse.isActive ? 'active' : 'inactive'} size="sm" />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (warehouse: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/inventory?warehouse=${warehouse.id}`)
            }}
            className="px-2 py-1 text-xs bg-wash text-ink-60 rounded-xl hover:opacity-80"
            title="View Inventory"
          >
            <Package size={12} />
          </button>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(warehouse)
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
                onToggleStatus(warehouse)
              }}
              className={`px-2 py-1 text-xs rounded-xl hover:opacity-80 ${
                warehouse.isActive
                  ? 'bg-warn-bg text-warn-ink'
                  : 'bg-ok-bg text-ok-ink'
              }`}
              title={warehouse.isActive ? 'Deactivate' : 'Activate'}
            >
              {warehouse.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(warehouse.id)
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
          placeholder="Search by code, name, or address..."
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
        data={filteredWarehouses}
        columns={columns}
        onRowClick={onWarehouseClick}
        loading={isLoading}
        emptyMessage="No warehouses found"
      />
    </div>
  )
}
