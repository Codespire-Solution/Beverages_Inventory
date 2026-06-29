'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import EmptyState from '@/components/common/EmptyState'
import { useCustomerOrders } from '@/hooks/useCustomerOrders'
import { useCustomers } from '@/hooks/useMasterData'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/common/Button'
import { Plus } from '@phosphor-icons/react'

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [customerFilter, setCustomerFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const { data, isLoading } = useCustomerOrders({
    customerId: customerFilter ? parseInt(customerFilter) : undefined,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const { data: customersData } = useCustomers()

  const handleClearFilters = () => {
    setCustomerFilter('')
    setStatusFilter('')
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
  }

  const getFulfillmentStatus = (order: any) => {
    if (!order.items || order.items.length === 0) return 'Not Started'
    const totalOrdered = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    const totalFulfilled = order.items.reduce((sum: number, item: any) => sum + (item.fulfilledQuantity || 0), 0)
    if (totalFulfilled === 0) return 'Not Started'
    if (totalFulfilled >= totalOrdered) return 'Fully Fulfilled'
    return 'Partially Fulfilled'
  }

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order Number',
      render: (order: any) => (
        <button
          onClick={() => router.push(`/customer-orders/${order.id}`)}
          className="text-accent-ink hover:underline font-medium"
        >
          {order.orderNumber}
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order: any) => order.customer.name,
    },
    {
      key: 'orderDate',
      header: 'Order Date',
      render: (order: any) => formatDate(order.orderDate),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order: any) => <StatusBadge status={order.status} size="sm" />,
    },
    {
      key: 'fulfillment',
      header: 'Fulfillment',
      render: (order: any) => {
        const status = getFulfillmentStatus(order)
        const colorClass = status === 'Fully Fulfilled' ? 'bg-ok-bg text-ok-ink' :
                          status === 'Partially Fulfilled' ? 'bg-warn-bg text-warn-ink' :
                          'bg-wash text-ink-60'
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
            {status}
          </span>
        )
      },
    },
    {
      key: 'grandTotal',
      header: 'Amount',
      render: (order: any) => formatCurrency(order.grandTotal),
    },
  ]

  const hasOrders = data?.orders && data.orders.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Customer Orders</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/customer-orders/new')}
        >
          <Plus weight="bold" size={14} />
          New Order
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="mb-4 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by order number or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-line rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-xl"
            >
              <option value="">All Customers</option>
              {customersData?.customers.map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-line rounded-xl"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="delivered">Delivered</option>
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
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {!isLoading && !hasOrders ? (
          <EmptyState
            title="No customer orders found"
            description="Get started by creating your first customer order"
            action={{
              label: 'Create First Order',
              onClick: () => router.push('/customer-orders/new'),
            }}
          />
        ) : (
          <DataTable
            data={data?.orders || []}
            columns={columns}
            loading={isLoading}
            emptyMessage="No customer orders found"
          />
        )}
      </div>
    </div>
  )
}
