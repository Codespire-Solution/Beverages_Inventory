'use client'

import { useState } from 'react'
import DataTable from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import { useCustomers } from '@/hooks/useMasterData'
import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/types'
import { Pencil, Trash } from '@phosphor-icons/react'

interface CustomersListProps {
  onCustomerClick?: (customer: Customer) => void
  onEdit?: (customer: Customer) => void
  onDelete?: (customerId: number) => void
  onToggleStatus?: (customer: Customer) => void
}

export default function CustomersList({ onCustomerClick, onEdit, onDelete, onToggleStatus }: CustomersListProps) {
  const [activeFilter, setActiveFilter] = useState<string>('true')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const { data, isLoading } = useCustomers({
    search: searchQuery || undefined,
    isActive: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
  })

  const filteredCustomers = data?.customers || []

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
      render: (customer: any) => customer.contactPerson || '-',
    },
    {
      key: 'email',
      header: 'Email',
      render: (customer: any) => customer.email || '-',
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (customer: any) => customer.phone || '-',
    },
    {
      key: 'taxRate',
      header: 'Tax Rate',
      render: (customer: any) => `${customer.taxRate || 0}%`,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (customer: any) => (
        <StatusBadge status={customer.isActive ? 'active' : 'inactive'} size="sm" />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (customer: any) => (
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(customer)
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
                onToggleStatus(customer)
              }}
              className={`px-2 py-1 text-xs rounded-xl hover:opacity-80 ${
                customer.isActive
                  ? 'bg-warn-bg text-warn-ink'
                  : 'bg-ok-bg text-ok-ink'
              }`}
              title={customer.isActive ? 'Deactivate' : 'Activate'}
            >
              {customer.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(customer.id)
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
        data={filteredCustomers}
        columns={columns}
        onRowClick={onCustomerClick}
        loading={isLoading}
        emptyMessage="No customers found"
      />
    </div>
  )
}
