'use client'

import { useEffect, useState } from 'react'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { THEME_LABELS } from '@/lib/thoughts/thoughts-data'

interface FreshThoughtData {
  title: string
  body: string
  theme: string
}

const PREVIEW_LENGTH = 160

function preview(text: string): string {
  const firstParagraph = text.split('\n\n')[0].trim()
  if (firstParagraph.length <= PREVIEW_LENGTH) return firstParagraph
  return firstParagraph.slice(0, PREVIEW_LENGTH).replace(/\s+\S*$/, '') + '…'
}

/**
 * Fetches and displays a fresh generated thought at the top of the list.
 * Quietly absent if it can't be fetched.
 */
export function FreshThought() {
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
        // The page works fine without it
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
    <article className="sp-flap sp-flap--fresh" aria-label="Fresh thought">
      <div className="sp-flap__top">
        <span>{THEME_LABELS[fresh.theme as keyof typeof THEME_LABELS] ?? fresh.theme}</span>
        <span>Fresh today</span>
      </div>
      <div className="sp-flap__body">
        <h2 className="sp-flap__title">{fresh.title}</h2>
        <div id="fresh-thought-body" className="sp-flap__full">
          {open ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>{short}</p>}
        </div>
        {hasMore && (
          <div>
            <QuietButton onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="fresh-thought-body">
              {open ? 'Show less' : 'Read the whole thought'}
            </QuietButton>
          </div>
        )}
      </div>
    </article>
  )
}
