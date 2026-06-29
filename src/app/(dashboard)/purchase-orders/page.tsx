'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import EmptyState from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'
import { useSuppliers } from '@/hooks/useMasterData'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus } from '@phosphor-icons/react'

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const [supplierFilter, setSupplierFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const { data, isLoading } = usePurchaseOrders({
    supplierId: supplierFilter ? parseInt(supplierFilter) : undefined,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const { data: suppliersData } = useSuppliers()

  const handleClearFilters = () => {
    setSupplierFilter('')
    setStatusFilter('')
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
  }

  const columns = [
    {
      key: 'poNumber',
      header: 'PO Number',
      render: (po: any) => (
        <button
          onClick={() => router.push(`/purchase-orders/${po.id}`)}
          className="text-accent-ink hover:underline font-medium"
        >
          {po.poNumber}
        </button>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (po: any) => po.supplier.name,
    },
    {
      key: 'orderDate',
      header: 'Order Date',
      render: (po: any) => formatDate(po.orderDate),
    },
    {
      key: 'status',
      header: 'Status',
      render: (po: any) => <StatusBadge status={po.status} size="sm" />,
    },
    {
      key: 'grandTotal',
      header: 'Amount',
      render: (po: any) => formatCurrency(po.grandTotal),
    },
  ]

  const hasPOs = data?.purchaseOrders && data.purchaseOrders.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Purchase Orders</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/purchase-orders/new')}
        >
          <Plus weight="bold" size={14} />
          New Purchase Order
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="mb-4 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by PO number or supplier name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-line rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-xl"
            >
              <option value="">All Suppliers</option>
              {suppliersData?.suppliers.map((supplier: any) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-xl"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="partially_received">Partially Received</option>
              <option value="fully_received">Fully Received</option>
              <option value="cancelled">Cancelled</option>
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

        {!isLoading && !hasPOs ? (
          <EmptyState
            title="No purchase orders found"
            description="Get started by creating your first purchase order"
            action={{
              label: 'Create First PO',
              onClick: () => router.push('/purchase-orders/new'),
            }}
          />
        ) : (
          <DataTable
            data={data?.purchaseOrders || []}
            columns={columns}
            loading={isLoading}
            emptyMessage="No purchase orders found"
          />
        )}
      </div>
    </div>
  )
}
