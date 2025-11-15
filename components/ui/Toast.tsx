/**
 * Toast Component
 * Slide-in toast notifications with icons and auto-dismiss
 */

'use client'

import { useToast } from '@/lib/hooks/useToast'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" aria-hidden="true" />,
    error: <XCircle className="w-5 h-5 text-danger" aria-hidden="true" />,
    info: <Info className="w-5 h-5 text-accent" aria-hidden="true" />
  }

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="
            flex items-center gap-3 px-4 py-3 min-w-[300px] max-w-md
            bg-card-bg border border-card-border rounded-lg shadow-lg
            animate-slide-in-right
          "
          role="alert"
        >
          {icons[toast.type]}
          <span className="flex-1 text-sm font-medium text-foreground">
            {toast.message}
          </span>
          <button
            onClick={() => removeToast(toast.id)}
            className="
              text-primary-light hover:text-foreground
              transition-colors duration-75
              focus:outline-none focus:ring-2 focus:ring-accent
            "
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
