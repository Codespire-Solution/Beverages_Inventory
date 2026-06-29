/**
 * Validation utilities for the application
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate quantity (must be positive)
 * @param quantity - Quantity to validate
 * @param allowZero - Whether to allow zero
 * @returns Validation result
 */
export function validateQuantity(quantity: number, allowZero: boolean = false): ValidationResult {
  if (isNaN(quantity)) {
    return { isValid: false, error: 'Quantity must be a number' }
  }

  if (quantity < 0) {
    return { isValid: false, error: 'Quantity cannot be negative' }
  }

  if (!allowZero && quantity === 0) {
    return { isValid: false, error: 'Quantity must be greater than zero' }
  }

  return { isValid: true }
}

/**
 * Validate quantity with negative warning (allows negative but warns)
 * @param quantity - Quantity to validate
 * @param currentStock - Current stock level
 * @returns Validation result with warning if negative
 */
export function validateQuantityWithWarning(
  quantity: number,
  currentStock: number
): ValidationResult & { warning?: string } {
  const result = validateQuantity(quantity, true)

  if (result.isValid && quantity < 0 && Math.abs(quantity) > currentStock) {
    return {
      ...result,
      warning: `This will result in negative inventory. Current stock: ${currentStock}`,
    }
  }

  return result
}

/**
 * Validate MOQ (Minimum Order Quantity)
 * @param quantity - Order quantity
 * @param moq - Minimum order quantity
 * @returns Validation result
 */
export function validateMOQ(quantity: number, moq: number | null | undefined): ValidationResult {
  if (!moq) return { isValid: true }

  if (quantity < moq) {
    return {
      isValid: false,
      error: `Quantity must be at least ${moq} (MOQ)`,
    }
  }

  return { isValid: true }
}

/**
 * Validate expiry date
 * @param expiryDate - Expiry date to validate
 * @param receivedDate - Received date (expiry must be after received)
 * @returns Validation result
 */
export function validateExpiryDate(
  expiryDate: Date | null | undefined,
  receivedDate: Date
): ValidationResult {
  if (!expiryDate) return { isValid: true }

  if (expiryDate <= receivedDate) {
    return {
      isValid: false,
      error: 'Expiry date must be after received date',
    }
  }

  return { isValid: true }
}

/**
 * Validate required field
 * @param value - Value to validate
 * @param fieldName - Name of the field (for error message)
 * @returns Validation result
 */
export function validateRequired(value: any, fieldName: string): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    }
  }

  return { isValid: true }
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns Validation result
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Invalid email format',
    }
  }

  return { isValid: true }
}

/**
 * Validate password (must be a non-empty string of at least 6 characters)
 * @param password - Password to validate
 * @returns Validation result
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' }
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: 'Password must be at least 6 characters',
    }
  }

  return { isValid: true }
}

/**
 * Validate date range
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Validation result
 */
export function validateDateRange(startDate: Date, endDate: Date): ValidationResult {
  if (endDate < startDate) {
    return {
      isValid: false,
      error: 'End date must be after start date',
    }
  }

  return { isValid: true }
}

/**
 * Validate percentage (0-100)
 * @param percentage - Percentage to validate
 * @returns Validation result
 */
export function validatePercentage(percentage: number): ValidationResult {
  if (isNaN(percentage)) {
    return { isValid: false, error: 'Percentage must be a number' }
  }

  if (percentage < 0 || percentage > 100) {
    return {
      isValid: false,
      error: 'Percentage must be between 0 and 100',
    }
  }

  return { isValid: true }
}

