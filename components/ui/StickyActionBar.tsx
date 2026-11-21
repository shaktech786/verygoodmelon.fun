import type { ReactNode, Ref } from 'react'
import { cn } from '@/lib/utils/cn'

interface StickyActionBarProps {
  children: ReactNode
  className?: string
  /** False while there is nothing yet worth keeping on screen; the bar then sits in place like any row. */
  pinned?: boolean
  ref?: Ref<HTMLDivElement>
}

/**
 * A game's in-play controls. It sits in place when there is room and otherwise rests on
 * the bottom edge of the screen, so the next step is always one tap away on a phone
 * without the game scrolling inside a box of its own.
 */
export function StickyActionBar({ children, className, pinned = true, ref }: StickyActionBarProps) {
  return (
    <div
      ref={ref}
      data-sticky-action-bar
      className={cn(
        pinned && 'sticky bottom-0 z-20 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background/95',
        className,
      )}
    >
      {children}
    </div>
  )
}
