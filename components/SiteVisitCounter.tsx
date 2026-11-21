'use client'

import { useEffect, useState } from 'react'

export default function SiteVisitCounter() {
  const [visitCount, setVisitCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const trackVisit = async () => {
      try {
        // Check if this is a new visit (not counted in this session)
        const hasVisited = sessionStorage.getItem('hasVisited')

        if (!hasVisited) {
          // Record the visit
          const response = await fetch('/api/site-visits', {
            method: 'POST'
          })

          if (response.ok) {
            const data = await response.json()
            setVisitCount(data.count)
            sessionStorage.setItem('hasVisited', 'true')
          }
        } else {
          // Just get the count
          const response = await fetch('/api/site-visits')
          if (response.ok) {
            const data = await response.json()
            setVisitCount(data.count)
          }
        }
      } catch (error) {
        console.error('Error tracking visit:', error)
      } finally {
        setLoading(false)
      }
    }

    trackVisit()
  }, [])

  if (loading || visitCount === null) {
    return null
  }

  return (
    <div className="text-center py-4">
      <p className="text-sm text-primary-light">
        <span className="font-mono">{visitCount.toLocaleString()}</span> visits and counting
      </p>
    </div>
  )
}
