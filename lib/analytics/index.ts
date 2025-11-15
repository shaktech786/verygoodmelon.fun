/**
 * Analytics Integration Utilities
 * Type-safe analytics tracking with support for multiple providers
 */

export type AnalyticsProvider = 'vercel' | 'google' | 'custom'

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  timestamp?: number
}

export interface PageViewEvent {
  path: string
  title?: string
  referrer?: string
}

export interface UserProperties {
  userId?: string
  email?: string
  name?: string
  [key: string]: any
}

/**
 * Analytics queue for batching events
 */
class AnalyticsQueue {
  private queue: AnalyticsEvent[] = []
  private flushInterval: number = 5000 // 5 seconds
  private maxQueueSize: number = 10
  private flushTimer?: NodeJS.Timeout

  constructor() {
    this.startFlushTimer()
  }

  add(event: AnalyticsEvent) {
    this.queue.push({
      ...event,
      timestamp: event.timestamp || Date.now()
    })

    if (this.queue.length >= this.maxQueueSize) {
      this.flush()
    }
  }

  flush() {
    if (this.queue.length === 0) return

    const events = [...this.queue]
    this.queue = []

    // Send to analytics providers
    this.sendToProviders(events)
  }

  private sendToProviders(events: AnalyticsEvent[]) {
    // In production, send to your analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Events:', events)
    }

    // Example: Send to custom endpoint
    // fetch('/api/analytics', {
    //   method: 'POST',
    //   body: JSON.stringify(events)
    // })
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush())
    }
  }

  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush()
  }
}

const analyticsQueue = new AnalyticsQueue()

/**
 * Track a custom event
 */
export function trackEvent(name: string, properties?: Record<string, any>) {
  analyticsQueue.add({ name, properties })

  // Also track with Vercel Analytics if available
  if (typeof window !== 'undefined' && (window as any).va) {
    ;(window as any).va('event', name, properties)
  }
}

/**
 * Track a page view
 */
export function trackPageView(event: PageViewEvent) {
  analyticsQueue.add({
    name: 'page_view',
    properties: event
  })

  // Track with Vercel Analytics
  if (typeof window !== 'undefined' && (window as any).va) {
    ;(window as any).va('pageview', {
      path: event.path,
      title: event.title
    })
  }
}

/**
 * Set user properties
 */
export function setUserProperties(properties: UserProperties) {
  analyticsQueue.add({
    name: 'user_properties',
    properties
  })
}

/**
 * Track user action
 */
export function trackAction(action: string, category: string, label?: string, value?: number) {
  trackEvent('user_action', {
    action,
    category,
    label,
    value
  })
}

/**
 * Track error
 */
export function trackError(error: Error, context?: Record<string, any>) {
  trackEvent('error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  })
}

/**
 * Track timing (performance)
 */
export function trackTiming(category: string, variable: string, time: number, label?: string) {
  trackEvent('timing', {
    category,
    variable,
    time,
    label
  })
}

/**
 * Track conversion
 */
export function trackConversion(conversionId: string, value?: number, currency?: string) {
  trackEvent('conversion', {
    conversionId,
    value,
    currency
  })
}

/**
 * Game-specific analytics
 */
export const gameAnalytics = {
  /**
   * Track game start
   */
  gameStart(gameId: string, difficulty?: string) {
    trackEvent('game_start', {
      gameId,
      difficulty
    })
  },

  /**
   * Track game complete
   */
  gameComplete(gameId: string, score?: number, duration?: number) {
    trackEvent('game_complete', {
      gameId,
      score,
      duration
    })
  },

  /**
   * Track game quit
   */
  gameQuit(gameId: string, progress?: number) {
    trackEvent('game_quit', {
      gameId,
      progress
    })
  },

  /**
   * Track level progress
   */
  levelProgress(gameId: string, level: number, score?: number) {
    trackEvent('level_progress', {
      gameId,
      level,
      score
    })
  },

  /**
   * Track achievement unlock
   */
  achievementUnlock(achievementId: string, gameId?: string) {
    trackEvent('achievement_unlock', {
      achievementId,
      gameId
    })
  }
}

/**
 * E-commerce analytics (for future paid features)
 */
export const ecommerceAnalytics = {
  /**
   * Track product view
   */
  productView(productId: string, productName: string, price?: number) {
    trackEvent('product_view', {
      productId,
      productName,
      price
    })
  },

  /**
   * Track add to cart
   */
  addToCart(productId: string, quantity: number, price: number) {
    trackEvent('add_to_cart', {
      productId,
      quantity,
      price,
      value: quantity * price
    })
  },

  /**
   * Track purchase
   */
  purchase(orderId: string, total: number, currency: string, items: any[]) {
    trackEvent('purchase', {
      orderId,
      total,
      currency,
      items
    })
  }
}

/**
 * Flush analytics queue (useful on page navigation)
 */
export function flushAnalytics() {
  analyticsQueue.flush()
}

/**
 * Stop analytics (cleanup)
 */
export function stopAnalytics() {
  analyticsQueue.stop()
}
