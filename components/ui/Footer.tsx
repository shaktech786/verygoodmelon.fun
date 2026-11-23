'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { openFeedback } from '@/components/FeedbackDialog'
import { siteVisitCount } from '@/lib/analytics/visits'

// Phones get a 44px-tall tap target; the row stays compact on larger screens
const LINK_BASE =
  'inline-flex items-center min-h-11 px-2 sm:min-h-0 sm:py-1 text-primary-light hover:text-foreground transition-colors underline-offset-2 hover:underline'
const FOOTER_LINK = `${LINK_BASE} text-xs`
// The row for ways to reach out or give, kept a step larger than the site links
const SUPPORT_LINK = `${LINK_BASE} text-sm`

const SITE_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const

const ABOUT_LINKS = [
  { href: '/thoughts', label: 'Thoughts' },
  { href: '/about', label: 'About' },
] as const

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
      <div className="container mx-auto px-6 py-10 max-w-6xl flex flex-col items-center gap-3 text-center">
        <ul className="flex flex-wrap items-center justify-center gap-x-4" aria-label="Support">
          <li>
            <Link href="/support" className={SUPPORT_LINK}>
              Need to talk?
            </Link>
          </li>
        </ul>
        <ul className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-4" aria-label="Site">
          {SITE_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={FOOTER_LINK}>
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={openFeedback} aria-haspopup="dialog" className={FOOTER_LINK}>
              Feedback
            </button>
          </li>
          {ABOUT_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={FOOTER_LINK}>
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <a
              href="https://github.com/shaktech786/verygoodmelon.fun"
              target="_blank"
              rel="noopener noreferrer"
              className={FOOTER_LINK}
            >
              GitHub<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        </ul>
        <p className="text-xs text-primary-light">
          © <span suppressHydrationWarning>{new Date().getFullYear()}</span> VeryGoodMelon.Fun · Built by{' '}
          <a href="https://shak-tech.com" target="_blank" rel="noopener" className="underline hover:text-foreground transition-colors">
            ShakTech Labs
          </a>
          {visitCount !== null && (
            <>
              {' · '}
              <span className="font-mono">{visitCount.toLocaleString()}</span> visits
            </>
          )}
        </p>
      </div>
    </footer>
  )
}
