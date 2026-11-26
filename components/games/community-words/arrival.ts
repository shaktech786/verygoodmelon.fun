'use client'

import { useEffect, type RefObject } from 'react'

const ARRIVAL_MS = 700

/**
 * Lets an element settle in after a pause, once, when it first appears. With motion off (Quiet or
 * reduced motion) it is simply there. The element is in the page (and readable) the whole time;
 * only its look waits.
 */
export function useArrival(
  ref: RefObject<HTMLElement | null>,
  { delay, motionScale, from = 'translateY(6px)' }: { delay: number; motionScale: 0 | 1; from?: string }
) {
  useEffect(() => {
    const element = ref.current
    if (motionScale === 0 || !element?.animate) return
    const arrival = element.animate(
      [
        { opacity: 0, transform: from },
        // The end is whatever the element's own style says, so a resting tilt is kept
        { opacity: 1 },
      ],
      { duration: ARRIVAL_MS, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
    )
    return () => arrival.cancel()
  }, [ref, delay, motionScale, from])
}
