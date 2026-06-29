'use client'

import { useEffect } from 'react'
import { X } from '@phosphor-icons/react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-ink/40"
          onClick={onClose}
        ></div>

        <div
          className={`inline-block align-bottom bg-paper rounded-2xl border border-line text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} w-full`}
        >
          <div className="bg-paper px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg text-ink">{title}</h3>
              <button
                onClick={onClose}
                className="text-ink-60 hover:text-ink focus:outline-none transition-colors"
                aria-label="Close"
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
