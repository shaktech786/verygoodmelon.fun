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

const PREVIEW_LENGTH = 160

function preview(text: string): string {
  const firstParagraph = text.split('\n\n')[0].trim()
  if (firstParagraph.length <= PREVIEW_LENGTH) return firstParagraph
  return firstParagraph.slice(0, PREVIEW_LENGTH).replace(/\s+\S*$/, '') + '…'
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
  const [open, setOpen] = useState(false)

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

  const paragraphs = fresh.body.split('\n\n').map(paragraph => paragraph.trim()).filter(Boolean)
  const short = preview(fresh.body)
  const hasMore = short !== fresh.body.trim()

  return (
    <article
      className={`
        block
        transition-all duration-700 ease-out
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
      `}
      aria-label="Fresh thought"
    >
      <div className="bg-rind-wash border border-rule-strong rounded-lg p-6">
        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3 text-sm">
          <span className="inline-block bg-rind-wash text-foreground px-2.5 py-0.5 rounded-full text-xs font-medium">
            {THEME_LABELS[fresh.theme] || fresh.theme}
          </span>
          <span className="text-primary-light text-xs">Fresh today</span>
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {fresh.title}
        </h2>

        <div id="fresh-thought-body" className="space-y-3">
          {open
            ? paragraphs.map((paragraph, index) => (
                <p key={index} className="text-foreground/80 text-sm leading-relaxed">{paragraph}</p>
              ))
            : <p className="text-foreground/75 text-sm leading-relaxed">{short}</p>}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="fresh-thought-body"
            className="mt-2 min-h-[44px] px-1 text-sm font-medium text-foreground underline underline-offset-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {open ? 'Show less' : 'Read the whole thought'}
          </button>
        )}
      </div>
    </article>
  )
}
