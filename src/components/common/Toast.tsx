'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle, Warning, Info, X } from '@phosphor-icons/react'
import { ToastType } from '@/contexts/ToastContext'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle size={16} weight="fill" className="shrink-0" />,
    error: <XCircle size={16} weight="fill" className="shrink-0" />,
    warning: <Warning size={16} weight="fill" className="shrink-0" />,
    info: <Info size={16} weight="fill" className="shrink-0" />,
  }

  return (
    <div
      className="bg-ink text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-md animate-slide-in"
      role="alert"
      aria-live="polite"
    >
      {icons[type]}
      <p className="flex-1 text-sm font-medium font-sans">{message}</p>
      <button
        onClick={onClose}
        className="text-white opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close notification"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: ToastType }>
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  )
}
