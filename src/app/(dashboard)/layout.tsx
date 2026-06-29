'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { MagnifyingGlass, Circle } from '@phosphor-icons/react'
import { NAV_ICONS } from '@/components/common/icons'
import { Button } from '@/components/common/Button'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      setUser(JSON.parse(userData))
    } catch {
      // Corrupted/invalid stored user — force a clean re-login instead of crashing.
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/items', label: 'Items', icon: '📦' },
    { href: '/skus', label: 'SKUs', icon: '🏷️' },
    { href: '/recipes', label: 'Recipes / QPS', icon: '📝' },
    { href: '/warehouses', label: 'Warehouses', icon: '🏢' },
    { href: '/suppliers', label: 'Suppliers', icon: '🚚' },
    { href: '/customers', label: 'Customers', icon: '👥' },
    { href: '/inventory', label: 'Inventory', icon: '📋' },
    { href: '/purchase-orders', label: 'Purchase Orders', icon: '🛒' },
    { href: '/production', label: 'Production', icon: '🏭' },
    { href: '/customer-orders', label: 'Customer Orders', icon: '📦' },
    { href: '/forecasting', label: 'Forecasting', icon: '🔮' },
    { href: '/reports', label: 'Reports', icon: '📈' },
    ...(user?.role === 'admin' ? [{ href: '/users', label: 'Users', icon: '👤' }] : []),
  ]

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <span className="label">Loading</span>
      </div>
    )
  }

  const initials = (user.fullName as string)
    ?.split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '??'

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-paper border-r border-line flex flex-col p-4 sticky top-0 h-screen">
        {/* Brand */}
        <div className="mb-6 px-1">
          <div className="font-serif font-bold text-3xl tracking-[0.06em]">ANOTHR</div>
          <div className="label mt-1.5">INVENTORY OS</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const iconKey = item.href.replace(/^\//, '') as keyof typeof NAV_ICONS
              const Icon = NAV_ICONS[iconKey] ?? Circle
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] font-semibold text-sm transition-colors ${
                      isActive
                        ? 'bg-ink text-white'
                        : 'text-ink-60 hover:bg-wash hover:text-ink'
                    }`}
                  >
                    <Icon
                      size={18}
                      weight="regular"
                      className={isActive ? 'text-accent' : ''}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-line">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-8 h-8 rounded-full bg-wash border border-line flex items-center justify-center font-mono text-[11px] font-semibold text-ink-60 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{user.fullName}</p>
              <p className="label truncate">{user.role}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-9 py-4 border-b border-line bg-bg sticky top-0 z-10">
          <div className="flex items-center gap-2 font-mono text-xs text-ink-60 bg-paper border border-line rounded-full px-4 py-2.5">
            <MagnifyingGlass size={16} />
            Search
          </div>
          <div className="flex items-center gap-4">
            <span className="label">Main Warehouse</span>
            <Button variant="primary">New Order</Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-9">{children}</main>
      </div>
    </div>
  )
}
