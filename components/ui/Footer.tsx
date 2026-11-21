'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { openFeedback } from '@/components/FeedbackButton'

export function Footer() {
  const [visitCount, setVisitCount] = useState<number | null>(null)

  useEffect(() => {
    const trackVisit = async () => {
      try {
        const hasVisited = sessionStorage.getItem('hasVisited')

        if (!hasVisited) {
          const response = await fetch('/api/site-visits', {
            method: 'POST'
          })

          if (response.ok) {
            const data = await response.json()
            setVisitCount(data.count)
            sessionStorage.setItem('hasVisited', 'true')
          }
        } else {
          const response = await fetch('/api/site-visits')
          if (response.ok) {
            const data = await response.json()
            setVisitCount(data.count)
          }
        }
      } catch (error) {
        console.error('Error tracking visit:', error)
      }
    }

    trackVisit()
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
            © {new Date().getFullYear()} VeryGoodMelon.Fun · Built by{' '}
            <a href="https://shak-tech.com" target="_blank" rel="noopener" className="underline hover:text-foreground transition-colors">
              ShakTech Labs
            </a>
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/privacy"
              className="text-xs text-primary-light hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <span className="text-foreground/20" aria-hidden="true">|</span>
            <Link
              href="/terms"
              className="text-xs text-primary-light hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <span className="text-foreground/20" aria-hidden="true">|</span>
            <Link
              href="/analytics"
              className="text-xs text-primary-light hover:text-foreground transition-colors"
            >
              Analytics
            </Link>
            <span className="text-foreground/20 sm:hidden" aria-hidden="true">|</span>
            <button
              type="button"
              onClick={openFeedback}
              className="sm:hidden text-xs text-primary-light hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              Feedback
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
