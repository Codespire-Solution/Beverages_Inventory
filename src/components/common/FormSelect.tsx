'use client'

import { CaretDown } from '@phosphor-icons/react'

interface Option {
  value: string | number
  label: string
}

interface FormSelectProps {
  label: string
  name: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: Option[]
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

export default function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
  disabled = false,
  placeholder,
}: FormSelectProps) {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="label block mb-2">
        {label}
        {required && <span className="text-warn-ink ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full bg-wash border rounded-xl px-3.5 pr-10 h-12 text-ink focus:border-accent focus:bg-paper outline-none transition-colors appearance-none ${
            error ? 'border-warn-ink' : 'border-line'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <CaretDown size={14} weight="bold" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-60" />
      </div>
      {error && <p className="text-warn-ink text-[12.5px] mt-1.5">{error}</p>}
    </div>
  )
}
