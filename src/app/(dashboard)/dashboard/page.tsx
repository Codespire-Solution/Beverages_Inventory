'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import StatusBadge from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { useToast } from '@/contexts/ToastContext'
import {
  Stack,
  Warning,
  TrendUp,
  Flask,
  ArrowRight,
  Package,
} from '@phosphor-icons/react'

function ActivityTypeTag({ type }: { type: string }) {
  const tone: Record<string, string> = {
    purchase: 'bg-litchi', production: 'bg-mint', sale: 'bg-berry', adjustment: 'bg-wash', transfer: 'bg-wash',
  }
  return <span className={`font-mono text-[10px] uppercase tracking-[0.05em] px-2 py-1 rounded-full text-ink ${tone[type] ?? 'bg-wash'}`}>{type}</span>
}

interface DashboardStats {
  inventoryValue: number
  lowStockCount: number
  salesThisMonth: number
  topSKUs: Array<{ skuId: number; sku: string; skuCode: string; quantity: number }>
  slowMovingCount: number
  cashFlow: {
    purchases: number
    sales: number
    net: number
  }
  salesTrend?: Array<{ month: string; value: number }>
  inventoryTrend?: Array<{ month: string; value: number }>
  additionalMetrics?: {
    pendingPOs: number
    pendingOrders: number
    inProgressProduction: number
    expiringItems: number
    overdueDeliveries: number
    finishedGoodsCount: number
  }
  recentActivity?: Array<{
    type: string
    id: number
    reference: string
    description: string
    date: Date
    status: string
  }>
  alerts?: Array<{
    type: string
    message: string
    link: string
  }>
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning, Admin.'
  if (h < 17) return 'Good afternoon, Admin.'
  return 'Good evening, Admin.'
}

function formatDayDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getActivityTypeTag(type: string): string {
  if (type === 'order') return 'ORDER'
  if (type === 'purchase_order') return 'PO'
  return type.toUpperCase()
}

