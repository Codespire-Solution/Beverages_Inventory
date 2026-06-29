'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { ToastContainer } from '@/components/common/Toast'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider
      value={{
        showToast,
        success: (message: string) => showToast(message, 'success'),
        error: (message: string) => showToast(message, 'error'),
        warning: (message: string) => showToast(message, 'warning'),
        info: (message: string) => showToast(message, 'info'),
      }}
    >
      {children}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

