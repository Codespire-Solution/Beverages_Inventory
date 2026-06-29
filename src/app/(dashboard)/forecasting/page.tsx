'use client'

import { useState } from 'react'
import { useForecasts, useGenerateForecasts, useForecastAccuracy, useUpdateForecast, useDeleteForecast, useForecast, useForecastHistoricalSales } from '@/hooks/useForecasts'
import { useSKUs } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import FormInput from '@/components/common/FormInput'
import FormSelect from '@/components/common/FormSelect'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import { Button } from '@/components/common/Button'
import { Pencil, Trash } from '@phosphor-icons/react'

export default function ForecastingPage() {
  const toast = useToast()
  const [selectedSKU, setSelectedSKU] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minAccuracy, setMinAccuracy] = useState('')
  const [maxAccuracy, setMaxAccuracy] = useState('')
  const [selectedForecast, setSelectedForecast] = useState<number | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showUpdateActualModal, setShowUpdateActualModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [forecastToDelete, setForecastToDelete] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState({ forecastedQuantity: '' })
  const [actualFormData, setActualFormData] = useState({ actualQuantity: '' })

  const { data: forecastsData } = useForecasts({
    skuId: selectedSKU ? parseInt(selectedSKU) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    minAccuracy: minAccuracy ? parseFloat(minAccuracy) : undefined,
    maxAccuracy: maxAccuracy ? parseFloat(maxAccuracy) : undefined,
  })
  const { data: skusData } = useSKUs()
  const generateForecasts = useGenerateForecasts()
  const { data: accuracyData } = useForecastAccuracy(selectedSKU ? parseInt(selectedSKU) : undefined)
  const updateForecast = useUpdateForecast()
  const deleteForecast = useDeleteForecast()
  const { data: selectedForecastData } = useForecast(selectedForecast)
  const { data: historicalSalesData } = useForecastHistoricalSales(selectedForecast)

  const handleGenerate = async () => {
    if (!selectedSKU) {
      toast.error('Please select a SKU')
      return
    }
    try {
      await generateForecasts.mutateAsync({ skuId: parseInt(selectedSKU), months: 3 })
      toast.success('Forecasts generated successfully!')
    } catch (error: any) {
      console.error('Error generating forecasts:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error generating forecasts'
      toast.error(errorMessage)
    }
  }

  const handleRegenerate = async () => {
    if (!selectedSKU) {
      toast.error('Please select a SKU')
      return
    }
    try {
      await generateForecasts.mutateAsync({ skuId: parseInt(selectedSKU), months: 3 })
      toast.success('Forecasts regenerated successfully!')
    } catch (error: any) {
      console.error('Error regenerating forecasts:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error regenerating forecasts'
      toast.error(errorMessage)
    }
  }

  const handleEdit = (forecast: any) => {
    setSelectedForecast(forecast.id)
    setEditFormData({ forecastedQuantity: forecast.forecastedQuantity.toString() })
    setShowEditModal(true)
  }

  const handleUpdateActual = (forecast: any) => {
    setSelectedForecast(forecast.id)
    setActualFormData({ actualQuantity: forecast.actualQuantity?.toString() || '' })
    setShowUpdateActualModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedForecast) return
    try {
      await updateForecast.mutateAsync({
        id: selectedForecast,
        data: {
          forecastedQuantity: parseFloat(editFormData.forecastedQuantity),
        },
      })
      toast.success('Forecast updated successfully!')
      setShowEditModal(false)
      setSelectedForecast(null)
      setEditFormData({ forecastedQuantity: '' })
    } catch (error: any) {
      console.error('Error updating forecast:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating forecast'
      toast.error(errorMessage)
    }
  }

  const handleSaveActual = async () => {
    if (!selectedForecast) return
    try {
      await updateForecast.mutateAsync({
        id: selectedForecast,
        data: {
          actualQuantity: parseFloat(actualFormData.actualQuantity),
        },
      })
      toast.success('Actual quantity updated successfully!')
      setShowUpdateActualModal(false)
      setSelectedForecast(null)
      setActualFormData({ actualQuantity: '' })
    } catch (error: any) {
      console.error('Error updating actual quantity:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating actual quantity'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async () => {
    if (!forecastToDelete) return
    try {
      await deleteForecast.mutateAsync(forecastToDelete)
      toast.success('Forecast deleted successfully!')
      setShowDeleteConfirm(false)
      setForecastToDelete(null)
    } catch (error: any) {
      console.error('Error deleting forecast:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error deleting forecast'
      toast.error(errorMessage)
    }
  }

  const handleViewDetails = (forecast: any) => {
    setSelectedForecast(forecast.id)
  }

  const handleExport = () => {
    if (!forecastsData?.forecasts || forecastsData.forecasts.length === 0) {
      toast.error('No forecasts to export')
      return
    }

    const exportData = forecastsData.forecasts.map((forecast: any) => {
      const variance = forecast.actualQuantity
        ? forecast.forecastedQuantity - forecast.actualQuantity
        : null
      const accuracy = forecast.actualQuantity
        ? 100 - (Math.abs(variance!) / forecast.actualQuantity) * 100
        : null

      return {
        SKU: forecast.sku.name,
        'SKU Code': forecast.sku.code,
        'Forecast Month': formatDate(forecast.forecastMonth),
        'Forecasted Quantity': forecast.forecastedQuantity,
        'Actual Quantity': forecast.actualQuantity || '',
        Variance: variance || '',
        'Accuracy %': accuracy ? accuracy.toFixed(2) : '',
        'Created At': formatDate(forecast.createdAt),
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Forecasts')
    XLSX.writeFile(wb, `forecasts_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Forecasts exported successfully!')
  }

  // Prepare chart data
  const chartData: any[] = []
  if (selectedForecastData?.forecast && historicalSalesData?.historicalData) {
    // Add historical data
    historicalSalesData.historicalData.forEach((item) => {
      chartData.push({
        month: formatDate(item.month, 'MMM yyyy'),
        historical: item.quantity,
        forecast: null,
        actual: null,
      })
    })

    // Add forecast data
    const forecast = selectedForecastData.forecast
    chartData.push({
      month: formatDate(forecast.forecastMonth, 'MMM yyyy'),
      historical: null,
      forecast: forecast.forecastedQuantity,
      actual: forecast.actualQuantity || null,
    })
  }

  // Calculate accuracy for each forecast
  const forecastsWithAccuracy = forecastsData?.forecasts.map((forecast: any) => {
    const variance = forecast.actualQuantity
      ? forecast.forecastedQuantity - forecast.actualQuantity
      : null
    const accuracy = forecast.actualQuantity
      ? 100 - (Math.abs(variance!) / forecast.actualQuantity) * 100
      : null
    return { ...forecast, variance, accuracy }
  }) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Sales Forecasting</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Generate and manage sales forecasts</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleRegenerate}
            disabled={!selectedSKU || generateForecasts.isPending}
          >
            {generateForecasts.isPending && <LoadingSpinner text="" />}
            Regenerate Forecasts
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={!selectedSKU || generateForecasts.isPending}
          >
            {generateForecasts.isPending && <LoadingSpinner text="" />}
            {generateForecasts.isPending ? 'Generating...' : 'Generate Forecasts'}
          </Button>
          {forecastsData?.forecasts && forecastsData.forecasts.length > 0 && (
            <Button
              variant="ghost"
              onClick={handleExport}
            >
              Export Excel
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <FormSelect
            label="Filter by SKU"
            name="skuId"
            value={selectedSKU}
            onChange={(e) => setSelectedSKU(e.target.value)}
            options={[
              { value: '', label: 'All SKUs' },
              ...(skusData?.skus.map((sku: any) => ({ value: String(sku.id), label: sku.name })) || []),
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
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setSelectedSKU('')
                setStartDate('')
                setEndDate('')
                setMinAccuracy('')
                setMaxAccuracy('')
              }}
              className="px-4 py-2 text-sm font-medium text-ink bg-paper border border-line rounded-xl hover:bg-wash"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Accuracy Filters */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Min Accuracy (%)"
            name="minAccuracy"
            type="number"
            value={minAccuracy}
            onChange={(e) => setMinAccuracy(e.target.value)}
            placeholder="e.g., 80"
          />
          <FormInput
            label="Max Accuracy (%)"
            name="maxAccuracy"
            type="number"
            value={maxAccuracy}
            onChange={(e) => setMaxAccuracy(e.target.value)}
            placeholder="e.g., 100"
          />
        </div>
      </div>

      {/* Accuracy Summary */}
      {accuracyData && (
        <div className="bg-wash border border-line rounded-2xl p-4">
          <h3 className="font-semibold mb-2">Forecast Accuracy Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-ink-60">Average Accuracy</div>
              <div className="text-2xl font-bold text-accent-ink">{accuracyData.averageAccuracy}%</div>
            </div>
            <div>
              <div className="text-sm text-ink-60">Total Forecasts Analyzed</div>
              <div className="text-2xl font-bold">{accuracyData.totalForecasts}</div>
            </div>
            {accuracyData.mape && (
              <div>
                <div className="text-sm text-ink-60">MAPE (Mean Absolute % Error)</div>
                <div className="text-2xl font-bold text-accent-ink">{accuracyData.mape}%</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Forecasts Table */}
      {forecastsData?.forecasts && forecastsData.forecasts.length > 0 ? (
        <div className="bg-paper rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-wash">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">SKU</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Month</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Forecasted</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Actual</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Variance</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Accuracy</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {forecastsWithAccuracy.map((forecast: any) => (
                  <tr key={forecast.id} className="hover:bg-wash">
                    <td className="px-4 py-2">
                      <div>
                        <div className="font-medium">{forecast.sku.name}</div>
                        <div className="text-xs text-ink-60">{forecast.sku.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2">{formatDate(forecast.forecastMonth)}</td>
                    <td className="px-4 py-2">{forecast.forecastedQuantity.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      {forecast.actualQuantity ? forecast.actualQuantity.toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {forecast.variance !== null ? (
                        <span className={forecast.variance > 0 ? 'text-warn-ink' : 'text-ok-ink'}>
                          {forecast.variance > 0 ? '+' : ''}{forecast.variance.toLocaleString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {forecast.accuracy !== null ? (
                        <span
                          className={
                            forecast.accuracy >= 90
                              ? 'text-ok-ink font-medium'
                              : forecast.accuracy >= 80
                              ? 'text-warn-ink font-medium'
                              : 'text-warn-ink font-medium'
                          }
                        >
                          {forecast.accuracy.toFixed(2)}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(forecast)}
                          className="text-ink-60 hover:text-ink"
                          title="View Details"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(forecast)}
                          className="text-ink-60 hover:text-ink"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleUpdateActual(forecast)}
                          className="text-ok-ink hover:opacity-70"
                          title="Update Actual"
                        >
                          Actual
                        </button>
                        <button
                          onClick={() => {
                            setForecastToDelete(forecast.id)
                            setShowDeleteConfirm(true)
                          }}
                          className="text-warn-ink hover:opacity-70"
                          title="Delete"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-paper rounded-2xl shadow p-8 text-center">
          <p className="text-ink-60">No forecasts found. Select a SKU and click Generate Forecasts to create forecasts.</p>
        </div>
      )}

      {/* Forecast Details Modal */}
      <Modal
        isOpen={selectedForecast !== null && !showEditModal && !showUpdateActualModal}
        onClose={() => {
          setSelectedForecast(null)
        }}
        title={selectedForecastData?.forecast ? `Forecast Details for ${selectedForecastData.forecast.sku.name}` : 'Forecast Details'}
      >
        {selectedForecastData?.forecast && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-ink-60">Forecast Month</div>
                <div className="font-medium">{formatDate(selectedForecastData.forecast.forecastMonth)}</div>
              </div>
              <div>
                <div className="text-sm text-ink-60">Forecasted Quantity</div>
                <div className="font-medium">{selectedForecastData.forecast.forecastedQuantity.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-ink-60">Actual Quantity</div>
                <div className="font-medium">
                  {selectedForecastData.forecast.actualQuantity
                    ? selectedForecastData.forecast.actualQuantity.toLocaleString()
                    : '-'}
                </div>
              </div>
              {selectedForecastData.forecast.actualQuantity && (
                <div>
                  <div className="text-sm text-ink-60">Accuracy</div>
                  <div className="font-medium">
                    {(
                      100 -
                      (Math.abs(
                        selectedForecastData.forecast.forecastedQuantity -
                          selectedForecastData.forecast.actualQuantity
                      ) /
                        selectedForecastData.forecast.actualQuantity) *
                        100
                    ).toFixed(2)}%
                  </div>
                </div>
              )}
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-4">Historical Sales and Forecast</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="historical" stroke="#8884d8" name="Historical Sales" />
                    <Line type="monotone" dataKey="forecast" stroke="#82ca9d" name="Forecast" />
                    <Line type="monotone" dataKey="actual" stroke="#ffc658" name="Actual" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Forecast Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedForecast(null)
          setEditFormData({ forecastedQuantity: '' })
        }}
        title="Edit Forecast"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSaveEdit()
          }}
          className="space-y-4"
        >
          <FormInput
            label="Forecasted Quantity"
            name="forecastedQuantity"
            type="number"
            step="0.01"
            min="0"
            value={editFormData.forecastedQuantity}
            onChange={(e) => setEditFormData((prev) => ({ ...prev, forecastedQuantity: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowEditModal(false)
                setSelectedForecast(null)
                setEditFormData({ forecastedQuantity: '' })
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={updateForecast.isPending}
            >
              {updateForecast.isPending && <LoadingSpinner text="" />}
              {updateForecast.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Actual Modal */}
      <Modal
        isOpen={showUpdateActualModal}
        onClose={() => {
          setShowUpdateActualModal(false)
          setSelectedForecast(null)
          setActualFormData({ actualQuantity: '' })
        }}
        title="Update Actual Quantity"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSaveActual()
          }}
          className="space-y-4"
        >
          <FormInput
            label="Actual Quantity"
            name="actualQuantity"
            type="number"
            step="0.01"
            min="0"
            value={actualFormData.actualQuantity}
            onChange={(e) => setActualFormData((prev) => ({ ...prev, actualQuantity: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowUpdateActualModal(false)
                setSelectedForecast(null)
                setActualFormData({ actualQuantity: '' })
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={updateForecast.isPending}
            >
              {updateForecast.isPending && <LoadingSpinner text="" />}
              {updateForecast.isPending ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setForecastToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Forecast"
        message="Are you sure you want to delete this forecast? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
      />
    </div>
  )
}
