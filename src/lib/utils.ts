import { format as formatWithPattern } from 'date-fns'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string, dateFormat?: string): string {
  if (dateFormat) {
    return formatWithPattern(new Date(date), dateFormat)
  }
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function generateNumber(prefix: string, id: number): string {
  return `${prefix}-${String(id).padStart(4, '0')}`
}

/**
 * Generate Purchase Order number (PO-0001)
 */
export function generatePONumber(id: number): string {
  return generateNumber('PO', id)
}

/**
 * Generate Customer Order number (ORD-0001)
 */
export function generateOrderNumber(id: number): string {
  return generateNumber('ORD', id)
}

/**
 * Generate Batch number (BATCH-0001)
 */
export function generateBatchNumber(id: number): string {
  return generateNumber('BATCH', id)
}

/**
 * Generate Production Batch number (PB-0001)
 */
export function generateProductionBatchNumber(id: number): string {
  return generateNumber('PB', id)
}

/**
 * Generate Goods Receipt number (GR-0001)
 */
export function generateReceiptNumber(id: number): string {
  return generateNumber('GR', id)
}

/**
 * Generate Material Issue number (MI-0001)
 */
export function generateIssueNumber(id: number): string {
  return generateNumber('MI', id)
}

/**
 * Generate Finished Goods Receipt number (FGR-0001)
 */
export function generateFGReceiptNumber(id: number): string {
  return generateNumber('FGR', id)
}

/**
 * Generate Sales Delivery number (DEL-0001)
 */
export function generateDeliveryNumber(id: number): string {
  return generateNumber('DEL', id)
}

/**
 * Generate Stock Adjustment number (ADJ-0001)
 */
export function generateAdjustmentNumber(id: number): string {
  return generateNumber('ADJ', id)
}

/**
 * Generate Stock Transfer number (TRF-0001)
 */
export function generateTransferNumber(id: number): string {
  return generateNumber('TRF', id)
}

/**
 * Generate Item code (ITM-0001)
 */
export function generateItemCode(id: number): string {
  return generateNumber('ITM', id)
}

