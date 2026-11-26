'use client'

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
      className={cn('text-xl sm:text-2xl font-semibold text-foreground focus:outline-none scroll-mt-24', className)}
    >
      {children}
    </h2>
  )
}

export function Slip({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <figure className={cn('rounded-md px-4 py-3 sm:px-5 text-left shadow-sm', styles.slip, className)}>
      {label && <figcaption className="sr-only">{label}</figcaption>}
      <blockquote className="text-base sm:text-lg text-foreground whitespace-pre-wrap">{children}</blockquote>
    </figure>
  )
}

const link = 'underline underline-offset-2 text-foreground hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm'

export function HelpLine() {
  return (
    <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">
      If a worry feels too heavy to hold alone,{' '}
      <a href={DIRECTORY_LINE.href} target="_blank" rel="noopener noreferrer" className={link}>
        {DIRECTORY_LINE.label}
      </a>{' '}
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
    <section aria-labelledby="keeper-tally" className="rounded-lg border border-card-border bg-card-bg p-5 text-left">
      <h3 id="keeper-tally" className="text-base font-semibold text-foreground mb-3">How they turned out</h3>
      <div className="flex flex-wrap gap-1.5 mb-3" aria-hidden="true">
        {oldestFirst.length > shown.length && (
          // Older marks trail off rather than being tallied
          <span className="text-sm leading-none text-foreground/70 mr-0.5">…</span>
        )}
        {shown.map((capsule) => capsule.opening && <OutcomeMark key={capsule.id} outcome={capsule.opening.outcome} className="w-4 h-4" />)}
      </div>
      <p className="text-sm sm:text-base text-foreground">{tallySummary(counts)}</p>
      {reflection && <p className="mt-1 text-sm sm:text-base text-foreground/80 italic">{reflection}</p>}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70" aria-hidden="true">
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
