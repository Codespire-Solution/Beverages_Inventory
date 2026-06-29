export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export function handleApiError(error: any): string {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error.response?.data?.error) {
    return error.response.data.error
  }
  
  if (error.message) {
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}

export function formatValidationError(errors: any[]): string {
  if (!errors || errors.length === 0) {
    return 'Validation failed'
  }
  
  return errors.map((err) => {
    if (typeof err === 'string') return err
    if (err.message) return err.message
    if (err.path) return `${err.path}: ${err.message || 'Invalid value'}`
    return 'Invalid value'
  }).join(', ')
}

export function logError(error: Error, context?: any) {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  })
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // Example: Send to error tracking service
    // errorTrackingService.captureException(error, { extra: context })
  }
}

