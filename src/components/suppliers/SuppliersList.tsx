'use client'

import { useState } from 'react'
import DataTable from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import { useSuppliers } from '@/hooks/useMasterData'
import type { Supplier } from '@/types'
import { Pencil, Trash } from '@phosphor-icons/react'

interface SuppliersListProps {
  onSupplierClick?: (supplier: Supplier) => void
  onEdit?: (supplier: Supplier) => void
  onDelete?: (supplierId: number) => void
  onToggleStatus?: (supplier: Supplier) => void
}

export default function SuppliersList({ onSupplierClick, onEdit, onDelete, onToggleStatus }: SuppliersListProps) {
  const [activeFilter, setActiveFilter] = useState<string>('true')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const { data, isLoading } = useSuppliers({
    search: searchQuery || undefined,
    isActive: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
  })

  const filteredSuppliers = data?.suppliers || []

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
      key: 'contactPerson',
      header: 'Contact Person',
      render: (supplier: any) => supplier.contactPerson || '-',
    },
    {
      key: 'email',
      header: 'Email',
      render: (supplier: any) => supplier.email || '-',
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (supplier: any) => supplier.phone || '-',
    },
    {
      key: 'address',
      header: 'Address',
      render: (supplier: any) => supplier.address || '-',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (supplier: any) => (
        <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} size="sm" />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (supplier: any) => (
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(supplier)
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
                onToggleStatus(supplier)
              }}
              className={`px-2 py-1 text-xs rounded-xl hover:opacity-80 ${
                supplier.isActive
                  ? 'bg-warn-bg text-warn-ink'
                  : 'bg-ok-bg text-ok-ink'
              }`}
              title={supplier.isActive ? 'Deactivate' : 'Activate'}
            >
              {supplier.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(supplier.id)
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
          placeholder="Search by code, name, contact person, email, or phone..."
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
        data={filteredSuppliers}
        columns={columns}
        onRowClick={onSupplierClick}
        loading={isLoading}
        emptyMessage="No suppliers found"
      />
    </div>
  )
}
