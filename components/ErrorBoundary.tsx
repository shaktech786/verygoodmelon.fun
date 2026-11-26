'use client'

import { Component, ReactNode } from 'react'
import { buttonClass } from '@/components/seedpress/buttonClass'
import { ErrorNote } from '@/components/seedpress/ErrorNote'
import { Go } from '@/components/seedpress/Go'
import { Stamp } from '@/components/seedpress/Stamp'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetOnPropsChange?: unknown[]
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

    // In production, send to Sentry
    if (process.env.NODE_ENV === 'production') {
      import('@sentry/nextjs').then(Sentry => {
        Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
      })
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

    // Auto-reset after too many errors (prevent a render loop)
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
        <ErrorNote
          title="Oops, something went wrong"
          help="If this problem persists, please contact support or try again later."
          actions={
            <>
              <Go onClick={this.reset}>Try Again</Go>
              <Stamp onClick={this.reload}>Reload Page</Stamp>
              {/* A full page load, not client navigation, so the broken state is left behind */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- see above */}
              <a href="/" className={buttonClass('stamp')}>
                <span>Go Home</span>
              </a>
            </>
          }
          details={
            process.env.NODE_ENV === 'development' && error ? (
              <details className="sp-error__details">
                <summary>Error Details (Development Only)</summary>
                <p>Error:</p>
                <pre>{error.toString()}</pre>
                {errorInfo && (
                  <>
                    <p>Component Stack:</p>
                    <pre>{errorInfo.componentStack}</pre>
                  </>
                )}
              </details>
            ) : undefined
          }
        >
          We encountered an unexpected error. Don&apos;t worry, we&apos;ve been notified and are looking into it.
        </ErrorNote>
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
