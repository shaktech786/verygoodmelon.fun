import type { ReactNode, Ref } from 'react'
import { cn } from '@/lib/utils/cn'

interface StickyTrayProps {
  children: ReactNode
  className?: string
  /** False while there is nothing yet worth keeping on screen; the tray then sits in place like any row. */
  pinned?: boolean
  ref?: Ref<HTMLDivElement>
}

/**
 * A game's in-play controls: the view's one Go and at most one Stamp. It sits in place when there
 * is room and otherwise rests on the bottom edge of the screen, so the next step is always one tap
 * away on a phone without the game scrolling inside a box of its own.
 */
export function StickyTray({ children, className, pinned = true, ref }: StickyTrayProps) {
  return (
    <div ref={ref} data-sticky-action-bar className={cn('sp-tray', pinned && 'is-pinned', className)}>
      {children}
    </div>
  )
}
