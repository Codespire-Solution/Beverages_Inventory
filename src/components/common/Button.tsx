'use client'

import { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'accent'
}

const base =
  'inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.11em] text-[11px] font-medium rounded-full px-5 py-3 transition-transform duration-150 ease-[var(--ease)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none'

const variants = {
  primary: 'bg-ink text-white hover:bg-black',
  ghost: 'bg-transparent text-ink border border-ink hover:bg-wash',
  accent: 'bg-accent text-accent-ink border border-accent hover:brightness-95',
}

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />
}
