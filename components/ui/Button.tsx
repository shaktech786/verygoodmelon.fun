import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg button-squeeze transition-all duration-75 ease-in-out disabled:bg-foreground/10 disabled:text-foreground/40 disabled:cursor-not-allowed disabled:shadow-none disabled:border-foreground/10 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none'

  const variants = {
    primary: 'bg-accent text-white hover:bg-accent/90 soft-shadow hover:soft-shadow-md focus:ring-accent',
    secondary: 'bg-card-bg text-foreground border border-card-border hover:bg-hover-bg soft-shadow hover:soft-shadow-md focus:ring-accent',
    ghost: 'bg-transparent text-foreground hover:bg-hover-bg focus:ring-accent',
    danger: 'bg-danger text-white hover:bg-danger/90 soft-shadow hover:soft-shadow-md focus:ring-danger'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg'
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
