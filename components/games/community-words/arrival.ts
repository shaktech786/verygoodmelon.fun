'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Lets an element settle in after a pause, once, when it first appears. With motion reduced it is
 * simply there. The element is in the page (and readable) the whole time; only its look waits.
 */
export function useArrival(
  ref: RefObject<HTMLElement | null>,
  { delay, reduceMotion, from = 'translateY(6px)', to = 'none' }: { delay: number; reduceMotion: boolean; from?: string; to?: string }
) {
  useEffect(() => {
    const element = ref.current
    if (reduceMotion || !element?.animate) return
    const arrival = element.animate(
      [
        { opacity: 0, transform: from },
        { opacity: 1, transform: to },
      ],
      { duration: 900, delay, easing: 'ease-out', fill: 'backwards' }
    )
    return () => arrival.cancel()
  }, [ref, delay, reduceMotion, from, to])
}
