/**
 * WatermelonLoader Component
 * Brand-themed loading indicator with animated watermelon slice
 */

interface WatermelonLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export function WatermelonLoader({
  size = 'md',
  message = 'Loading...'
}: WatermelonLoaderProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      {/* Animated watermelon slice */}
      <div className={`${sizes[size]} relative animate-melon-spin`}>
        {/* Outer green rind */}
        <div className="absolute inset-0 rounded-full bg-melon-green"></div>

        {/* Inner light green */}
        <div className="absolute inset-2 rounded-full bg-success"></div>

        {/* Red flesh */}
        <div className="absolute inset-4 rounded-full bg-accent"></div>

        {/* Seeds */}
        <div className="absolute top-1/2 left-1/3 w-1 h-2 bg-foreground rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-2 bg-foreground rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-1/3 left-1/2 w-1 h-2 bg-foreground rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <p className="text-sm text-primary-light" aria-label={message}>
        {message}
      </p>
    </div>
  )
}
