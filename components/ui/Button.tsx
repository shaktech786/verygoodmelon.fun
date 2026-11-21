import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}

/** The button look, for links that should appear as buttons. */
export function buttonClassName(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string): string {
  const baseStyles = 'font-medium rounded-lg button-squeeze transition-all duration-75 ease-in-out disabled:bg-foreground/10 disabled:text-foreground/40 disabled:cursor-not-allowed disabled:shadow-none disabled:border-foreground/10 focus:outline-none focus:ring-2 focus:ring-offset-2 active:shadow-sm select-none'

  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover soft-shadow hover:soft-shadow-md focus:ring-accent',
    secondary: 'bg-card-bg text-foreground border border-card-border hover:bg-hover-bg soft-shadow hover:soft-shadow-md focus:ring-accent',
    ghost: 'bg-transparent text-foreground hover:bg-hover-bg focus:ring-accent',
    danger: 'bg-danger text-white hover:bg-accent-hover soft-shadow hover:soft-shadow-md focus:ring-danger'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg'
  }

  return cn(baseStyles, variants[variant], sizes[size], className)
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName(variant, size, className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
