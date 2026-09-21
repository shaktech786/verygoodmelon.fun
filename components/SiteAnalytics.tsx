'use client'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { isTrackingAllowed } from '@/lib/analytics'

function dropIfOptedOut<T>(event: T): T | null {
  return isTrackingAllowed() ? event : null
}

/**
 * Cookieless, anonymous traffic and performance measurement.
 * Visitors sending Do Not Track or Global Privacy Control are skipped entirely.
 */
export function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={dropIfOptedOut} />
      <SpeedInsights beforeSend={dropIfOptedOut} />
    </>
  )
}
