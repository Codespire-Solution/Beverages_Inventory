'use client'

interface FormInputProps {
  label: string
  name: string
  type?: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  helperText?: string
  step?: string | number
  min?: string | number
  max?: string | number
}

export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  helperText,
  step,
  min,
  max,
}: FormInputProps) {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="label block mb-2">
        {label}
        {required && <span className="text-warn-ink ml-1">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        className={`w-full bg-wash border rounded-xl px-3.5 h-12 text-ink focus:border-accent focus:bg-paper outline-none transition-colors ${
          error ? 'border-warn-ink' : 'border-line'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-warn-ink text-[12.5px] mt-1.5">{error}</p>}
      {helperText && !error && <p className="mt-1 text-[12.5px] text-ink-60">{helperText}</p>}
    </div>
  )
}
