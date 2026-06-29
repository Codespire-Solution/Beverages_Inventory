'use client'

import { useRouter, useParams } from 'next/navigation'
import { useRecipe } from '@/hooks/useRecipes'
import { formatDate } from '@/lib/utils'
import StatusBadge from '@/components/common/StatusBadge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { Button } from '@/components/common/Button'
import { Pencil, ArrowLeft } from '@phosphor-icons/react'

export default function RecipeDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = parseInt(params.id as string)

  const { data, isLoading } = useRecipe(id)

  if (isLoading) {
    return <LoadingSpinner text="Loading recipe..." />
  }

  if (!data?.recipe) {
    return <div>Recipe not found</div>
  }

  const recipe = data.recipe
  const sku = recipe.sku
  const ingredients = recipe.ingredients || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">
            {sku ? sku.name : 'Recipe'}
          </h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Version {recipe.versionNumber}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => router.push('/recipes')}
          >
            <Pencil size={14} /> Edit
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/recipes')}
          >
            <ArrowLeft size={14} /> Back to List
          </Button>
        </div>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">SKU</h3>
            <p className="text-lg font-medium">{sku ? sku.name : '-'}</p>
            {sku?.code && <p className="text-sm text-ink-60">Code: {sku.code}</p>}
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Version Number</h3>
            <p>{recipe.versionNumber}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Effective From</h3>
            <p>{recipe.effectiveFrom ? formatDate(recipe.effectiveFrom) : '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Effective To</h3>
            <p>{recipe.effectiveTo ? formatDate(recipe.effectiveTo) : '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-60 mb-2">Status</h3>
            <StatusBadge status={recipe.isActive ? 'active' : 'inactive'} />
          </div>
        </div>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
        {ingredients.length === 0 ? (
          <div className="text-center py-8 text-ink-60">No ingredients defined for this recipe.</div>
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
                {ingredients.map((ingredient: any) => (
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
