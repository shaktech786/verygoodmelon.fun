/**
 * ErrorState Component
 * Displays error messages with retry functionality
 */

import { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ErrorStateProps {
  title?: string
  description?: string
  error?: Error | string | null
  onRetry?: () => void
  showDetails?: boolean
  icon?: ReactNode
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  error,
  onRetry,
  showDetails = false,
  icon
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center" role="alert" aria-live="assertive">
      <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4 text-danger">
        {icon || <AlertCircle className="w-8 h-8" aria-hidden="true" />}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-foreground/70 mb-6 max-w-md">{description}</p>

      {onRetry && (
        <Button onClick={onRetry} variant="primary">
          Try Again
        </Button>
      )}

      {showDetails && errorMessage && (
        <details className="mt-6 text-left max-w-md w-full">
          <summary className="text-sm text-foreground/60 cursor-pointer hover:text-foreground transition-colors">
            Show error details
          </summary>
          <pre className="mt-3 p-4 bg-card-bg border border-card-border rounded-lg text-xs text-danger overflow-auto max-h-40">
            {errorMessage}
          </pre>
        </details>
      )}
    </div>
  )
}
