// Use a relative base URL so API calls always hit the SAME origin the app is served
// from (any port — 3002 in dev, your real domain in production). An absolute URL here
// would send requests to the wrong server if the dev port differs (e.g. 3000 vs 3002).
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || ''

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private getHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = 'Unknown error'
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || `HTTP error! status: ${response.status}`
      } catch {
        errorMessage = `HTTP error! status: ${response.status}`
      }
      
      // Handle specific status codes
      if (response.status === 401) {
        // Unauthorized - clear token and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        throw new Error('Session expired. Please login again.')
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to perform this action.')
      }
      
      if (response.status === 404) {
        throw new Error('Resource not found.')
      }
      
      if (response.status >= 500) {
        // For 500 errors, show the actual error message if available
        // This helps with debugging during development
        throw new Error(errorMessage || 'Server error. Please try again later.')
      }
      
      throw new Error(errorMessage)
    }
    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })
    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
    return this.handleResponse<T>(response)
  }
}

export const apiClient = new ApiClient()

