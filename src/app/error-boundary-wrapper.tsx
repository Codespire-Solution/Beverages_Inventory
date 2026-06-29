'use client'

import { ErrorBoundary } from '@/components/common/ErrorBoundary'

export default function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}

