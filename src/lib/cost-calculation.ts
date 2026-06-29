import { prisma } from './prisma'

/**
 * Calculate recipe cost
 * @param recipeVersionId - Recipe version ID
 * @returns Total cost of recipe
 */
export async function calculateRecipeCost(recipeVersionId: number): Promise<number> {
  const recipe = await prisma.recipeVersion.findUnique({
    where: { id: recipeVersionId },
    include: {
      ingredients: {
        include: {
          item: true,
          unit: true,
        },
      },
    },
  })

  if (!recipe) return 0

  let totalCost = 0

  for (const ingredient of recipe.ingredients) {
    const itemCost = ingredient.item.standardCost
    // Assume ingredient quantity is in base unit, cost is per base unit
    totalCost += ingredient.quantity * itemCost
  }

  return totalCost
}

/**
 * Calculate inventory valuation using standard cost method
 * @param warehouseId - Optional warehouse ID to filter
 * @returns Total inventory value
 */
export async function calculateInventoryValuation(warehouseId?: number): Promise<number> {
  const where: any = {}
  if (warehouseId) where.warehouseId = warehouseId

  const batches = await prisma.inventoryBatch.findMany({
    where,
    include: {
      item: true,
    },
  })

  return batches.reduce((sum, batch) => {
    const cost = batch.unitCost || batch.item.standardCost
    return sum + batch.quantity * cost
  }, 0)
}

/**
 * Calculate profit margin
 * @param sellingPrice - Selling price
 * @param costPrice - Cost price
 * @returns Profit margin percentage
 */
export function calculateProfitMargin(sellingPrice: number, costPrice: number): number {
  if (sellingPrice === 0) return 0
  return ((sellingPrice - costPrice) / sellingPrice) * 100
}

/**
 * Calculate cost per unit for a SKU based on recipe
 * @param skuId - SKU ID
 * @param quantity - Quantity to produce
 * @returns Cost per unit
 */
export async function calculateSKUCostPerUnit(skuId: number, quantity: number = 1): Promise<number> {
  const sku = await prisma.sku.findUnique({
    where: { id: skuId },
    include: {
      recipeVersions: {
        where: {
          isActive: true,
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
          effectiveFrom: { lte: new Date() },
        },
        include: {
          ingredients: {
            include: {
              item: true,
            },
          },
        },
        take: 1,
      },
    },
  })

  if (!sku || !sku.recipeVersions[0]) return sku?.standardCost || 0

  const recipe = sku.recipeVersions[0]
  const recipeCost = await calculateRecipeCost(recipe.id)

  // Calculate cost per unit (assuming recipe is for 1000 units or similar base)
  // This is a simplified calculation - adjust based on your recipe structure
  return recipeCost / quantity
}

