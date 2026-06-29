'use client'

import { Button } from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isDestructive?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isDestructive = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const effectiveVariant = isDestructive ? 'danger' : variant

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-ink/40"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-paper rounded-2xl border border-line text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-paper px-4 pt-5 pb-4 sm:p-6">
            <h3 className="font-serif text-lg text-ink mb-2">{title}</h3>
            <p className="text-sm text-ink-60 font-sans mb-6">{message}</p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>
                {cancelText}
              </Button>
              {effectiveVariant === 'danger' || effectiveVariant === 'warning' ? (
                <Button
                  variant="primary"
                  className="bg-warn-bg text-warn-ink border border-warn-ink hover:brightness-95"
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                >
                  {confirmText}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                >
                  {confirmText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
