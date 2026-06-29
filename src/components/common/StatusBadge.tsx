'use client'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
}

const statusColors: { [key: string]: string } = {
  draft: 'bg-line text-ink-60',
  pending: 'bg-litchi text-warn-ink',
  confirmed: 'bg-litchi text-warn-ink',
  partially_received: 'bg-litchi text-warn-ink',
  in_progress: 'bg-litchi text-warn-ink',
  fully_received: 'bg-ok-bg text-ok-ink',
  completed: 'bg-ok-bg text-ok-ink',
  delivered: 'bg-ok-bg text-ok-ink',
  cancelled: 'bg-warn-bg text-warn-ink',
  active: 'bg-ok-bg text-ok-ink',
  inactive: 'bg-line text-ink-60',
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colorClass = statusColors[status.toLowerCase()] ?? 'bg-line text-ink-60'

  return (
    <span
      className={`inline-flex items-center font-mono text-[10px] uppercase tracking-[0.05em] px-2.5 py-1 rounded-full ${colorClass}`}
    >
      {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  )
}
