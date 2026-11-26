'use client'

import { useId, useRef, useState } from 'react'
import { Keyword, keywordText } from '@/lib/games/thought-pockets/data/keywords'
import { LESSONS, Lesson } from '@/lib/games/thought-pockets/engine/lessons'
import { useRunStore } from '@/lib/games/thought-pockets/store/runStore'

/** A keyword you can hover, focus or tap to have explained. */
/** Space kept between a tooltip and the edge of the screen. */
const EDGE = 8

export function Term({ word, children }: { word: Keyword; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const tip = useRef<HTMLSpanElement>(null)
  const id = useId()
  const school = useRunStore((s) => s.run?.school ?? null)

  // Centred over a word near the edge, the tip would hang off the screen: slide it back in
  const place = () => {
    const el = tip.current
    if (!el) return
    el.style.display = 'block'
    el.style.translate = '-50% 0'
    const box = el.getBoundingClientRect()
    el.style.display = ''
    el.style.translate = ''
    const width = document.documentElement.clientWidth
    setShift(box.right > width - EDGE ? width - EDGE - box.right : box.left < EDGE ? EDGE - box.left : 0)
  }

  return (
    <span className="group relative inline-block" onPointerEnter={place} onFocus={place}>
      <button
        type="button"
        className="cursor-help font-semibold underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-mark)]"
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => {
          place()
          setOpen((value) => !value)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        {children ?? word}
      </button>
      {/* Hidden, it takes no room; it wraps even inside a line that does not, so it never widens the page */}
      <span
        ref={tip}
        role="tooltip"
        id={id}
        style={{ translate: `calc(-50% + ${shift}px) 0` }}
        className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 max-w-[calc(100vw-1rem)] rounded-stamp border border-[var(--tp-line)] bg-[var(--tp-ink)] px-3 py-2 whitespace-normal text-left text-meta font-normal leading-snug text-[var(--tp-text)] tp-edge group-hover:block group-focus-within:block ${open ? 'block' : 'hidden'}`}
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
