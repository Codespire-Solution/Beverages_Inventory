'use client'

import { useState } from 'react'
import { CaretUp, CaretDown } from '@phosphor-icons/react'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  loading?: boolean
  emptyMessage?: string
}

export default function DataTable<T extends { id: number }>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return

    if (sortColumn === column.key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column.key)
      setSortDirection('asc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0

    const aValue = a[sortColumn as keyof T]
    const bValue = b[sortColumn as keyof T]

    if (aValue === bValue) return 0

    const comparison = aValue < bValue ? -1 : 1
    return sortDirection === 'asc' ? comparison : -comparison
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="space-y-3 w-full">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-wash animate-pulse rounded-xl h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-8 text-ink-60 font-sans text-sm">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="bg-paper border border-line rounded-2xl overflow-hidden overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                onClick={() => handleSort(column)}
                className={`font-mono uppercase tracking-[0.1em] text-[10.5px] text-ink-60 text-left px-4 py-3.5 bg-wash border-b border-line ${
                  column.sortable ? 'cursor-pointer hover:bg-line' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {column.header}
                  {column.sortable && sortColumn === column.key && (
                    sortDirection === 'asc'
                      ? <CaretUp size={11} weight="bold" />
                      : <CaretDown size={11} weight="bold" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={`transition-colors hover:bg-wash last:border-0 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((column, index) => (
                <td
                  key={index}
                  className="px-4 py-3.5 border-b border-line text-sm last:border-0"
                >
                  {column.render
                    ? column.render(item)
                    : String(item[column.key as keyof T] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
