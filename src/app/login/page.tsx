'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EnvelopeSimple, LockSimple, Eye, EyeSlash, SignIn, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/common/Button'
import { Marquee } from '@/components/common/Marquee'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* LEFT brand panel */}
      <div className="bg-ink text-white p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Radial glow accent */}
        <div
          className="pointer-events-none absolute right-[-120px] top-[-80px] w-[340px] h-[340px] rounded-full"
          style={{ background: 'radial-gradient(circle, oklch(0.72 0.145 62 / 0.28), transparent 68%)' }}
        />

        {/* Wordmark */}
        <div className="relative">
          <div className="font-serif font-bold text-4xl tracking-[0.08em]">
            ANOTHR
          </div>
          <div className="font-mono uppercase tracking-[0.36em] text-[10px] text-accent mt-2">
            INVENTORY OS
          </div>
        </div>

        {/* Pitch */}
        <div className="relative max-w-[30ch]">
          <h1 className="font-serif font-medium text-[42px] leading-[1.06] tracking-[-0.01em]">
            Run the line, from raw materials to finished cans.
          </h1>
          <p className="mt-4 text-[15.5px]" style={{ color: 'oklch(0.965 0.01 85 / 0.62)' }}>
            Batch tracking, recipes, production and orders in one place.
          </p>
        </div>

        {/* Facts row */}
        <div className="relative flex gap-9">
          <div>
            <div className="font-serif font-medium text-[34px] leading-none">15</div>
            <div className="font-mono uppercase tracking-[0.12em] text-[10px] mt-1.5" style={{ color: 'oklch(0.965 0.01 85 / 0.55)' }}>Items</div>
          </div>
          <div>
            <div className="font-serif font-medium text-[34px] leading-none">3</div>
            <div className="font-mono uppercase tracking-[0.12em] text-[10px] mt-1.5" style={{ color: 'oklch(0.965 0.01 85 / 0.55)' }}>SKUs</div>
          </div>
          <div>
            <div className="font-serif font-medium text-[34px] leading-none">FIFO</div>
            <div className="font-mono uppercase tracking-[0.12em] text-[10px] mt-1.5" style={{ color: 'oklch(0.965 0.01 85 / 0.55)' }}>Batch tracking</div>
          </div>
        </div>

        {/* Bottom marquee bleeding to panel edges */}
        <div className="-mx-12 -mb-12">
          <Marquee items={['Strawberry Vanilla', 'Litchi Mango', 'Lemon Lime', '7gm Fiber', '0gm Sugar', 'Made with Plants']} />
        </div>
      </div>

      {/* RIGHT form panel */}
      <div className="flex items-center justify-center p-12">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <h2 className="font-serif font-medium text-[36px] leading-none animate-rise">Sign in</h2>
          <p className="text-ink-60 mt-2.5 mb-8 animate-rise" style={{ animationDelay: '0.07s' }}>
            Welcome back. Enter your details to continue.
          </p>

          <form onSubmit={handleSubmit} autoComplete="on">
            {/* Email field */}
            <div className="mb-[18px] animate-rise" style={{ animationDelay: '0.14s' }}>
              <label htmlFor="email" className="label block mb-2">
                Email address
              </label>
              <div className="flex items-center gap-2.5 bg-wash border border-line rounded-xl px-3.5 h-12 focus-within:border-accent focus-within:bg-paper transition-colors duration-150">
                <EnvelopeSimple size={18} className="text-ink-60 shrink-0" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="border-none bg-transparent outline-none font-sans text-[15px] text-ink w-full h-full placeholder:text-ink-60"
                />
              </div>
              <div className="font-mono text-[11px] text-ink-60 mt-1.5">Use your work email.</div>
            </div>

            {/* Password field */}
            <div className="mb-[18px] animate-rise" style={{ animationDelay: '0.21s' }}>
              <label htmlFor="password" className="label block mb-2">
                Password
              </label>
              <div className="flex items-center gap-2.5 bg-wash border border-line rounded-xl px-3.5 h-12 focus-within:border-accent focus-within:bg-paper transition-colors duration-150">
                <LockSimple size={18} className="text-ink-60 shrink-0" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="border-none bg-transparent outline-none font-sans text-[15px] text-ink w-full h-full placeholder:text-ink-60"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 text-ink-60 bg-transparent border-none cursor-pointer hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 text-warn-ink bg-warn-bg rounded-lg px-3 py-2 text-[12.5px] mt-2"
                >
                  <WarningCircle size={15} className="shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Remember me / Forgot password row */}
            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 text-[13.5px] text-ink-60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-accent"
                />
                Remember me
              </label>
              <a href="#" className="text-[13.5px] text-accent-ink hover:underline">
                Forgot password
              </a>
            </div>

            {/* Submit button */}
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="w-full h-[50px]"
            >
              <SignIn size={16} />
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
