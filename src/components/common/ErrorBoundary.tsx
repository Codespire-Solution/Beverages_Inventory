'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ errorInfo })
    
    // Log to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { contexts: { react: errorInfo } })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-bg">
          <div className="max-w-md w-full bg-paper border border-line rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-warn-bg rounded-full mb-4">
              <svg
                className="w-6 h-6 text-warn-ink"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-serif font-medium text-ink text-center mb-2">
              Something went wrong
            </h2>
            <p className="text-ink-60 text-center mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-4 p-3 bg-wash rounded-xl text-xs overflow-auto max-h-40">
                <summary className="cursor-pointer font-semibold mb-2">Error Details</summary>
                <pre className="whitespace-pre-wrap">
                  {this.state.error?.stack}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-ink text-white rounded-full hover:bg-black transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 px-4 py-2 bg-transparent text-ink border border-ink rounded-full hover:bg-wash transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

