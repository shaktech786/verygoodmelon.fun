'use client'

import { InkLink } from '@/components/seedpress/Link'
import { DIRECTORY_LINE } from '@/lib/care/helplines'
import { type ReactNode, useEffect, useRef } from 'react'
import type { Capsule, Outcome, Tally } from '@/lib/games/worry-capsule/capsules'
import { tallyReflection, tallySummary } from '@/lib/games/worry-capsule/copy'
import { type DateKey, dateKeyToNoonUtc, localDateKey } from '@/lib/games/worry-capsule/dates'
import { cn } from '@/lib/utils/cn'
import styles from './Keeper.module.css'

export function formatDay(key: DateKey, todayKey: DateKey, style: 'long' | 'short' = 'long'): string {
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4)
  return new Intl.DateTimeFormat(undefined, {
    timeZone: 'UTC',
    weekday: style === 'long' ? 'long' : undefined,
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: sameYear ? undefined : 'numeric',
  }).format(dateKeyToNoonUtc(key))
}

export function sealedDay(capsule: Capsule, todayKey: DateKey, style: 'long' | 'short' = 'long'): string {
  return formatDay(localDateKey(new Date(capsule.sealedAt)), todayKey, style)
}

export function ViewHeading({ focus, children, className }: { focus: boolean; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const heading = ref.current
    if (!focus || !heading) return
    heading.focus()
    // Focus only scrolls when the heading is off screen, and one tucked under the sticky header still counts as on screen
    const headerBottom = document.querySelector('header[role="banner"]')?.getBoundingClientRect().bottom ?? 0
    if (heading.getBoundingClientRect().top < headerBottom) heading.scrollIntoView({ block: 'start' })
  }, [focus])
  return (
    <h2
      ref={ref}
      tabIndex={-1}
      className={cn('sp-h3 focus:outline-none scroll-mt-24', className)}
    >
      {children}
    </h2>
  )
}

export function Slip({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <figure className={cn('m-0 rounded-lg px-4 py-3 sm:px-5 text-left', styles.slip, className)}>
      {label && <figcaption className="sr-only">{label}</figcaption>}
      <blockquote className="m-0 whitespace-pre-wrap">{children}</blockquote>
    </figure>
  )
}

export function HelpLine() {
  return (
    <p className="sp-soft m-0 text-left">
      If a worry feels too heavy to hold alone, <InkLink href={DIRECTORY_LINE.href}>{DIRECTORY_LINE.label}</InkLink>{' '}
      lists free, confidential support near you, at any hour.
    </p>
  )
}

/** Didn’t happen: an open circle. Partly: a half-filled diamond. Happened: a square. Drawn in a 12x12 box. */
export function OutcomeShape({ outcome }: { outcome: Outcome }) {
  return (
    <>
      {outcome === 'no' && <circle cx="6" cy="6" r="4.6" className={styles.markNo} strokeWidth="1.6" />}
      {outcome === 'partly' && (
        <>
          <path d="M6 6 H10.9 L6 10.9 L1.1 6 Z" className={styles.markPartlyFill} />
          <path d="M6 1.1 L10.9 6 L6 10.9 L1.1 6 Z" className={styles.markPartly} strokeWidth="1.6" strokeLinejoin="round" />
        </>
      )}
      {outcome === 'yes' && <rect x="1.8" y="1.8" width="8.4" height="8.4" rx="1" className={styles.markYes} strokeWidth="1.6" />}
    </>
  )
}

export function OutcomeMark({ outcome, className }: { outcome: Outcome; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={cn('w-3 h-3 shrink-0', className)} aria-hidden="true" focusable="false">
      <OutcomeShape outcome={outcome} />
    </svg>
  )
}

export const OUTCOME_WORDS: Record<Outcome, string> = {
  no: 'Didn’t happen',
  partly: 'Partly happened',
  yes: 'Happened',
}

const MAX_MARKS = 60

export function TallyCard({ counts, opened }: { counts: Tally; opened: Capsule[] }) {
  const reflection = tallyReflection(counts)
  const oldestFirst = [...opened].reverse()
  const shown = oldestFirst.slice(-MAX_MARKS)
  return (
    <section aria-labelledby="keeper-tally" className="sp-sheet grid gap-3 text-left">
      <h3 id="keeper-tally" className="sp-h3 m-0">How they turned out</h3>
      <div className="flex flex-wrap gap-1.5" aria-hidden="true">
        {oldestFirst.length > shown.length && (
          // Older marks trail off rather than being tallied
          <span className="mr-0.5 text-sm leading-none text-ink-soft">…</span>
        )}
        {shown.map((capsule) => capsule.opening && <OutcomeMark key={capsule.id} outcome={capsule.opening.outcome} className="w-4 h-4" />)}
      </div>
      <p className="m-0">{tallySummary(counts)}</p>
      {reflection && <p className="m-0 text-ink-soft">{reflection}</p>}
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-ink-soft" aria-hidden="true">
        {(['no', 'partly', 'yes'] as const).map((outcome) => (
          <li key={outcome} className="flex items-center gap-1.5">
            <OutcomeMark outcome={outcome} />
            {OUTCOME_WORDS[outcome]}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function saveTextFile(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoking straight away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
