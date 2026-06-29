'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const skeletonCount = {
    sm: 2,
    md: 3,
    lg: 4,
  }

  const skeletonHeight = {
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-12',
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full">
      <div className="space-y-3 w-full max-w-sm">
        {[...Array(skeletonCount[size])].map((_, i) => (
          <div
            key={i}
            className={`bg-wash animate-pulse rounded-xl ${skeletonHeight[size]} w-full`}
            style={{ opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
      {text && <p className="mt-4 text-sm text-ink-60 font-sans">{text}</p>}
    </div>
  )
}
