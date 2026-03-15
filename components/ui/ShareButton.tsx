'use client'

import { useCallback, useState } from 'react'
import { Share2 } from 'lucide-react'

interface ShareButtonProps {
  title: string
  text: string
  url: string
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const [showFeedback, setShowFeedback] = useState(false)

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch (err) {
        // User cancelled share dialog - not an error
        if (err instanceof Error && err.name === 'AbortError') return
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShowFeedback(true)
        setTimeout(() => setShowFeedback(false), 2000)
      } catch {
        // Clipboard API unavailable - silent fail
      }
    }
  }, [title, text, url])

  return (
    <div className="relative inline-flex">
      <button
        onClick={handleShare}
        aria-label="Share this game"
        className="
          p-2 rounded-lg
          text-foreground/50 hover:text-foreground/80
          hover:bg-foreground/5
          transition-colors duration-75
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
        "
      >
        <Share2 size={18} aria-hidden="true" />
      </button>

      {showFeedback && (
        <span
          role="status"
          aria-live="polite"
          className="
            absolute -bottom-8 left-1/2 -translate-x-1/2
            text-xs text-foreground/70 bg-card-bg border border-card-border
            px-2 py-1 rounded whitespace-nowrap
            animate-fade
          "
        >
          Link copied
        </span>
      )}
    </div>
  )
}
