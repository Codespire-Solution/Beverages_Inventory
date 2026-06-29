'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomers } from '@/hooks/useMasterData'
import { useSKUs } from '@/hooks/useMasterData'
import { apiClient } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/common/Button'
import { FileXls } from '@phosphor-icons/react'
import * as XLSX from 'xlsx'

export default function SalesReportPage() {
  const router = useRouter()
  const toast = useToast()
  const [reportType, setReportType] = useState<'summary' | 'bySku' | 'byCustomer' | 'slowMoving'>('summary')
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')
  const [useDateRange, setUseDateRange] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [customerFilter, setCustomerFilter] = useState<string>('')
  const [skuFilter, setSkuFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { data: customersData } = useCustomers()
  const { data: skusData } = useSKUs()

  const loadReport = async () => {
    setIsLoading(true)
    try {
      let endpoint = '/api/reports/sales'
      if (reportType === 'summary') {
        endpoint = '/api/reports/sales/summary'
      } else if (reportType === 'slowMoving') {
        endpoint = '/api/reports/sales/slow-moving'
      }

      const queryParams = new URLSearchParams()
      if (reportType === 'summary' && !useDateRange) {
        queryParams.append('period', period)
      }
      if (useDateRange && startDate) queryParams.append('startDate', startDate)
      if (useDateRange && endDate) queryParams.append('endDate', endDate)
      if (customerFilter) queryParams.append('customerId', customerFilter)
      if (skuFilter) queryParams.append('skuId', skuFilter)
      if (statusFilter) queryParams.append('status', statusFilter)

      const queryString = queryParams.toString()
      const result = await apiClient.get<any>(`${endpoint}${queryString ? `?${queryString}` : ''}`)
      setData(result)
    } catch (error: any) {
      console.error('Error loading report:', error)
      toast.error(error?.response?.data?.error || 'Error loading report')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [reportType, period, useDateRange, startDate, endDate, customerFilter, skuFilter, statusFilter])

  const handleExport = () => {
    if (!data) {
      toast.error('No data to export')
      return
    }

    try {
      let exportData: any[] = []

      if (reportType === 'summary' && data.summary) {
        exportData = data.summary.map((item: any) => ({
          Date: item.date,
          Orders: item.orders,
          Revenue: item.revenue,
          Quantity: item.quantity,
        }))
      } else if (reportType === 'bySku' && data.bySKU) {
        exportData = data.bySKU.map((item: any) => ({
          'SKU Code': item.sku.code,
          'SKU Name': item.sku.name,
          'Quantity Sold': item.quantity,
          Revenue: item.revenue,
        }))
      } else if (reportType === 'byCustomer' && data.byCustomer) {
        exportData = data.byCustomer.map((item: any) => ({
          'Customer Code': item.customer.code,
          'Customer Name': item.customer.name,
          Orders: item.orders,
          Revenue: item.revenue,
        }))
      } else if (reportType === 'slowMoving' && data.slowMoving) {
        exportData = data.slowMoving.map((item: any) => ({
          'SKU Code': item.sku.code,
          'SKU Name': item.sku.name,
          'Sales Quantity': item.salesQuantity,
          'Days Since Last Sale': item.daysSinceLastSale || 'Never',
        }))
      }

      if (exportData.length === 0) {
        toast.error('No data to export')
        return
      }

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')
      XLSX.writeFile(wb, `sales_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Report exported successfully!')
    } catch (error: any) {
      console.error('Error exporting report:', error)
      toast.error('Error exporting report')
    }
  }

  const renderSummaryReport = () => {
    if (!data?.summary) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-paper p-4 rounded-2xl shadow">
            <div className="text-sm text-ink-60">Total Orders</div>
            <div className="text-2xl font-bold text-ink">
              {data.summary.reduce((sum: number, item: any) => sum + item.orders, 0)}
            </div>
          </div>
          <div className="bg-wash p-4 rounded-2xl shadow border border-line">
            <div className="text-sm text-ink-60">Total Revenue</div>
            <div className="text-2xl font-bold text-ink">
              {formatCurrency(
                data.summary.reduce((sum: number, item: any) => sum + item.revenue, 0)
              )}
            </div>
          </div>
          <div className="bg-wash p-4 rounded-2xl shadow border border-line">
            <div className="text-sm text-ink-60">Total Quantity</div>
            <div className="text-2xl font-bold text-ink">
              {data.summary.reduce((sum: number, item: any) => sum + item.quantity, 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Revenue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.summary.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-ink">{item.date}</td>
                  <td className="px-4 py-3 text-ink">{item.orders}</td>
                  <td className="px-4 py-3 text-ink">{formatCurrency(item.revenue)}</td>
                  <td className="px-4 py-3 text-ink">{item.quantity.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderBySKUReport = () => {
    if (!data?.bySKU) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-paper p-4 rounded-2xl shadow">
            <div className="text-sm text-ink-60">Total Revenue</div>
            <div className="text-2xl font-bold text-ink">{formatCurrency(data.totalRevenue || 0)}</div>
          </div>
          <div className="bg-wash p-4 rounded-2xl shadow border border-line">
            <div className="text-sm text-ink-60">Total Orders</div>
            <div className="text-2xl font-bold text-ink">{data.totalOrders || 0}</div>
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Quantity Sold</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.bySKU.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-ink">{item.sku.name}</div>
                      <div className="text-xs text-ink-60">{item.sku.code}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink">{item.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-ink">{formatCurrency(item.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.topSKUs && data.topSKUs.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4 text-ink">Top Selling SKUs</h3>
            <div className="bg-paper rounded-2xl shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-wash">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.topSKUs.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-ink">{item.sku.name}</div>
                          <div className="text-xs text-ink-60">{item.sku.code}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink">{item.quantity.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderByCustomerReport = () => {
    if (!data?.byCustomer) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-paper p-4 rounded-2xl shadow">
            <div className="text-sm text-ink-60">Total Customers</div>
            <div className="text-2xl font-bold text-ink">{data.byCustomer.length}</div>
          </div>
          <div className="bg-wash p-4 rounded-2xl shadow border border-line">
            <div className="text-sm text-ink-60">Total Revenue</div>
            <div className="text-2xl font-bold text-ink">
              {formatCurrency(
                data.byCustomer.reduce((sum: number, item: any) => sum + item.revenue, 0)
              )}
            </div>
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Revenue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Average Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.byCustomer
                .sort((a: any, b: any) => b.revenue - a.revenue)
                .map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-ink">{item.customer.name}</div>
                        <div className="text-xs text-ink-60">{item.customer.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink">{item.orders}</td>
                    <td className="px-4 py-3 text-ink">{formatCurrency(item.revenue)}</td>
                    <td className="px-4 py-3 text-ink">
                      {formatCurrency(item.orders > 0 ? item.revenue / item.orders : 0)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderSlowMovingReport = () => {
    if (!data?.slowMoving) return null

    return (
      <div className="space-y-4">
        <div className="bg-warn-bg border border-line rounded-2xl p-4 mb-4">
          <div className="text-sm text-warn-ink">
            <strong>Slow Moving Items:</strong> SKUs with less than 10 units sold in the last {data.days} days
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Sales Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Days Since Last Sale</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.slowMoving.map((item: any, index: number) => {
                const isCritical = item.daysSinceLastSale === null || item.daysSinceLastSale > 180
                return (
                  <tr key={index} className={isCritical ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-ink">{item.sku.name}</div>
                        <div className="text-xs text-ink-60">{item.sku.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-red-600">{item.salesQuantity.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {item.daysSinceLastSale !== null ? (
                        <span className={item.daysSinceLastSale > 180 ? 'text-red-600 font-medium' : 'text-warn-ink'}>
                          {item.daysSinceLastSale} days
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isCritical ? (
                        <span className="px-2 py-1 text-xs rounded-xl bg-red-100 text-red-800">Critical</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-xl bg-warn-bg text-warn-ink">Slow</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Sales Reports</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
        </div>
        <Button variant="ghost" onClick={() => router.push('/reports')}>
          Back to Reports
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="mb-4 flex gap-4 flex-wrap items-center">
          <FormSelect
            label="Report Type"
            name="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            options={[
              { value: 'summary', label: 'Summary' },
              { value: 'bySku', label: 'By SKU' },
              { value: 'byCustomer', label: 'By Customer' },
              { value: 'slowMoving', label: 'Slow Moving Items' },
            ]}
          />
          {reportType === 'summary' && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useDateRange"
                  checked={useDateRange}
                  onChange={(e) => setUseDateRange(e.target.checked)}
                  className="rounded-xl"
                />
                <label htmlFor="useDateRange" className="text-sm text-ink">
                  Use Date Range
                </label>
              </div>
              {!useDateRange ? (
                <FormSelect
                  label="Period"
                  name="period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  options={[
                    { value: 'day', label: 'Daily' },
                    { value: 'week', label: 'Weekly' },
                    { value: 'month', label: 'Monthly' },
                  ]}
                />
              ) : (
                <>
                  <FormInput
                    label="Start Date"
                    name="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <FormInput
                    label="End Date"
                    name="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                  />
                </>
              )}
            </>
          )}
          {reportType !== 'slowMoving' && (
            <>
              <FormSelect
                label="Customer"
                name="customerId"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Customers' },
                  ...(customersData?.customers.map((c: any) => ({ value: String(c.id), label: `${c.code} - ${c.name}` })) || []),
                ]}
              />
              <FormSelect
                label="SKU"
                name="skuId"
                value={skuFilter}
                onChange={(e) => setSkuFilter(e.target.value)}
                options={[
                  { value: '', label: 'All SKUs' },
                  ...(skusData?.skus.map((s: any) => ({ value: String(s.id), label: `${s.code} - ${s.name}` })) || []),
                ]}
              />
              <FormSelect
                label="Status"
                name="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'partially_fulfilled', label: 'Partially Fulfilled' },
                  { value: 'fulfilled', label: 'Fulfilled' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </>
          )}
          <div className="flex gap-2 items-end">
            <Button
              variant="ghost"
              onClick={() => {
                setUseDateRange(false)
                setStartDate('')
                setEndDate('')
                setCustomerFilter('')
                setSkuFilter('')
                setStatusFilter('')
              }}
            >
              Clear Filters
            </Button>
            {data && (
              <Button variant="ghost" onClick={handleExport}>
                <FileXls size={16} /> Export Excel
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Loading report..." />
        ) : (
          <>
            {reportType === 'summary' && renderSummaryReport()}
            {reportType === 'bySku' && renderBySKUReport()}
            {reportType === 'byCustomer' && renderByCustomerReport()}
            {reportType === 'slowMoving' && renderSlowMovingReport()}
          </>
        )}
      </div>
    </div>
  )
}
