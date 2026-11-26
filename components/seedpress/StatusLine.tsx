import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Icon } from './icons/Icon'

interface StatusLineProps {
  children?: ReactNode
  /** `done` marks a finished step, `note` a heads-up. Without one the line is plain words. */
  mark?: 'done' | 'note'
  className?: string
}

/**
 * One polite live region per area. It keeps its height when empty so the layout never jumps, and
 * a message stays until another replaces it: nothing here disappears on a timer.
 */
export function StatusLine({ children, mark, className }: StatusLineProps) {
  return (
    <p role="status" className={cn('sp-status', className)}>
      {children ? (
        <>
          {mark && <Icon name={mark} className="sp-status__mark" />}
          <span>{children}</span>
        </>
      ) : null}
    </p>
  )
}
