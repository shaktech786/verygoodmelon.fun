'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetOnPropsChange?: any[]
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // Update state
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1
    }))

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught:', error, errorInfo)
    }

    // In production, send to analytics
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
      console.error('Production error:', error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange } = this.props
    const { hasError, errorCount } = this.state

    // Auto-reset if specified props change
    if (hasError && resetOnPropsChange) {
      const hasChanged = resetOnPropsChange.some((prop, index) =>
        prop !== prevProps.resetOnPropsChange?.[index]
      )

      if (hasChanged) {
        this.reset()
      }
    }

    // Auto-reset after too many errors (prevent infinite loops)
    if (errorCount > 5) {
      console.warn('[ErrorBoundary] Too many errors, forcing reset')
      setTimeout(() => this.reset(), 3000)
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    })
  }

  reload = () => {
    window.location.reload()
  }

  goHome = () => {
    window.location.href = '/'
  }

  render() {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Custom fallback
      if (fallback) {
        return fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-2xl w-full">
            <div className="bg-card-bg border border-card-border rounded-xl p-8 shadow-lg">
              {/* Icon */}
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-danger" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-semibold text-center text-foreground mb-3">
                Oops, something went wrong
              </h1>

              {/* Description */}
              <p className="text-center text-foreground/70 mb-6">
                We encountered an unexpected error. Don&apos;t worry, we&apos;ve been notified and are looking into it.
              </p>

              {/* Error details (development only) */}
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mb-6 bg-hover-bg rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-sm text-foreground/80 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong className="text-danger">Error:</strong>
                      <pre className="mt-1 p-2 bg-card-bg rounded overflow-x-auto text-foreground/70">
                        {error.toString()}
                      </pre>
                    </div>
                    {errorInfo && (
                      <div>
                        <strong className="text-danger">Component Stack:</strong>
                        <pre className="mt-1 p-2 bg-card-bg rounded overflow-x-auto text-foreground/70">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.reset}
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Try Again
                </Button>
                <Button
                  onClick={this.reload}
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Reload Page
                </Button>
                <Button
                  onClick={this.goHome}
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Home size={18} />
                  Go Home
                </Button>
              </div>

              {/* Help text */}
              <p className="text-xs text-center text-foreground/50 mt-6">
                If this problem persists, please contact support or try again later.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * Functional wrapper for Error Boundary
 * Easier to use in function components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
