import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface PrintTrayProps {
  /** Heading read before the picture; visible unless `hideLabel`. */
  label: string
  hideLabel?: boolean
  className?: string
  /** The finished print, then its actions. */
  children: ReactNode
}

/** The tray a keepsake sits in (PLAN.md 7.19): a flesh-wash sheet with a deckled bottom edge. */
export function PrintTray({ label, hideLabel = false, className, children }: PrintTrayProps) {
  return (
    // The heading alone carries the title; naming the section after it too made screen readers say it twice.
    <section className={cn('sp-printtray', className)}>
      <h3 className={hideLabel ? 'sr-only' : 'sp-printtray__label'}>{label}</h3>
      {children}
    </section>
  )
}
