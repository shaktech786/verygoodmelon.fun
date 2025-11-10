'use client'

import { useEffect, useState } from 'react'

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
            <p className="text-xs text-foreground/40">
              <span className="font-mono">{visitCount.toLocaleString()}</span> visits and counting
            </p>
          )}
          <p className="text-primary-light">Made with purpose. Every pixel has meaning.</p>
          <p className="text-primary-light">© {new Date().getFullYear()} VeryGoodMelon.Fun</p>
        </div>
      </div>
    </footer>
  )
}
