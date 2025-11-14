import { cn } from '@/lib/utils/cn'

export function OrganicBlob({
  color = 'accent',
  size = 'md',
  opacity = 0.05,
  className
}: {
  color?: 'accent' | 'success' | 'melon-green'
  size?: 'sm' | 'md' | 'lg'
  opacity?: number
  className?: string
}) {
  const sizes = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64'
  }

  return (
    <div
      className={cn(
        'absolute pointer-events-none blur-3xl',
        sizes[size],
        className
      )}
      style={{
        background: `var(--${color})`,
        opacity,
        borderRadius: '40% 60% 70% 30% / 50% 60% 30% 70%',
        animation: 'blob-float 25s ease-in-out infinite',
      }}
      aria-hidden="true"
    />
  )
}
