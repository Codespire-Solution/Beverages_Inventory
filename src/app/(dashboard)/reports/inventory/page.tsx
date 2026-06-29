'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWarehouses } from '@/hooks/useMasterData'
import { useItems } from '@/hooks/useItems'
import { apiClient } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import FormSelect from '@/components/common/FormSelect'
import FormInput from '@/components/common/FormInput'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/common/Button'
import { FileXls } from '@phosphor-icons/react'
import * as XLSX from 'xlsx'

export default function InventoryReportPage() {
  const router = useRouter()
  const toast = useToast()
  const [reportType, setReportType] = useState<'levels' | 'valuation' | 'movement' | 'low_stock' | 'expiring'>('levels')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [warehouseFilter, setWarehouseFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [itemFilter, setItemFilter] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: warehousesData } = useWarehouses()
  const { data: itemsData } = useItems()

  const loadReport = async () => {
    setIsLoading(true)
    try {
      let endpoint = '/api/reports/inventory'
      if (reportType === 'valuation') {
        endpoint = '/api/reports/inventory/valuation'
      } else if (reportType === 'movement') {
        endpoint = '/api/reports/inventory/movement'
      } else if (reportType === 'low_stock') {
        endpoint = '/api/reports/inventory/low-stock'
      } else if (reportType === 'expiring') {
        endpoint = '/api/reports/inventory/expiring'
      }

      const queryParams = new URLSearchParams()
      if (warehouseFilter) queryParams.append('warehouseId', warehouseFilter)
      if (categoryFilter) queryParams.append('category', categoryFilter)
      if (itemFilter) queryParams.append('itemId', itemFilter)
      if (startDate) queryParams.append('startDate', startDate)
      if (endDate) queryParams.append('endDate', endDate)

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
  }, [reportType, warehouseFilter, categoryFilter, itemFilter, startDate, endDate])

  const handleExport = () => {
    if (!data) {
      toast.error('No data to export')
      return
    }

    try {
      let exportData: any[] = []

      if (reportType === 'levels' && data.stockByWarehouse) {
        exportData = data.stockByWarehouse.map((stock: any) => ({
          Warehouse: stock.warehouse.name,
          'Item Code': stock.item.code,
          'Item Name': stock.item.name,
          Category: stock.item.category,
          'Total Quantity': stock.totalQuantity,
          'Total Value': stock.totalValue,
        }))
      } else if (reportType === 'valuation' && data.byCategory) {
        exportData = data.byCategory.map((cat: any) => ({
          Category: cat.category,
          Quantity: cat.quantity,
          Value: cat.value,
        }))
      } else if (reportType === 'movement' && data.movements) {
        exportData = data.movements.map((movement: any) => ({
          Date: formatDate(movement.date),
          Type: movement.type,
          Reference: movement.reference,
          Item: movement.item?.name || movement.sku?.name || 'N/A',
          Warehouse: movement.warehouse.name,
          Quantity: movement.quantity,
          Unit: movement.unit.code,
        }))
      } else if (reportType === 'low_stock' && data.lowStockItems) {
        exportData = data.lowStockItems.map((stock: any) => ({
          Warehouse: stock.warehouse.name,
          'Item Code': stock.item.code,
          'Item Name': stock.item.name,
          Category: stock.item.category,
          'Current Stock': stock.totalQuantity,
          'Min Stock': stock.item.minStockQuantity || 100,
        }))
      } else if (reportType === 'expiring' && data.expiringItems) {
        exportData = data.expiringItems.map((item: any) => ({
          Warehouse: item.warehouse.name,
          'Item Code': item.item.code,
          'Item Name': item.item.name,
          Category: item.item.category,
          'Total Quantity': item.totalQuantity,
          'Earliest Expiry': item.earliestExpiry ? formatDate(item.earliestExpiry) : 'N/A',
        }))
      }

      if (exportData.length === 0) {
        toast.error('No data to export')
        return
      }

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')
      XLSX.writeFile(wb, `inventory_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Report exported successfully!')
    } catch (error: any) {
      console.error('Error exporting report:', error)
      toast.error('Error exporting report')
    }
  }

  const renderLevelsReport = () => {
    if (!data?.stockByWarehouse) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-paper p-4 rounded-2xl shadow">
            <div className="text-sm text-ink-60">Total Items</div>
            <div className="text-2xl font-bold text-ink">{data.totalItems}</div>
          </div>
          <div className="bg-warn-bg p-4 rounded-2xl shadow border border-line">
            <div className="text-sm text-warn-ink">Low Stock Items</div>
            <div className="text-2xl font-bold text-warn-ink">{data.lowStockItems}</div>
          </div>
          <div className="bg-warn-bg p-4 rounded-2xl shadow border border-line">
            <div className="text-sm text-warn-ink">Expiring Items</div>
            <div className="text-2xl font-bold text-warn-ink">{data.expiringItems}</div>
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Warehouse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Total Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.stockByWarehouse.map((stock: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-ink">{stock.warehouse.name}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-ink">{stock.item.name}</div>
                      <div className="text-xs text-ink-60">{stock.item.code}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-ink">{stock.item.category.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-ink">{stock.totalQuantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-ink">{formatCurrency(stock.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderValuationReport = () => {
    if (!data) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-paper p-4 rounded-2xl shadow">
            <div className="text-sm text-ink-60">Total Quantity</div>
            <div className="text-2xl font-bold text-ink">{data.totalQuantity?.toLocaleString() || 0}</div>
          </div>
          <div className="bg-wash p-4 rounded-2xl shadow border border-line">
            <div className="text-sm text-ink-60">Total Value</div>
            <div className="text-2xl font-bold text-ink">
              {formatCurrency(data.totalValue || 0)}
            </div>
          </div>
        </div>

        {data.byCategory && data.byCategory.length > 0 && (
          <div className="bg-paper rounded-2xl shadow overflow-hidden">
            <h3 className="px-4 py-3 bg-wash font-semibold text-ink">By Category</h3>
            <table className="min-w-full">
              <thead className="bg-wash">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.byCategory.map((cat: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 capitalize text-ink">{cat.category.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-ink">{cat.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-ink">{formatCurrency(cat.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  const renderMovementReport = () => {
    if (!data?.movements) return null

    return (
      <div className="space-y-4">
        {data.summary && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-paper p-4 rounded-2xl shadow">
              <div className="text-sm text-ink-60">Total Movements</div>
              <div className="text-2xl font-bold text-ink">{data.summary.totalMovements}</div>
            </div>
            <div className="bg-wash p-4 rounded-2xl shadow border border-line">
              <div className="text-sm text-ink-60">Receipts</div>
              <div className="text-2xl font-bold text-ink">{data.summary.receipts}</div>
            </div>
            <div className="bg-wash p-4 rounded-2xl shadow border border-line">
              <div className="text-sm text-ink-60">Deliveries</div>
              <div className="text-2xl font-bold text-ink">{data.summary.deliveries}</div>
            </div>
            <div className="bg-warn-bg p-4 rounded-2xl shadow border border-line">
              <div className="text-sm text-warn-ink">Adjustments</div>
              <div className="text-2xl font-bold text-warn-ink">{data.summary.adjustments}</div>
            </div>
            <div className="bg-wash p-4 rounded-2xl shadow border border-line">
              <div className="text-sm text-ink-60">Transfers</div>
              <div className="text-2xl font-bold text-ink">{data.summary.transfers}</div>
            </div>
          </div>
        )}

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Item/SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Warehouse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.movements.map((movement: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-ink">{formatDate(movement.date)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-xl capitalize text-ink">
                      {movement.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">{movement.reference}</td>
                  <td className="px-4 py-3">
                    {movement.item ? (
                      <div>
                        <div className="font-medium text-ink">{movement.item.name}</div>
                        <div className="text-xs text-ink-60">{movement.item.code}</div>
                      </div>
                    ) : movement.sku ? (
                      <div>
                        <div className="font-medium text-ink">{movement.sku.name}</div>
                        <div className="text-xs text-ink-60">{movement.sku.code}</div>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">{movement.warehouse.name}</td>
                  <td className={`px-4 py-3 font-medium ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {movement.quantity > 0 ? '+' : ''}{movement.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-ink">{movement.unit.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderLowStockReport = () => {
    if (!data?.lowStockItems) return null

    return (
      <div className="space-y-4">
        <div className="bg-warn-bg border border-line rounded-2xl p-4 mb-4">
          <div className="text-sm text-warn-ink">
            <strong>Threshold:</strong> Items with stock below {data.threshold} units (or item's min stock quantity)
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Warehouse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Current Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Min Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Shortfall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.lowStockItems.map((stock: any, index: number) => {
                const minStock = stock.item.minStockQuantity || 100
                const shortfall = minStock - stock.totalQuantity
                return (
                  <tr key={index} className={shortfall > 0 ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 text-ink">{stock.warehouse.name}</td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-ink">{stock.item.name}</div>
                        <div className="text-xs text-ink-60">{stock.item.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-ink">{stock.item.category.replace('_', ' ')}</td>
                    <td className="px-4 py-3 font-medium text-red-600">{stock.totalQuantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-ink">{minStock.toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-red-600">
                      {shortfall > 0 ? `-${shortfall.toLocaleString()}` : 'OK'}
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

  const renderExpiringReport = () => {
    if (!data?.expiringItems) return null

    return (
      <div className="space-y-4">
        <div className="bg-warn-bg border border-line rounded-2xl p-4 mb-4">
          <div className="text-sm text-warn-ink">
            <strong>Expiring within:</strong> {data.days} days
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Warehouse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Total Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Earliest Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Days Until Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.expiringItems.map((item: any, index: number) => {
                const daysUntilExpiry = item.earliestExpiry
                  ? Math.ceil((new Date(item.earliestExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null
                return (
                  <tr key={index} className={daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 text-ink">{item.warehouse.name}</td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-ink">{item.item.name}</div>
                        <div className="text-xs text-ink-60">{item.item.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-ink">{item.item.category.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-ink">{item.totalQuantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-ink">
                      {item.earliestExpiry ? formatDate(item.earliestExpiry) : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      {daysUntilExpiry !== null ? (
                        <span className={daysUntilExpiry <= 7 ? 'text-red-600 font-medium' : 'text-orange-600 font-medium'}>
                          {daysUntilExpiry} days
                        </span>
                      ) : (
                        'N/A'
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
          <h1 className="font-serif font-medium text-4xl">Inventory Reports</h1>
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
              { value: 'levels', label: 'Stock Levels' },
              { value: 'valuation', label: 'Stock Valuation' },
              { value: 'movement', label: 'Stock Movement' },
              { value: 'low_stock', label: 'Low Stock Items' },
              { value: 'expiring', label: 'Expiring Items' },
            ]}
          />
          <FormSelect
            label="Warehouse"
            name="warehouseId"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            options={[
              { value: '', label: 'All Warehouses' },
              ...(warehousesData?.warehouses.map((w: any) => ({ value: String(w.id), label: w.name })) || []),
            ]}
          />
          <FormSelect
            label="Category"
            name="category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'raw_material', label: 'Raw Material' },
              { value: 'packaging', label: 'Packaging' },
              { value: 'finished_good', label: 'Finished Good' },
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
          <div className="flex gap-2 items-end">
            <Button
              variant="ghost"
              onClick={() => {
                setWarehouseFilter('')
                setCategoryFilter('')
                setItemFilter('')
                setStartDate('')
                setEndDate('')
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
            {reportType === 'levels' && renderLevelsReport()}
            {reportType === 'valuation' && renderValuationReport()}
            {reportType === 'movement' && renderMovementReport()}
            {reportType === 'low_stock' && renderLowStockReport()}
            {reportType === 'expiring' && renderExpiringReport()}
          </>
        )}
      </div>
    </div>
  )
}
