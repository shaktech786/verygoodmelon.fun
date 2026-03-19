'use client'

import { useEffect, useState } from 'react'

interface FreshThoughtData {
  title: string
  body: string
  theme: string
}

const THEME_LABELS: Record<string, string> = {
  patience: 'Patience',
  wonder: 'Wonder',
  impermanence: 'Impermanence',
  creativity: 'Creativity',
  rest: 'Rest',
  connection: 'Connection',
  perspective: 'Perspective',
}

function truncate(text: string, maxLength: number): string {
  const firstParagraph = text.split('\n\n')[0]
  if (firstParagraph.length <= maxLength) return firstParagraph
  return firstParagraph.slice(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

interface FreshThoughtProps {
  mounted: boolean
}

/**
 * Fetches and displays a fresh AI-generated thought at the top of the list.
 * Gracefully hidden if the API is unavailable.
 */
export function FreshThought({ mounted }: FreshThoughtProps) {
  const [fresh, setFresh] = useState<FreshThoughtData | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchFresh() {
      try {
        const res = await fetch('/api/thoughts/fresh')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data.thought) {
          setFresh(data.thought)
        }
      } catch {
        // Silently fail — the page works fine without this
      }
    }

    fetchFresh()
    return () => {
      cancelled = true
    }
  }, [])

  if (!fresh) return null

  return (
    <article
      className={`
        block
        transition-all duration-700 ease-out
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
      `}
      aria-label="Fresh thought"
    >
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3 text-sm">
          <span className="inline-block bg-accent/10 text-accent px-2.5 py-0.5 rounded-full text-xs font-medium">
            {THEME_LABELS[fresh.theme] || fresh.theme}
          </span>
          <span className="text-primary-light/60 text-xs">Fresh today</span>
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {fresh.title}
        </h2>

        {/* Preview */}
        <p className="text-foreground/70 text-sm leading-relaxed">
          {truncate(fresh.body, 160)}
        </p>
      </div>
    </article>
  )
}
