'use client'

import { useId, useState } from 'react'
import { Keyword, keywordText } from '@/lib/games/thought-pockets/data/keywords'
import { LESSONS, Lesson } from '@/lib/games/thought-pockets/engine/lessons'
import { useRunStore } from '@/lib/games/thought-pockets/store/runStore'

/** A keyword you can hover, focus or tap to have explained. */
export function Term({ word, children }: { word: Keyword; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const school = useRunStore((s) => s.run?.school ?? null)
  return (
    <span className="group relative inline-block">
      <button
        type="button"
        className="cursor-help font-semibold underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-mark)]"
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        {children ?? word}
      </button>
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-stamp border border-[var(--tp-line)] bg-[var(--tp-ink)] px-3 py-2 text-left text-meta font-normal leading-snug text-[var(--tp-text)] tp-edge group-hover:visible group-focus-within:visible ${open ? 'visible' : 'invisible'}`}
      >
        <strong className="text-[var(--tp-mark)]">{word}.</strong> {keywordText(word, school)}
      </span>
    </span>
  )
}

/** A new idea, explained in one plain line the first time it comes up. */
export function LessonNote({ lesson, className = '' }: { lesson: Lesson; className?: string }) {
  return (
    <p className={`rounded-stamp border border-dashed border-[var(--tp-good)] bg-[var(--tp-ink)] px-3 py-1.5 text-meta text-[var(--tp-text)] ${className}`} data-testid="lesson">
      <strong>New: {LESSONS[lesson].term}.</strong> {LESSONS[lesson].line}
    </p>
  )
}