export default function DashboardPage() {
  const router = useRouter()
  const toast = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchStats = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (startDate) queryParams.append('startDate', startDate)
      if (endDate) queryParams.append('endDate', endDate)

      const queryString = queryParams.toString()
      const data = await apiClient.get<DashboardStats>(`/api/dashboard/stats${queryString ? `?${queryString}` : ''}`)
      setStats(data)
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [startDate, endDate])

  if (loading && !stats) {
    return <LoadingSpinner text="Loading dashboard..." />
  }

  if (!stats) {
    return (
      <div className="p-10 text-center text-ink-60 font-sans">
        Failed to load dashboard data.
      </div>
    )
  }

  const expiringItems = stats.additionalMetrics?.expiringItems ?? 0
  const finishedGoodsCount = stats.additionalMetrics?.finishedGoodsCount ?? 0
  const pendingOrders = stats.additionalMetrics?.pendingOrders ?? 0

  const recentActivity = stats.recentActivity ?? []
  const topSKUs = stats.topSKUs ?? []

  // Date filter controls (kept for functional parity)
  const hasDateFilter = startDate || endDate

  return (
    <div className="px-9 py-8 max-w-[1200px] w-full">

      {/* Date filter controls */}
      <div className="flex items-center gap-2 mb-6">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-1.5 border border-line rounded-lg text-sm font-mono bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Filter start date"
        />
        <span className="label text-ink-60">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          min={startDate}
          className="px-3 py-1.5 border border-line rounded-lg text-sm font-mono bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Filter end date"
        />
        {hasDateFilter && (
          <Button
            variant="ghost"
            onClick={() => { setStartDate(''); setEndDate('') }}
          >
            Clear
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={fetchStats}
          disabled={loading}
          className="ml-auto"
          aria-label="Refresh dashboard"
        >
          Refresh
        </Button>
      </div>

      {/* 1. Page Header */}
      <div className="pagehead animate-rise" style={{ animationDelay: '0ms' }}>
        <span className="label">{formatDayDate()}</span>
        <h1 className="font-serif font-medium text-5xl mt-2 leading-tight">{getGreeting()}</h1>
        <div className="h-[3px] w-16 bg-accent mt-4" />
      </div>

      {/* Alerts strip */}
      {stats.alerts && stats.alerts.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          {stats.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-sans ${
                alert.type === 'error'
                  ? 'bg-warn-bg border-warn-ink/20 text-warn-ink'
                  : alert.type === 'warning'
                  ? 'bg-warn-bg border-warn-ink/20 text-warn-ink'
                  : 'bg-ok-bg border-ok-ink/20 text-ok-ink'
              }`}
            >
              <span className="flex items-center gap-2">
                <Warning size={15} weight="bold" />
                {alert.message}
              </span>
              <button
                onClick={() => router.push(alert.link)}
                className="label text-[10px] underline hover:no-underline"
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2. Stat Strip */}
      <div
        className="grid grid-cols-4 bg-paper border border-line rounded-2xl overflow-hidden mt-7 mb-5"
        aria-label="Key metrics"
      >
        {/* Cell 1: Inventory Value (lead) */}
        <div
          className="px-6 py-5 border-r border-line animate-rise cursor-pointer hover:bg-wash transition-colors"
          style={{ animationDelay: '40ms' }}
          onClick={() => router.push('/inventory')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/inventory')}
          aria-label={`Inventory value: ${formatCurrency(stats.inventoryValue)}`}
        >
          <span className="label">Inventory Value</span>
          <div className="font-serif font-medium text-5xl num leading-none mt-2.5 mb-1.5">
            {formatCurrency(stats.inventoryValue)}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-accent-ink">
            <Stack size={13} weight="bold" />
            <span>{stats.slowMovingCount} slow-moving</span>
          </div>
        </div>

        {/* Cell 2: Sales This Month */}
        <div
          className="px-6 py-5 border-r border-line animate-rise cursor-pointer hover:bg-wash transition-colors"
          style={{ animationDelay: '80ms' }}
          onClick={() => router.push('/reports/sales')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/reports/sales')}
          aria-label={`Sales this month: ${formatCurrency(stats.salesThisMonth)}`}
        >
          <span className="label">{hasDateFilter ? 'Sales in Period' : 'Sales This Month'}</span>
          <div className="font-serif font-medium text-4xl num leading-none mt-2.5 mb-1.5">
            {formatCurrency(stats.salesThisMonth)}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-60">
            <TrendUp size={13} weight="bold" />
            <span>Net {formatCurrency(stats.cashFlow.net)}</span>
          </div>
        </div>

        {/* Cell 3: Finished Goods */}
        <div
          className="px-6 py-5 border-r border-line animate-rise cursor-pointer hover:bg-wash transition-colors"
          style={{ animationDelay: '120ms' }}
          onClick={() => router.push('/inventory')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/inventory')}
          aria-label={`Finished goods: ${finishedGoodsCount} SKUs`}
        >
          <span className="label">Finished Goods</span>
          <div className="font-serif font-medium text-4xl num leading-none mt-2.5 mb-1.5">
            {finishedGoodsCount}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-60">
            <Flask size={13} weight="bold" />
            <span>SKUs in stock</span>
          </div>
        </div>

        {/* Cell 4: Alerts (low stock + expiring) */}
        <div
          className="px-6 py-5 animate-rise cursor-pointer hover:bg-wash transition-colors"
          style={{ animationDelay: '160ms' }}
          onClick={() => router.push('/reports/inventory?reportType=low_stock')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/reports/inventory?reportType=low_stock')}
          aria-label={`Attention needed: ${stats.lowStockCount} low stock, ${expiringItems} expiring`}
        >
          <span className="label">Attention Needed</span>
          <div className="font-serif font-medium text-4xl num leading-none mt-2.5 mb-1.5">
            {stats.lowStockCount + expiringItems}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-accent-ink">
            <Warning size={13} weight="bold" />
            <span>{stats.lowStockCount} low-stock, {expiringItems} expiring</span>
          </div>
        </div>
      </div>

      {/* 3. Two-column row: Feature card + List panel */}
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 mb-5">

        {/* Left: Ink feature card */}
        <div
          className="bg-ink text-white rounded-2xl p-6 flex flex-col justify-between animate-rise"
          style={{ animationDelay: '200ms' }}
        >
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/60">
              Cash Flow {hasDateFilter ? '(Period)' : '(This Month)'}
            </span>
            <div className="font-serif font-medium text-6xl leading-none mt-3 mb-2">
              {formatCurrency(stats.cashFlow.net)}
            </div>
            <p className="font-sans text-sm text-white/70 mt-1">
              {stats.cashFlow.net >= 0 ? 'Net positive' : 'Net negative'} this period.
              {' '}Sales {formatCurrency(stats.cashFlow.sales)}, Purchases {formatCurrency(stats.cashFlow.purchases)}.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            {pendingOrders > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-accent text-ink font-mono text-[10.5px] uppercase tracking-[0.06em] px-3 py-1.5 rounded-full">
                <Package size={12} weight="bold" />
                {pendingOrders} pending {pendingOrders === 1 ? 'order' : 'orders'}
              </span>
            )}
            <Button
              variant="accent"
              onClick={() => router.push('/customer-orders')}
              className="mt-0"
            >
              <ArrowRight size={14} weight="bold" />
              View Orders
            </Button>
          </div>
        </div>

        {/* Right: Top SKUs or low stock list panel */}
        <div
          className="bg-paper border border-line rounded-2xl p-6 animate-rise"
          style={{ animationDelay: '240ms' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-medium text-[22px]">Top SKUs</h3>
            <span className="label">Last 30 days</span>
          </div>

          {topSKUs.length > 0 ? (
            <div className="divide-y divide-line">
              {topSKUs.map((item, i) => (
                <div
                  key={item.skuId}
                  className="flex items-center justify-between py-3 cursor-pointer hover:bg-wash -mx-2 px-2 rounded-lg transition-colors"
                  onClick={() => router.push('/skus')}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-accent-ink w-5 text-right">
                      #{i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-sans font-medium text-ink leading-tight">
                        {item.sku}
                      </div>
                      {item.skuCode && (
                        <div className="font-mono text-[10px] text-ink-60 mt-0.5">
                          {item.skuCode}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] bg-ok-bg text-ok-ink px-2.5 py-1 rounded-md">
                    {item.quantity.toLocaleString()} units
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No SKU data"
              description="No sales recorded in the last 30 days."
            />
          )}
        </div>
      </div>

      {/* 5. Recent Activity Table */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-medium text-2xl">Recent Activity</h2>
          {recentActivity.length > 0 && <span className="label text-accent-ink">{recentActivity.length} records</span>}
        </div>

        {recentActivity.length > 0 ? (
          <div className="bg-paper border border-line rounded-2xl overflow-hidden overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="font-mono uppercase tracking-[0.1em] text-[10.5px] text-ink-60 text-left px-5 py-3.5 bg-wash border-b border-line">
                    Reference
                  </th>
                  <th className="font-mono uppercase tracking-[0.1em] text-[10.5px] text-ink-60 text-left px-5 py-3.5 bg-wash border-b border-line">
                    Type
                  </th>
                  <th className="font-mono uppercase tracking-[0.1em] text-[10.5px] text-ink-60 text-left px-5 py-3.5 bg-wash border-b border-line">
                    Description
                  </th>
                  <th className="font-mono uppercase tracking-[0.1em] text-[10.5px] text-ink-60 text-left px-5 py-3.5 bg-wash border-b border-line">
                    Date
                  </th>
                  <th className="font-mono uppercase tracking-[0.1em] text-[10.5px] text-ink-60 text-left px-5 py-3.5 bg-wash border-b border-line">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity, i) => (
                  <tr
                    key={i}
                    className="hover:bg-wash transition-colors cursor-pointer border-b border-line last:border-0"
                    onClick={() => {
                      if (activity.type === 'order') {
                        router.push(`/customer-orders/${activity.id}`)
                      } else if (activity.type === 'purchase_order') {
                        router.push(`/purchase-orders/${activity.id}`)
                      }
                    }}
                  >
                    <td className="px-5 py-3.5 font-mono text-[13px]">
                      {activity.reference}
                    </td>
                    <td className="px-5 py-3.5">
                      <ActivityTypeTag type={activity.type} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-60 font-sans">
                      {activity.description}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-ink-60">
                      {formatDate(activity.date)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={activity.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-paper border border-line rounded-2xl">
            <EmptyState
              title="No recent activity"
              description="Orders and purchase orders will appear here."
            />
          </div>
        )}
      </div>
    </div>
  )
}
