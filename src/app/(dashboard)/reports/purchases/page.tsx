'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSuppliers } from '@/hooks/useMasterData'
import { useItems } from '@/hooks/useItems'
import { apiClient } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import { useToast } from '@/contexts/ToastContext'
import { exportToPDF } from '@/lib/pdf-export'
import { Button } from '@/components/common/Button'
import { FileXls, FilePdf } from '@phosphor-icons/react'
import * as XLSX from 'xlsx'

export default function PurchaseReportPage() {
  const router = useRouter()
  const toast = useToast()
  const [reportType, setReportType] = useState<'summary' | 'bySupplier' | 'byItem'>('summary')
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')
  const [useDateRange, setUseDateRange] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [supplierFilter, setSupplierFilter] = useState<string>('')
  const [itemFilter, setItemFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { data: suppliersData } = useSuppliers()
  const { data: itemsData } = useItems()

  const loadReport = async () => {
    setIsLoading(true)
    try {
      let endpoint = '/api/reports/purchases'
      if (reportType === 'summary') {
        endpoint = '/api/reports/purchases/summary'
      }

      const queryParams = new URLSearchParams()
      if (reportType === 'summary' && !useDateRange) {
        queryParams.append('period', period)
      }
      if (useDateRange && startDate) queryParams.append('startDate', startDate)
      if (useDateRange && endDate) queryParams.append('endDate', endDate)
      if (supplierFilter) queryParams.append('supplierId', supplierFilter)
      if (itemFilter) queryParams.append('itemId', itemFilter)
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
  }, [reportType, period, useDateRange, startDate, endDate, supplierFilter, itemFilter, statusFilter])

  const handleExportExcel = () => {
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
          Amount: item.amount,
        }))
      } else if (reportType === 'bySupplier' && data.bySupplier) {
        exportData = data.bySupplier.map((item: any) => ({
          'Supplier Code': item.supplier.code,
          'Supplier Name': item.supplier.name,
          Orders: item.orders,
          Amount: item.amount,
        }))
      } else if (reportType === 'byItem' && data.byItem) {
        exportData = data.byItem.map((item: any) => ({
          'Item Code': item.item.code,
          'Item Name': item.item.name,
          Quantity: item.quantity,
          Amount: item.amount,
        }))
      }

      if (exportData.length === 0) {
        toast.error('No data to export')
        return
      }

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')
      XLSX.writeFile(wb, `purchases_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Report exported successfully!')
    } catch (error: any) {
      console.error('Error exporting report:', error)
      toast.error('Error exporting report')
    }
  }

  const handleExportPDF = () => {
    if (!data) {
      toast.error('No data to export')
      return
    }

    try {
      let exportData: any[] = []
      let columns: string[] = []
      let headers: string[] = []
      let title = ''

      if (reportType === 'summary' && data.summary) {
        title = 'Purchase Summary Report'
        columns = ['date', 'orders', 'amount']
        headers = ['Date', 'Orders', 'Amount']
        exportData = data.summary.map((item: any) => ({
          date: item.date,
          orders: item.orders,
          amount: formatCurrency(item.amount),
        }))
      } else if (reportType === 'bySupplier' && data.bySupplier) {
        title = 'Purchase Report by Supplier'
        columns = ['supplier', 'orders', 'amount']
        headers = ['Supplier', 'Orders', 'Amount']
        exportData = data.bySupplier.map((item: any) => ({
          supplier: `${item.supplier.code} - ${item.supplier.name}`,
          orders: item.orders,
          amount: formatCurrency(item.amount),
        }))
      } else if (reportType === 'byItem' && data.byItem) {
        title = 'Purchase Report by Item'
        columns = ['item', 'quantity', 'amount']
        headers = ['Item', 'Quantity', 'Amount']
        exportData = data.byItem.map((item: any) => ({
          item: `${item.item.code} - ${item.item.name}`,
          quantity: item.quantity.toLocaleString(),
          amount: formatCurrency(item.amount),
        }))
      }

      if (exportData.length === 0) {
        toast.error('No data to export')
        return
      }

      exportToPDF(title, exportData, columns, `purchases_${reportType}_${new Date().toISOString().split('T')[0]}`, headers)
      toast.success('PDF exported successfully!')
    } catch (error: any) {
      console.error('Error exporting PDF:', error)
      toast.error('Error exporting PDF')
    }
  }

  const renderSummaryReport = () => {
    if (!data?.summary) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-paper p-4 rounded-2xl shadow">
            <div className="text-sm text-ink-60">Total Orders</div>
            <div className="text-2xl font-bold text-ink">
              {data.summary.reduce((sum: number, item: any) => sum + item.orders, 0)}
            </div>
          </div>
          <div className="bg-wash p-4 rounded-2xl shadow border border-line">
            <div className="text-sm text-ink-60">Total Amount</div>
            <div className="text-2xl font-bold text-ink">
              {formatCurrency(
                data.summary.reduce((sum: number, item: any) => sum + item.amount, 0)
              )}
            </div>
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.summary.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-ink">{item.date}</td>
                  <td className="px-4 py-3 text-ink">{item.orders}</td>
                  <td className="px-4 py-3 text-ink">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderBySupplierReport = () => {
    if (!data?.bySupplier) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-paper p-4 rounded-2xl shadow">
            <div className="text-sm text-ink-60">Total Orders</div>
            <div className="text-2xl font-bold text-ink">{data.totalOrders || 0}</div>
          </div>
          <div className="bg-wash p-4 rounded-2xl shadow border border-line">
            <div className="text-sm text-ink-60">Total Amount</div>
            <div className="text-2xl font-bold text-ink">
              {formatCurrency(data.totalAmount || 0)}
            </div>
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Average Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.bySupplier
                .sort((a: any, b: any) => b.amount - a.amount)
                .map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-ink">{item.supplier.name}</div>
                        <div className="text-xs text-ink-60">{item.supplier.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink">{item.orders}</td>
                    <td className="px-4 py-3 text-ink">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3 text-ink">
                      {formatCurrency(item.orders > 0 ? item.amount / item.orders : 0)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderByItemReport = () => {
    if (!data?.byItem) return null

    return (
      <div className="space-y-4">
        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Average Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.byItem
                .sort((a: any, b: any) => b.amount - a.amount)
                .map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-ink">{item.item.name}</div>
                        <div className="text-xs text-ink-60">{item.item.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-ink">{item.item.category.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-ink">{item.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-ink">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3 text-ink">
                      {formatCurrency(item.quantity > 0 ? item.amount / item.quantity : 0)}
                    </td>
                  </tr>
                ))}
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
          <h1 className="font-serif font-medium text-4xl">Purchase Reports</h1>
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
              { value: 'bySupplier', label: 'By Supplier' },
              { value: 'byItem', label: 'By Item' },
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
          {(reportType === 'bySupplier' || reportType === 'byItem') && (
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
          <FormSelect
            label="Supplier"
            name="supplierId"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            options={[
              { value: '', label: 'All Suppliers' },
              ...(suppliersData?.suppliers.map((s: any) => ({ value: String(s.id), label: `${s.code} - ${s.name}` })) || []),
            ]}
          />
          <FormSelect
            label="Item"
            name="itemId"
            value={itemFilter}
            onChange={(e) => setItemFilter(e.target.value)}
            options={[
              { value: '', label: 'All Items' },
              ...(itemsData?.items.map((i: any) => ({ value: String(i.id), label: `${i.code} - ${i.name}` })) || []),
            ]}
          />
          <FormSelect
            label="Status"
            name="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'partially_received', label: 'Partially Received' },
              { value: 'received', label: 'Received' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <div className="flex gap-2 items-end">
            <Button
              variant="ghost"
              onClick={() => {
                setUseDateRange(false)
                setStartDate('')
                setEndDate('')
                setSupplierFilter('')
                setItemFilter('')
                setStatusFilter('')
              }}
            >
              Clear Filters
            </Button>
            {data && (
              <>
                <Button variant="ghost" onClick={handleExportExcel}>
                  <FileXls size={16} /> Export Excel
                </Button>
                <Button variant="ghost" onClick={handleExportPDF}>
                  <FilePdf size={16} /> Export PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Loading report..." />
        ) : (
          <>
            {reportType === 'summary' && renderSummaryReport()}
            {reportType === 'bySupplier' && renderBySupplierReport()}
            {reportType === 'byItem' && renderByItemReport()}
          </>
        )}
      </div>
    </div>
  )
}
