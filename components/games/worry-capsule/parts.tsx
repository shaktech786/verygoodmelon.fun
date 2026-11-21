'use client'

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
    if (focus) ref.current?.focus()
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

const link = 'underline underline-offset-2 text-foreground hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm'

export function HelpLine() {
  return (
    <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">
      If a worry feels too heavy to hold alone,{' '}
      <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className={link}>
        findahelpline.com
      </a>{' '}
      lists free, confidential support near you, at any hour.
    </p>
  )
}

export function OutcomeMark({ outcome, className }: { outcome: Outcome; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={cn('w-3 h-3 shrink-0', className)} aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {outcome === 'no' && <rect x="1.5" y="1.5" width="9" height="9" className="fill-none stroke-melon-green" strokeWidth="2" />}
      {outcome === 'partly' && (
        <>
          <rect x="1.5" y="1.5" width="9" height="9" className="fill-none stroke-warm" strokeWidth="2" />
          <rect x="1" y="6" width="10" height="5" className="fill-warm" />
        </>
      )}
      {outcome === 'yes' && <rect x="1" y="1" width="10" height="10" className="fill-foreground/70" />}
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
          <span className="text-xs text-foreground/70 mr-1">+{oldestFirst.length - shown.length}</span>
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
