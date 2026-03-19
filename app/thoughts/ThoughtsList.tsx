'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Thought } from '@/lib/thoughts/thoughts-data'
import { FreshThought } from './FreshThought'

const THEME_LABELS: Record<Thought['theme'], string> = {
  patience: 'Patience',
  wonder: 'Wonder',
  impermanence: 'Impermanence',
  creativity: 'Creativity',
  rest: 'Rest',
  connection: 'Connection',
  perspective: 'Perspective',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function truncate(text: string, maxLength: number): string {
  const firstParagraph = text.split('\n\n')[0]
  if (firstParagraph.length <= maxLength) return firstParagraph
  return firstParagraph.slice(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

interface ThoughtsListProps {
  thoughts: Thought[]
}

export function ThoughtsList({ thoughts }: ThoughtsListProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  return (
    <div className="space-y-6" role="feed" aria-label="Thoughts">
      {/* Fresh thought from AI — appears at the top when available */}
      <FreshThought mounted={mounted} />

      {thoughts.map((thought, index) => (
        <article
          key={thought.id}
          className={`
            group block
            transition-all duration-700 ease-out
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
          `}
          style={{
            transitionDelay: mounted ? `${100 + index * 80}ms` : '0ms',
          }}
          aria-labelledby={`thought-title-${thought.id}`}
        >
          <Link
            href={`/thoughts/${thought.slug}`}
            className="block bg-card-bg border border-card-border rounded-lg p-6 hover:border-accent/30 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
          >
            {/* Meta row */}
            <div className="flex items-center gap-3 mb-3 text-sm">
              <span className="inline-block bg-accent/10 text-accent px-2.5 py-0.5 rounded-full text-xs font-medium">
                {THEME_LABELS[thought.theme]}
              </span>
              <time
                dateTime={thought.createdAt}
                className="text-primary-light/60"
              >
                {formatDate(thought.createdAt)}
              </time>
            </div>

            {/* Title */}
            <h2
              id={`thought-title-${thought.id}`}
              className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors"
            >
              {thought.title}
            </h2>

            {/* Preview */}
            <p className="text-foreground/70 text-sm leading-relaxed">
              {truncate(thought.body, 120)}
            </p>
          </Link>
        </article>
      ))}
    </div>
  )
}
