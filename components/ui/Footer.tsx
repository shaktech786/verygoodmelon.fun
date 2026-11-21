'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { openFeedback } from '@/components/FeedbackButton'
import { siteVisitCount } from '@/lib/analytics/visits'

// Phones get a 44px-tall tap target; the row stays compact on larger screens
const FOOTER_LINK =
  'inline-flex items-center min-h-11 px-2 sm:min-h-0 sm:px-0 text-xs text-primary-light hover:text-foreground transition-colors underline-offset-2 hover:underline'

export function Footer() {
  const [visitCount, setVisitCount] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    siteVisitCount().then((count) => {
      if (mounted) setVisitCount(count)
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <footer className="border-t border-card-border mt-20" role="contentinfo">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="flex flex-col items-center gap-2 text-sm text-center">
          {visitCount !== null && (
            <p className="text-xs text-primary-light">
              <span className="font-mono">{visitCount.toLocaleString()}</span> visits and counting
            </p>
          )}
          <p className="text-primary-light">Made with purpose. Every pixel has meaning.</p>
          <p className="text-primary-light">
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> VeryGoodMelon.Fun · Built by{' '}
            <a href="https://shak-tech.com" target="_blank" rel="noopener" className="underline hover:text-foreground transition-colors">
              ShakTech Labs
            </a>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-3">
            <Link href="/privacy" className={FOOTER_LINK}>
              Privacy
            </Link>
            <span className="text-foreground/20" aria-hidden="true">|</span>
            <Link href="/terms" className={FOOTER_LINK}>
              Terms
            </Link>
            <span className="text-foreground/20" aria-hidden="true">|</span>
            <Link href="/analytics" className={FOOTER_LINK}>
              Analytics
            </Link>
            <span className="text-foreground/20 sm:hidden" aria-hidden="true">|</span>
            <button type="button" onClick={openFeedback} aria-haspopup="dialog" className={`sm:hidden ${FOOTER_LINK}`}>
              Feedback
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
