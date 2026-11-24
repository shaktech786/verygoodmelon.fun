import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Icon } from './icons/Icon'
import type { IconName } from './icons/glyphs'

interface IconStampProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName
  /** The button's name; icon-only buttons are only ever the gear and close. */
  label: string
  children?: ReactNode
}

export function IconStamp({ icon, label, children, className, ...rest }: IconStampProps) {
  return (
    <button type="button" aria-label={label} {...rest} className={cn('sp-icon-stamp', className)}>
      <Icon name={icon} />
      {children}
    </button>
  )
}
