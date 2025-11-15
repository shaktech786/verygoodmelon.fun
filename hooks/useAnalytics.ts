'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  trackEvent,
  trackPageView,
  trackAction,
  gameAnalytics
} from '@/lib/analytics'

/**
 * Hook to automatically track page views
 */
export function usePageTracking() {
  const pathname = usePathname()

  useEffect(() => {
    trackPageView({
      path: pathname,
      title: document.title,
      referrer: document.referrer
    })
  }, [pathname])
}

/**
 * Hook to track events
 */
export function useEventTracking() {
  return {
    track: trackEvent,
    trackAction,
    gameAnalytics
  }
}

/**
 * Hook to track time spent on page
 */
export function useTimeTracking(pageName: string) {
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    return () => {
      const timeSpent = Date.now() - startTimeRef.current
      trackEvent('time_on_page', {
        page: pageName,
        duration: timeSpent
      })
    }
  }, [pageName])
}

/**
 * Hook to track clicks on specific elements
 */
export function useClickTracking(elementName: string) {
  const handleClick = (additionalData?: Record<string, any>) => {
    trackEvent('element_click', {
      element: elementName,
      ...additionalData
    })
  }

  return handleClick
}

/**
 * Hook to track form submissions
 */
export function useFormTracking(formName: string) {
  const startTimeRef = useRef<number | null>(null)

  const trackStart = () => {
    startTimeRef.current = Date.now()
    trackEvent('form_start', { form: formName })
  }

  const trackSubmit = (success: boolean, errorMessage?: string) => {
    const duration = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : null

    trackEvent('form_submit', {
      form: formName,
      success,
      errorMessage,
      duration
    })

    startTimeRef.current = null
  }

  const trackAbandon = () => {
    const duration = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : null

    trackEvent('form_abandon', {
      form: formName,
      duration
    })

    startTimeRef.current = null
  }

  return { trackStart, trackSubmit, trackAbandon }
}

/**
 * Hook to track scroll depth
 */
export function useScrollTracking(pageName: string) {
  const trackedPercentagesRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY

      const scrollPercent = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      )

      // Track at 25%, 50%, 75%, 100%
      const milestones = [25, 50, 75, 100]
      milestones.forEach(milestone => {
        if (scrollPercent >= milestone && !trackedPercentagesRef.current.has(milestone)) {
          trackedPercentagesRef.current.add(milestone)
          trackEvent('scroll_depth', {
            page: pageName,
            depth: milestone
          })
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pageName])
}

/**
 * Hook to track errors
 */
export function useErrorTracking() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString()
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
}

/**
 * Hook to track visibility changes (tab focus)
 */
export function useVisibilityTracking(pageName: string) {
  const visibilityStartRef = useRef(Date.now())

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const visibleDuration = Date.now() - visibilityStartRef.current
        trackEvent('page_hidden', {
          page: pageName,
          duration: visibleDuration
        })
      } else {
        visibilityStartRef.current = Date.now()
        trackEvent('page_visible', {
          page: pageName
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pageName])
}
