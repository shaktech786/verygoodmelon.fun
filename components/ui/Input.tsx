import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface BaseInputProps {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseInputProps {
  variant?: 'default' | 'filled' | 'outline'
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {
  variant?: 'default' | 'filled' | 'outline'
  resize?: boolean
}

const baseInputStyles = 'w-full px-3 py-2 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed'

const variants = {
  default: 'bg-card-bg text-foreground border border-card-border hover:border-accent/50 focus:border-accent focus:ring-accent',
  filled: 'bg-hover-bg text-foreground border-0 hover:bg-card-border focus:bg-card-bg focus:ring-accent',
  outline: 'bg-transparent text-foreground border-2 border-card-border hover:border-accent/50 focus:border-accent focus:ring-accent'
}

const errorStyles = 'border-danger focus:border-danger focus:ring-danger'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, required, variant = 'default', className, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground/70 mb-1"
          >
            {label}
            {required && <span className="text-danger ml-1" aria-label="required">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            baseInputStyles,
            variants[variant],
            hasError && errorStyles,
            className
          )}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          required={required}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-foreground/60">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, required, variant = 'default', resize = false, className, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground/70 mb-1"
          >
            {label}
            {required && <span className="text-danger ml-1" aria-label="required">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            baseInputStyles,
            variants[variant],
            !resize && 'resize-none',
            hasError && errorStyles,
            className
          )}
          aria-invalid={hasError}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          required={required}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="mt-1 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${textareaId}-helper`} className="mt-1 text-sm text-foreground/60">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
