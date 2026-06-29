'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/common/Button'

export default function ReportsPage() {
  const router = useRouter()

  const reportCategories = [
    {
      title: 'Inventory Reports',
      reports: [
        { name: 'Current Stock Levels', path: '/reports/inventory' },
        { name: 'Stock Valuation', path: '/reports/inventory?type=valuation' },
        { name: 'Stock Movement', path: '/reports/inventory?type=movement' },
      ],
    },
    {
      title: 'Sales Reports',
      reports: [
        { name: 'Sales by SKU', path: '/reports/sales' },
        { name: 'Sales by Customer', path: '/reports/sales?groupBy=customer' },
        { name: 'Sales Summary', path: '/reports/sales?type=summary' },
      ],
    },
    {
      title: 'Purchase Reports',
      reports: [
        { name: 'Purchases by Supplier', path: '/reports/purchases' },
        { name: 'Purchases by Item', path: '/reports/purchases?groupBy=item' },
        { name: 'Purchase Summary', path: '/reports/purchases?type=summary' },
      ],
    },
    {
      title: 'Production Reports',
      reports: [
        { name: 'Production Yield', path: '/reports/production' },
        { name: 'Waste Analysis', path: '/reports/production?type=waste' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-medium text-4xl">Reports and Analytics</h1>
        <div className="h-[3px] w-16 bg-accent mt-3" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="bg-paper rounded-2xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-ink">{category.title}</h3>
            <ul className="space-y-2">
              {category.reports.map((report, reportIndex) => (
                <li key={reportIndex}>
                  <button
                    onClick={() => router.push(report.path)}
                    className="text-accent-ink hover:underline text-sm"
                  >
                    {report.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
