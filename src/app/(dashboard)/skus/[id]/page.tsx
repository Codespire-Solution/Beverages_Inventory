'use client'

import { useRouter, useParams } from 'next/navigation'
import { useSKU } from '@/hooks/useMasterData'
import { formatCurrency } from '@/lib/utils'
import StatusBadge from '@/components/common/StatusBadge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { Button } from '@/components/common/Button'
import { Pencil, ArrowLeft } from '@phosphor-icons/react'

export default function SKUDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = parseInt(params.id as string)

  const { data, isLoading } = useSKU(id)

  if (isLoading) {
    return <LoadingSpinner text="Loading SKU..." />
  }

  if (!data?.sku) {
    return <div>SKU not found</div>
  }

  const sku = data.sku
  const recipeVersions = sku.recipeVersions || []
  const activeRecipe =
    recipeVersions.find((rv: any) => rv.isActive) || recipeVersions[0] || null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">{sku.name}</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Code: {sku.code}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => router.push('/skus')}
          >
            <Pencil size={14} /> Edit
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/skus')}
          >
            <ArrowLeft size={14} /> Back to List
          </Button>
        </div>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Code</h3>
            <p className="text-lg font-medium">{sku.code}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Name</h3>
            <p className="text-lg font-medium">{sku.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Description</h3>
            <p>{sku.description || '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Unit</h3>
            <p>{sku.unit ? `${sku.unit.code} - ${sku.unit.name}` : '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Standard Cost</h3>
            <p>{formatCurrency(sku.standardCost || 0)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Tax Rate</h3>
            <p>{sku.taxRate || 0}%</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Has Expiry</h3>
            <p>{sku.hasExpiry ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Status</h3>
            <StatusBadge status={sku.isActive ? 'active' : 'inactive'} />
          </div>
        </div>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          Active Recipe
          {activeRecipe ? ` (Version ${activeRecipe.versionNumber})` : ''}
        </h3>
        {!activeRecipe ? (
          <div className="text-center py-8 text-ink-60">No recipe defined for this SKU.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-wash">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Item</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Quantity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-ink-60">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(activeRecipe.ingredients || []).map((ingredient: any) => (
                  <tr key={ingredient.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium">{ingredient.item?.name || '-'}</div>
                      {ingredient.item?.code && (
                        <div className="text-xs text-ink-60">{ingredient.item.code}</div>
                      )}
                    </td>
                    <td className="px-4 py-2">{ingredient.quantity?.toLocaleString()}</td>
                    <td className="px-4 py-2">{ingredient.unit?.code || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
