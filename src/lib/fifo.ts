import { prisma } from './prisma'

interface BatchSelection {
  batchId: number
  batchNumber: string
  availableQuantity: number
  expiryDate: Date | null
  receivedDate: Date
}

/**
 * Get batches using FIFO (First In First Out) logic
 * Considers received date and expiry date (oldest first)
 * @param itemId - Item ID
 * @param warehouseId - Warehouse ID
 * @param requiredQuantity - Required quantity
 * @returns Array of batches with quantities to use
 */
export async function getFIFOBatches(
  itemId: number,
  warehouseId: number,
  requiredQuantity: number
): Promise<Array<{ batchId: number; batchNumber: string; quantity: number; expiryDate: Date | null }>> {
  // Get all batches for this item and warehouse, ordered by:
  // 1. Expiry date (ascending - expiring soon first)
  // 2. Received date (ascending - oldest first)
  const batches = await prisma.inventoryBatch.findMany({
    where: {
      itemId,
      warehouseId,
      quantity: {
        gt: 0, // Only batches with available stock
      },
    },
    orderBy: [
      {
        expiryDate: {
          sort: 'asc',
          nulls: 'last', // Items without expiry go last
        },
      },
      {
        receivedDate: 'asc',
      },
    ],
  })

  const selected: Array<{ batchId: number; batchNumber: string; quantity: number; expiryDate: Date | null }> = []
  let remaining = requiredQuantity

  for (const batch of batches) {
    if (remaining <= 0) break

    const quantityToUse = Math.min(batch.quantity, remaining)
    selected.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      quantity: quantityToUse,
      expiryDate: batch.expiryDate,
    })
    remaining -= quantityToUse
  }

  if (remaining > 0) {
    throw new Error(`Insufficient stock. Available: ${requiredQuantity - remaining}, Required: ${requiredQuantity}`)
  }

  return selected
}

/**
 * Get available quantity for an item in a warehouse
 * @param itemId - Item ID
 * @param warehouseId - Warehouse ID
 * @returns Total available quantity
 */
export async function getAvailableQuantity(itemId: number, warehouseId: number): Promise<number> {
  const result = await prisma.inventoryBatch.aggregate({
    where: {
      itemId,
      warehouseId,
    },
    _sum: {
      quantity: true,
    },
  })

  return result._sum.quantity || 0
}

/**
 * Get batches for an item in a warehouse (for display/selection)
 * @param itemId - Item ID
 * @param warehouseId - Warehouse ID
 * @returns Array of batches with details
 */
export async function getBatchesForItem(
  itemId: number,
  warehouseId: number
): Promise<BatchSelection[]> {
  const batches = await prisma.inventoryBatch.findMany({
    where: {
      itemId,
      warehouseId,
      quantity: {
        gt: 0,
      },
    },
    orderBy: [
      {
        expiryDate: {
          sort: 'asc',
          nulls: 'last',
        },
      },
      {
        receivedDate: 'asc',
      },
    ],
  })

  return batches.map((batch) => ({
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    availableQuantity: batch.quantity,
    expiryDate: batch.expiryDate,
    receivedDate: batch.receivedDate,
  }))
}

