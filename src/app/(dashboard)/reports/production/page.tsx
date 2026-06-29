'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSKUs } from '@/hooks/useMasterData'
import { useWarehouses } from '@/hooks/useMasterData'
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

export default function ProductionReportPage() {
  const router = useRouter()
  const toast = useToast()
  const [reportType, setReportType] = useState<'summary' | 'yield' | 'waste' | 'efficiency'>('summary')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [skuFilter, setSkuFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { data: skusData } = useSKUs()
  const { data: warehousesData } = useWarehouses()

  const loadReport = async () => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (startDate) queryParams.append('startDate', startDate)
      if (endDate) queryParams.append('endDate', endDate)
      if (skuFilter) queryParams.append('skuId', skuFilter)
      if (statusFilter) queryParams.append('status', statusFilter)
      if (warehouseFilter) queryParams.append('warehouseId', warehouseFilter)

      const queryString = queryParams.toString()
      const result = await apiClient.get<any>(`/api/reports/production${queryString ? `?${queryString}` : ''}`)
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
  }, [startDate, endDate, skuFilter, statusFilter, warehouseFilter])

  const handleExportExcel = () => {
    if (!data) {
      toast.error('No data to export')
      return
    }

    try {
      let exportData: any[] = []

      if (reportType === 'summary' && data.bySKU) {
        exportData = data.bySKU.map((item: any) => ({
          'SKU Code': item.sku.code,
          'SKU Name': item.sku.name,
          Batches: item.batches,
          'Target Quantity': item.targetQuantity,
          'Actual Quantity': item.actualQuantity,
          'Waste Quantity': item.wasteQuantity,
          'Yield %': item.yieldPercentage,
        }))
      } else if (reportType === 'yield' && data.yieldAnalysis) {
        exportData = data.yieldAnalysis.map((item: any) => ({
          'Batch Number': item.batch.batchNumber,
          'SKU': item.batch.sku.name,
          'Target Quantity': item.batch.targetQuantity,
          'Actual Quantity': item.batch.actualQuantity || 0,
          'Yield %': item.yieldPercentage,
          'Waste %': item.wastePercentage,
        }))
      } else if (reportType === 'waste' && data.wasteAnalysis) {
        exportData = data.wasteAnalysis.map((item: any) => ({
          'SKU Code': item.sku.code,
          'SKU Name': item.sku.name,
          Batches: item.batches,
          'Total Waste': item.totalWaste,
          'Waste %': item.wastePercentage,
          'Average Waste per Batch': item.averageWastePerBatch,
        }))
      } else if (reportType === 'efficiency' && data.efficiencyMetrics) {
        exportData = data.efficiencyMetrics.map((item: any) => ({
          'Batch Number': item.batch.batchNumber,
          'SKU': item.batch.sku.name,
          'Material Cost': item.materialCost,
          'Yield %': item.yieldPercentage,
          'Cost per Unit': item.costPerUnit,
          Efficiency: item.efficiency,
        }))
      }

      if (exportData.length === 0) {
        toast.error('No data to export')
        return
      }

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')
      XLSX.writeFile(wb, `production_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`)
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

      if (reportType === 'summary' && data.bySKU) {
        title = 'Production Summary Report'
        columns = ['sku', 'batches', 'targetQuantity', 'actualQuantity', 'wasteQuantity', 'yieldPercentage']
        headers = ['SKU', 'Batches', 'Target', 'Actual', 'Waste', 'Yield %']
        exportData = data.bySKU.map((item: any) => ({
          sku: `${item.sku.code} - ${item.sku.name}`,
          batches: item.batches,
          targetQuantity: item.targetQuantity.toLocaleString(),
          actualQuantity: item.actualQuantity.toLocaleString(),
          wasteQuantity: item.wasteQuantity.toLocaleString(),
          yieldPercentage: `${item.yieldPercentage}%`,
        }))
      } else if (reportType === 'yield' && data.yieldAnalysis) {
        title = 'Production Yield Analysis Report'
        columns = ['batch', 'target', 'actual', 'yield', 'waste']
        headers = ['Batch', 'Target', 'Actual', 'Yield %', 'Waste %']
        exportData = data.yieldAnalysis.map((item: any) => ({
          batch: item.batch.batchNumber,
          target: item.batch.targetQuantity.toLocaleString(),
          actual: (item.batch.actualQuantity || 0).toLocaleString(),
          yield: `${item.yieldPercentage}%`,
          waste: `${item.wastePercentage}%`,
        }))
      } else if (reportType === 'waste' && data.wasteAnalysis) {
        title = 'Production Waste Analysis Report'
        columns = ['sku', 'batches', 'totalWaste', 'wastePercentage', 'averageWastePerBatch']
        headers = ['SKU', 'Batches', 'Total Waste', 'Waste %', 'Avg Waste/Batch']
        exportData = data.wasteAnalysis.map((item: any) => ({
          sku: `${item.sku.code} - ${item.sku.name}`,
          batches: item.batches,
          totalWaste: item.totalWaste.toLocaleString(),
          wastePercentage: `${item.wastePercentage}%`,
          averageWastePerBatch: item.averageWastePerBatch,
        }))
      } else if (reportType === 'efficiency' && data.efficiencyMetrics) {
        title = 'Production Efficiency Metrics Report'
        columns = ['batch', 'materialCost', 'yield', 'costPerUnit', 'efficiency']
        headers = ['Batch', 'Material Cost', 'Yield %', 'Cost/Unit', 'Efficiency']
        exportData = data.efficiencyMetrics.map((item: any) => ({
          batch: item.batch.batchNumber,
          materialCost: formatCurrency(item.materialCost),
          yield: `${item.yieldPercentage}%`,
          costPerUnit: formatCurrency(parseFloat(item.costPerUnit)),
          efficiency: item.efficiency,
        }))
      }

      if (exportData.length === 0) {
        toast.error('No data to export')
        return
      }

      exportToPDF(title, exportData, columns, `production_${reportType}_${new Date().toISOString().split('T')[0]}`, headers)
      toast.success('PDF exported successfully!')
    } catch (error: any) {
      console.error('Error exporting PDF:', error)
      toast.error('Error exporting PDF')
    }
  }

  const renderSummaryReport = () => {
    if (!data) return null

    return (
      <div className="space-y-6">
        {data.averages && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-paper p-4 rounded-2xl shadow">
              <div className="text-sm text-ink-60">Average Yield</div>
              <div className="text-2xl font-bold text-ink">{data.averages.yieldPercentage}%</div>
            </div>
            <div className="bg-paper p-4 rounded-2xl shadow">
              <div className="text-sm text-ink-60">Total Target</div>
              <div className="text-2xl font-bold text-ink">{data.averages.totalTarget?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-paper p-4 rounded-2xl shadow">
              <div className="text-sm text-ink-60">Total Actual</div>
              <div className="text-2xl font-bold text-ink">{data.averages.totalActual?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-wash p-4 rounded-2xl shadow border border-line">
              <div className="text-sm text-ink-60">Total Waste</div>
              <div className="text-2xl font-bold text-ink">
                {data.averages.totalWaste?.toLocaleString() || 0}
              </div>
            </div>
            <div className="bg-wash p-4 rounded-2xl shadow border border-line">
              <div className="text-sm text-ink-60">Waste %</div>
              <div className="text-2xl font-bold text-ink">
                {data.averages.wastePercentage || 0}%
              </div>
            </div>
          </div>
        )}

        {data.bySKU && data.bySKU.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-ink">Production by SKU</h3>
            <div className="bg-paper rounded-2xl shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-wash">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Batches</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Target</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Actual</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Waste</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Yield %</th>
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
                      <td className="px-4 py-3 text-ink">{item.batches}</td>
                      <td className="px-4 py-3 text-ink">{item.targetQuantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-ink">{item.actualQuantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-600">{item.wasteQuantity.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            parseFloat(item.yieldPercentage) >= 95
                              ? 'text-green-600 font-medium'
                              : parseFloat(item.yieldPercentage) >= 90
                              ? 'text-warn-ink font-medium'
                              : 'text-red-600 font-medium'
                          }
                        >
                          {item.yieldPercentage}%
                        </span>
                      </td>
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

  const renderYieldAnalysisReport = () => {
    if (!data?.yieldAnalysis) return null

    return (
      <div className="space-y-4">
        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Production Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Actual</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Yield %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Waste %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.yieldAnalysis.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-ink">{item.batch.batchNumber}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-ink">{item.batch.sku.name}</div>
                      <div className="text-xs text-ink-60">{item.batch.sku.code}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink">{formatDate(item.batch.productionDate)}</td>
                  <td className="px-4 py-3 text-ink">{item.batch.targetQuantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-ink">{item.batch.actualQuantity?.toLocaleString() || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        parseFloat(item.yieldPercentage) >= 95
                          ? 'text-green-600 font-medium'
                          : parseFloat(item.yieldPercentage) >= 90
                          ? 'text-warn-ink font-medium'
                          : 'text-red-600 font-medium'
                      }
                    >
                      {item.yieldPercentage}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        parseFloat(item.wastePercentage) <= 5
                          ? 'text-green-600'
                          : parseFloat(item.wastePercentage) <= 10
                          ? 'text-warn-ink'
                          : 'text-red-600 font-medium'
                      }
                    >
                      {item.wastePercentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderWasteAnalysisReport = () => {
    if (!data?.wasteAnalysis) return null

    return (
      <div className="space-y-4">
        <div className="bg-warn-bg border border-line rounded-2xl p-4 mb-4">
          <div className="text-sm text-warn-ink">
            <strong>Waste Analysis:</strong> Identifies SKUs with highest waste percentages and total waste quantities
          </div>
        </div>

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Batches</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Total Waste</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Waste %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Average Waste per Batch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.wasteAnalysis.map((item: any, index: number) => {
                const isHighWaste = parseFloat(item.wastePercentage) > 10
                return (
                  <tr key={index} className={isHighWaste ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-ink">{item.sku.name}</div>
                        <div className="text-xs text-ink-60">{item.sku.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink">{item.batches}</td>
                    <td className="px-4 py-3 font-medium text-red-600">{item.totalWaste.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          parseFloat(item.wastePercentage) <= 5
                            ? 'text-green-600'
                            : parseFloat(item.wastePercentage) <= 10
                            ? 'text-warn-ink'
                            : 'text-red-600 font-medium'
                        }
                      >
                        {item.wastePercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">{item.averageWastePerBatch}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderEfficiencyMetricsReport = () => {
    if (!data?.efficiencyMetrics) return null

    return (
      <div className="space-y-4">
        {data.averages && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-paper p-4 rounded-2xl shadow">
              <div className="text-sm text-ink-60">Average Material Cost</div>
              <div className="text-2xl font-bold text-ink">{formatCurrency(parseFloat(data.averages.averageMaterialCost || '0'))}</div>
            </div>
            <div className="bg-paper p-4 rounded-2xl shadow">
              <div className="text-sm text-ink-60">Average Cost per Unit</div>
              <div className="text-2xl font-bold text-ink">{formatCurrency(parseFloat(data.averages.averageCostPerUnit || '0'))}</div>
            </div>
            <div className="bg-paper p-4 rounded-2xl shadow">
              <div className="text-sm text-ink-60">Average Yield</div>
              <div className="text-2xl font-bold text-ink">{data.averages.yieldPercentage}%</div>
            </div>
            <div className="bg-paper p-4 rounded-2xl shadow">
              <div className="text-sm text-ink-60">Total Batches</div>
              <div className="text-2xl font-bold text-ink">{data.totalBatches || 0}</div>
            </div>
          </div>
        )}

        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-wash">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Material Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Yield %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Cost per Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-60">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.efficiencyMetrics.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-ink">{item.batch.batchNumber}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-ink">{item.batch.sku.name}</div>
                      <div className="text-xs text-ink-60">{item.batch.sku.code}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink">{formatCurrency(item.materialCost)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        parseFloat(item.yieldPercentage) >= 95
                          ? 'text-green-600 font-medium'
                          : parseFloat(item.yieldPercentage) >= 90
                          ? 'text-warn-ink font-medium'
                          : 'text-red-600 font-medium'
                      }
                    >
                      {item.yieldPercentage}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">{formatCurrency(parseFloat(item.costPerUnit))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        item.efficiency === 'High'
                          ? 'px-2 py-1 text-xs rounded-xl bg-green-100 text-green-800'
                          : item.efficiency === 'Medium'
                          ? 'px-2 py-1 text-xs rounded-xl bg-warn-bg text-warn-ink'
                          : 'px-2 py-1 text-xs rounded-xl bg-red-100 text-red-800'
                      }
                    >
                      {item.efficiency}
                    </span>
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
          <h1 className="font-serif font-medium text-4xl">Production Reports</h1>
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
              { value: 'yield', label: 'Yield Analysis' },
              { value: 'waste', label: 'Waste Analysis' },
              { value: 'efficiency', label: 'Efficiency Metrics' },
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
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
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
          <div className="flex gap-2 items-end">
            <Button
              variant="ghost"
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setSkuFilter('')
                setStatusFilter('')
                setWarehouseFilter('')
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
            {reportType === 'yield' && renderYieldAnalysisReport()}
            {reportType === 'waste' && renderWasteAnalysisReport()}
            {reportType === 'efficiency' && renderEfficiencyMetricsReport()}
          </>
        )}
      </div>
    </div>
  )
}
