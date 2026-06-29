'use client'

import { usePurchaseForecasts } from '@/hooks/useForecasts'
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders'
import { useSuppliers } from '@/hooks/useMasterData'
import { useRouter } from 'next/navigation'
import DataTable from '@/components/common/DataTable'
import { formatCurrency } from '@/lib/utils'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function PurchaseForecastPage() {
  const router = useRouter()
  const { data, isLoading } = usePurchaseForecasts()
  const { data: suppliersData } = useSuppliers()
  const createPO = useCreatePurchaseOrder()

  const handleCreatePO = async (suggestion: any, supplierId: number) => {
    try {
      await createPO.mutateAsync({
        supplierId,
        orderDate: new Date().toISOString().split('T')[0],
        items: [
          {
            itemId: suggestion.itemId,
            quantity: suggestion.suggestedQuantity,
            unitId: suggestion.unit.id,
            unitPrice: suggestion.item.standardCost || 0,
            taxRate: suggestion.item.taxRate || 0,
          },
        ],
        status: 'draft',
      })
      router.push('/purchase-orders')
    } catch (error) {
      console.error('Error creating PO:', error)
    }
  }

  const columns = [
    {
      key: 'item',
      header: 'Item',
      render: (suggestion: any) => (
        <div>
          <div className="font-medium">{suggestion.item.name}</div>
          <div className="text-xs text-ink-60">{suggestion.item.code}</div>
        </div>
      ),
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      render: (suggestion: any) => suggestion.currentStock.toLocaleString(),
    },
    {
      key: 'requiredQuantity',
      header: 'Required',
      render: (suggestion: any) => suggestion.requiredQuantity.toLocaleString(),
    },
    {
      key: 'moq',
      header: 'MOQ',
      render: (suggestion: any) => suggestion.moq ? suggestion.moq.toLocaleString() : '-',
    },
    {
      key: 'suggestedQuantity',
      header: 'Suggested',
      render: (suggestion: any) => (
        <span className="font-semibold text-accent-ink">
          {suggestion.suggestedQuantity.toLocaleString()} {suggestion.unit.code}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (suggestion: any) => (
        <select
          onChange={(e) => {
            if (e.target.value) {
              handleCreatePO(suggestion, parseInt(e.target.value))
            }
          }}
          className="px-3 py-1 border border-line rounded-xl text-sm"
          defaultValue=""
        >
          <option value="">Select Supplier</option>
          {suppliersData?.suppliers.map((supplier: any) => (
            <option key={supplier.id} value={supplier.id}>
              Create PO for {supplier.name}
            </option>
          ))}
        </select>
      ),
    },
  ]

  if (isLoading) {
    return <LoadingSpinner text="Loading purchase forecasts..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-medium text-4xl">Purchase Forecasts</h1>
        <div className="h-[3px] w-16 bg-accent mt-3" />
        <p className="text-ink-60 mt-2">
          Raw material purchase suggestions based on sales forecasts
        </p>
      </div>

      <div className="bg-wash border border-line rounded-2xl p-4 mb-6">
        <p className="text-sm text-ink">
          <strong>How it works:</strong> The system analyzes sales forecasts for the next 3 months,
          calculates raw material requirements based on recipes, considers current stock levels,
          and suggests purchase quantities. MOQ (Minimum Order Quantity) is automatically applied.
        </p>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        {data?.purchaseSuggestions && data.purchaseSuggestions.length > 0 ? (
          <DataTable
            data={data.purchaseSuggestions}
            columns={columns}
            emptyMessage="No purchase suggestions found"
          />
        ) : (
          <div className="text-center py-8 text-ink-60">
            No purchase suggestions available. Generate sales forecasts first to see purchase recommendations.
          </div>
        )}
      </div>
    </div>
  )
}
