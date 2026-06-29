'use client'

import { Tray } from '@phosphor-icons/react'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Tray size={48} weight="thin" className="mx-auto text-ink-60 mb-3" />
      <h3 className="font-serif text-xl text-ink mt-2">{title}</h3>
      {description && <p className="label mt-2 text-ink-60">{description}</p>}
      {action && (
        <div className="mt-6">
          <Button variant="primary" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
