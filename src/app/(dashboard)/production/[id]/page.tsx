'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useProductionBatch, useCompleteProductionBatch, useCancelProductionBatch } from '@/hooks/useProduction'
import { useToast } from '@/contexts/ToastContext'
import { formatDate, formatCurrency } from '@/lib/utils'
import StatusBadge from '@/components/common/StatusBadge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import Modal from '@/components/common/Modal'
import FormInput from '@/components/common/FormInput'
import { Button } from '@/components/common/Button'
import { Flask, Package, Check, ArrowLeft } from '@phosphor-icons/react'

export default function ProductionBatchDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = parseInt(params.id as string)

  const { data, isLoading } = useProductionBatch(id)
  const completeBatch = useCompleteProductionBatch()
  const cancelBatch = useCancelProductionBatch()

  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'issues' | 'finished'>('overview')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [completeFormData, setCompleteFormData] = useState({
    actualQuantity: '',
    wasteQuantity: '0',
  })

  if (isLoading) {
    return <LoadingSpinner text="Loading production batch..." />
  }

  if (!data?.batch) {
    return <div>Production batch not found</div>
  }

  const batch = data.batch
  const skuUnit = batch.sku.unit

  // Calculate yield and waste percentages
  const yieldPercentage = batch.actualQuantity && batch.targetQuantity > 0
    ? ((batch.actualQuantity / batch.targetQuantity) * 100).toFixed(2)
    : null
  const wastePercentage = batch.wasteQuantity && batch.targetQuantity > 0
    ? ((batch.wasteQuantity / batch.targetQuantity) * 100).toFixed(2)
    : null

  // Calculate material cost from material issues
  const materialCost = batch.materialIssues?.reduce((total: number, issue: any) => {
    return total + (issue.items?.reduce((issueTotal: number, item: any) => {
      // Use batch unit cost if available, otherwise use item standard cost
      const unitCost = item.batch?.unitCost || item.item?.standardCost || 0
      return issueTotal + (item.quantity * unitCost)
    }, 0) || 0)
  }, 0) || 0

  const canCancel = batch.status === 'in_progress'
  const canComplete = batch.status === 'in_progress' && batch.materialIssues && batch.materialIssues.length > 0
  const canIssueMaterials = batch.status === 'in_progress'
  const canReceiveFinished = batch.status === 'in_progress' && batch.materialIssues && batch.materialIssues.length > 0

  const handleComplete = async () => {
    if (!completeFormData.actualQuantity) {
      toast.error('Please enter actual quantity')
      return
    }

    try {
      await completeBatch.mutateAsync({
        id: batch.id,
        data: {
          actualQuantity: parseFloat(completeFormData.actualQuantity),
          wasteQuantity: parseFloat(completeFormData.wasteQuantity || '0'),
        },
      })
      toast.success('Production batch completed successfully!')
      setShowCompleteForm(false)
      setCompleteFormData({ actualQuantity: '', wasteQuantity: '0' })
    } catch (error: any) {
      console.error('Error completing batch:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error completing production batch'
      toast.error(errorMessage)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelBatch.mutateAsync(id)
      toast.success('Production batch cancelled successfully!')
      setShowCancelConfirm(false)
    } catch (error: any) {
      console.error('Error cancelling batch:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error cancelling production batch'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Production Batch: {batch.batchNumber}</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
        </div>
        <div className="flex gap-3 flex-wrap">
          {canIssueMaterials && (
            <Button
              variant="primary"
              onClick={() => router.push(`/production/${id}/issue-materials`)}
            >
              <Flask weight="bold" size={14} />
              Issue Materials
            </Button>
          )}
          {canReceiveFinished && (
            <Button
              variant="primary"
              onClick={() => router.push(`/production/${id}/receive-finished`)}
            >
              <Package weight="bold" size={14} />
              Receive Finished Goods
            </Button>
          )}
          {canComplete && (
            <Button
              variant="primary"
              onClick={() => setShowCompleteForm(true)}
            >
              <Check weight="bold" size={14} />
              Complete Batch
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              onClick={() => setShowCancelConfirm(true)}
              disabled={cancelBatch.isPending}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => router.push('/production')}
          >
            <ArrowLeft weight="bold" size={14} />
            Back to List
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-line">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-ink-60 hover:text-ink hover:border-line'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'materials'
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-ink-60 hover:text-ink hover:border-line'
            }`}
          >
            Materials
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'issues'
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-ink-60 hover:text-ink hover:border-line'
            }`}
          >
            Material Issues ({batch.materialIssues?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('finished')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'finished'
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-ink-60 hover:text-ink hover:border-line'
            }`}
          >
            Finished Goods ({batch.finishedGoods?.length || 0})
          </button>
        </nav>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">SKU</h3>
                <div className="space-y-1">
                  <p className="text-lg font-medium">{batch.sku.name}</p>
                  <p className="text-sm text-ink-60">Code: {batch.sku.code}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Status</h3>
                <StatusBadge status={batch.status} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Target Quantity</h3>
                <p className="text-lg">
                  {batch.targetQuantity.toLocaleString()} {skuUnit?.code || ''}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Actual Quantity</h3>
                <p className="text-lg">
                  {batch.actualQuantity ? `${batch.actualQuantity.toLocaleString()} ${skuUnit?.code || ''}` : '-'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Production Date</h3>
                <p>{formatDate(batch.productionDate)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-ink-60 mb-2">Warehouse</h3>
                <p>{batch.warehouse.name}</p>
              </div>
              {batch.creator && (
                <div>
                  <h3 className="text-sm font-medium text-ink-60 mb-2">Created By</h3>
                  <p>{batch.creator.fullName || batch.creator.email}</p>
                </div>
              )}
              {batch.notes && (
                <div>
                  <h3 className="text-sm font-medium text-ink-60 mb-2">Notes</h3>
                  <p className="text-sm">{batch.notes}</p>
                </div>
              )}
            </div>

            {/* Yield and Waste Display */}
            {(yieldPercentage || wastePercentage) && (
              <div className="border-t border-line pt-6">
                <h3 className="text-lg font-semibold mb-4">Production Metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  {yieldPercentage && (
                    <div className={`p-4 rounded-2xl ${
                      parseFloat(yieldPercentage) >= 95 ? 'bg-ok-bg border border-ok-bg' :
                      parseFloat(yieldPercentage) >= 90 ? 'bg-warn-bg border border-line' :
                      'bg-warn-bg border border-warn-bg'
                    }`}>
                      <div className="text-sm text-ink-60 mb-1">Yield</div>
                      <div className={`text-3xl font-bold ${
                        parseFloat(yieldPercentage) >= 95 ? 'text-ok-ink' :
                        parseFloat(yieldPercentage) >= 90 ? 'text-warn-ink' :
                        'text-warn-ink'
                      }`}>
                        {yieldPercentage}%
                      </div>
                      <div className="text-xs text-ink-60 mt-1">
                        {batch.actualQuantity?.toLocaleString()} / {batch.targetQuantity.toLocaleString()} {skuUnit?.code || ''}
                      </div>
                    </div>
                  )}
                  {wastePercentage && (
                    <div className={`p-4 rounded-2xl ${
                      parseFloat(wastePercentage) <= 5 ? 'bg-ok-bg border border-ok-bg' :
                      parseFloat(wastePercentage) <= 10 ? 'bg-warn-bg border border-line' :
                      'bg-warn-bg border border-warn-bg'
                    }`}>
                      <div className="text-sm text-ink-60 mb-1">Waste</div>
                      <div className={`text-3xl font-bold ${
                        parseFloat(wastePercentage) <= 5 ? 'text-ok-ink' :
                        parseFloat(wastePercentage) <= 10 ? 'text-warn-ink' :
                        'text-warn-ink'
                      }`}>
                        {wastePercentage}%
                      </div>
                      <div className="text-xs text-ink-60 mt-1">
                        {batch.wasteQuantity?.toLocaleString()} {skuUnit?.code || ''}
                      </div>
                    </div>
                  )}
                  {materialCost > 0 && (
                    <div className="p-4 rounded-2xl bg-wash border border-line">
                      <div className="text-sm text-ink-60 mb-1">Material Cost</div>
                      <div className="text-3xl font-bold text-accent-ink">
                        {formatCurrency(materialCost)}
                      </div>
                      <div className="text-xs text-ink-60 mt-1">
                        Total cost of materials used
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recipe Ingredients */}
            {batch.recipeVersion && (
              <div className="border-t border-line pt-6">
                <h3 className="text-lg font-semibold mb-4">Recipe Ingredients</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-wash">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Quantity per 1000</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Required for Batch</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {batch.recipeVersion.ingredients.map((ingredient: any) => {
                        const requiredQty = ingredient.quantity * batch.targetQuantity
                        return (
                          <tr key={ingredient.id}>
                            <td className="px-4 py-2">
                              <div>
                                <div className="font-medium">{ingredient.item.name}</div>
                                <div className="text-xs text-ink-60">{ingredient.item.code}</div>
                              </div>
                            </td>
                            <td className="px-4 py-2">{ingredient.quantity.toLocaleString()}</td>
                            <td className="px-4 py-2 font-medium">
                              {requiredQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2">{ingredient.unit.code}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Material Cost Summary</h3>
            {materialCost > 0 ? (
              <div className="bg-wash border border-line rounded-2xl p-6">
                <div className="text-3xl font-bold text-accent-ink mb-2">
                  {formatCurrency(materialCost)}
                </div>
                <p className="text-sm text-ink-60">Total material cost for this production batch</p>
              </div>
            ) : (
              <div className="text-center py-8 text-ink-60">
                No materials issued yet. Material cost will be calculated after materials are issued.
              </div>
            )}
          </div>
        )}

        {/* Material Issues Tab */}
        {activeTab === 'issues' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Material Issues</h3>
            {!batch.materialIssues || batch.materialIssues.length === 0 ? (
              <div className="text-center py-8 text-ink-60">
                No material issues yet. Click "Issue Materials" to issue materials for this batch.
              </div>
            ) : (
              <div className="space-y-4">
                {batch.materialIssues.map((issue: any) => (
                  <div key={issue.id} className="border border-line rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-medium text-lg">{issue.issueNumber}</p>
                        <p className="text-sm text-ink-60">{formatDate(issue.issueDate)}</p>
                        <p className="text-sm text-ink-60">Warehouse: {issue.warehouse.name}</p>
                      </div>
                      {issue.notes && (
                        <p className="text-sm text-ink-60">{issue.notes}</p>
                      )}
                    </div>
                    {issue.items && issue.items.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Items Issued:</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-wash">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Item</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Batch</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Unit Cost</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Total Cost</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {issue.items.map((item: any) => {
                                const unitCost = item.batch?.unitCost || item.item?.standardCost || 0
                                const totalCost = item.quantity * unitCost
                                return (
                                  <tr key={item.id}>
                                    <td className="px-3 py-2">
                                      <div>
                                        <div className="font-medium">{item.item.name}</div>
                                        <div className="text-xs text-ink-60">{item.item.code}</div>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">{item.batch.batchNumber}</td>
                                    <td className="px-3 py-2">
                                      {item.quantity.toLocaleString()} {item.unit.code}
                                    </td>
                                    <td className="px-3 py-2">{formatCurrency(unitCost)}</td>
                                    <td className="px-3 py-2 font-medium">{formatCurrency(totalCost)}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Finished Goods Tab */}
        {activeTab === 'finished' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Finished Goods Receipts</h3>
            {!batch.finishedGoods || batch.finishedGoods.length === 0 ? (
              <div className="text-center py-8 text-ink-60">
                No finished goods receipts yet. Click "Receive Finished Goods" to receive finished goods for this batch.
              </div>
            ) : (
              <div className="space-y-4">
                {batch.finishedGoods.map((receipt: any) => (
                  <div key={receipt.id} className="border border-line rounded-2xl p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-medium text-lg">{receipt.receiptNumber}</p>
                        <p className="text-sm text-ink-60">{formatDate(receipt.receiptDate)}</p>
                        <p className="text-sm text-ink-60">Warehouse: {receipt.warehouse.name}</p>
                      </div>
                      {receipt.notes && (
                        <p className="text-sm text-ink-60">{receipt.notes}</p>
                      )}
                    </div>
                    {receipt.items && receipt.items.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Items Received:</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-wash">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">SKU</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Batch Number</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Expiry Date</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-ink-60">Production Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {receipt.items.map((item: any) => (
                                <tr key={item.id}>
                                  <td className="px-3 py-2">
                                    <div>
                                      <div className="font-medium">{item.sku.name}</div>
                                      <div className="text-xs text-ink-60">{item.sku.code}</div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">{item.batchNumber}</td>
                                  <td className="px-3 py-2">
                                    {item.quantity.toLocaleString()} {item.unit.code}
                                  </td>
                                  <td className="px-3 py-2">
                                    {item.expiryDate ? formatDate(item.expiryDate) : '-'}
                                  </td>
                                  <td className="px-3 py-2">
                                    {item.productionDate ? formatDate(item.productionDate) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete Batch Form Modal */}
      <Modal
        isOpen={showCompleteForm}
        onClose={() => {
          setShowCompleteForm(false)
          setCompleteFormData({ actualQuantity: '', wasteQuantity: '0' })
        }}
        title="Complete Production Batch"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleComplete()
          }}
          className="space-y-4"
        >
          <FormInput
            label="Actual Quantity Produced"
            name="actualQuantity"
            type="number"
            step="0.01"
            min="0"
            value={completeFormData.actualQuantity}
            onChange={(e) => setCompleteFormData((prev) => ({ ...prev, actualQuantity: e.target.value }))}
            required
            helperText={skuUnit ? `Unit: ${skuUnit.code}` : undefined}
          />
          <FormInput
            label="Waste Quantity"
            name="wasteQuantity"
            type="number"
            step="0.01"
            min="0"
            value={completeFormData.wasteQuantity}
            onChange={(e) => setCompleteFormData((prev) => ({ ...prev, wasteQuantity: e.target.value }))}
            helperText={skuUnit ? `Unit: ${skuUnit.code}` : undefined}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCompleteForm(false)
                setCompleteFormData({ actualQuantity: '', wasteQuantity: '0' })
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={completeBatch.isPending}
            >
              {completeBatch.isPending && <LoadingSpinner text="" />}
              {completeBatch.isPending ? 'Completing...' : 'Complete Batch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel Production Batch"
        message={`Are you sure you want to cancel production batch ${batch.batchNumber}? This action cannot be undone.`}
        confirmText="Cancel Batch"
        cancelText="Keep Batch"
        isDestructive
      />
    </div>
  )
}
