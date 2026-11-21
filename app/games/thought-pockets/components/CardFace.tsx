'use client'

import { useRef } from 'react'
import { CardDef, CardType } from '@/types/thought-pockets'
import { TYPE_LABELS, describeCard, summarizeCard } from '@/lib/games/thought-pockets/data/cards'
import { getSchoolDef } from '@/lib/games/thought-pockets/data/schools'
import { KEYWORDS, Keyword } from '@/lib/games/thought-pockets/data/keywords'
import { TypeGlyph } from './Glyphs'

export const TYPE_COLORS: Record<CardType, string> = {
  evidence: 'var(--tp-evidence)',
  logic: 'var(--tp-logic)',
  guard: 'var(--tp-guard-type)',
  rhetoric: 'var(--tp-rhetoric)',
  doubt: 'var(--tp-doubt)',
}

const LONG_PRESS_MS = 450

function emphasise(line: string): React.ReactNode[] {
  return line.split(/(\b(?:Weight|Multiplier|Guard|Focus|Resolve|Unsettle|Pierce|Postpone|Doubt|Conclusion|Keep|Once)\b)/).map((part, i) =>
    part in KEYWORDS ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
  )
}

interface CardFaceProps {
  card: CardDef
  /** Set when a discount makes this card free right now, e.g. the Rationalist's first Logic. */
  freeNote?: string
  hotkey?: number
  disabled?: boolean
  /** In the hand, a phone shows a few words per effect so five cards and the intent fit on one screen. */
  size?: 'hand' | 'full' | 'compact'
  label?: string
  /** On an offered card: what it fits in the deck you have, "Fits your Cash Value". */
  fits?: string | null
  onActivate?: () => void
  onInspect?: () => void
}

/** A card as a note card: type band with glyph and word, cost in Focus, the full rules text. */
export function CardFace({ card, freeNote, hotkey, disabled, size = 'full', label, fits, onActivate, onInspect }: CardFaceProps) {
  const timer = useRef<number | null>(null)
  const longPressed = useRef(false)
  const lines = describeCard(card)
  const summary = summarizeCard(card)
  const hand = size === 'hand'
  const color = TYPE_COLORS[card.type]
  const unplayable = card.type === 'doubt'
  const school = card.school ? getSchoolDef(card.school).name : null

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false
          return
        }
        onActivate?.()
      }}
      onPointerDown={(event) => {
        if (!onInspect || event.pointerType === 'mouse') return
        longPressed.current = false
        timer.current = window.setTimeout(() => {
          longPressed.current = true
          onInspect()
        }, LONG_PRESS_MS)
      }}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onContextMenu={(event) => {
        if (!onInspect) return
        event.preventDefault()
        onInspect()
      }}
      onFocus={onInspect}
      onMouseEnter={onInspect}
      aria-disabled={disabled || undefined}
      aria-label={`${
        label ??
        `${card.name}. ${TYPE_LABELS[card.type]}${school ? `, ${school} card` : ''}${card.rarity === 'rare' ? ', rare' : ''}${unplayable ? '' : `, costs ${card.cost} Focus${freeNote ? `, ${freeNote.toLowerCase()}` : ''}`}. ${lines.join(' ')}`
      }${fits ? `. ${fits}` : ''}`}
      className={`relative flex flex-col overflow-hidden rounded-md border-2 bg-[var(--tp-paper)] text-left text-[var(--tp-paper-ink)] shadow-[3px_3px_0_0_var(--tp-shadow)] motion-safe:transition-transform motion-safe:duration-75 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)] ${
        hand
          ? 'w-full min-h-[5.75rem] sm:w-36 sm:min-h-[9.75rem]'
          : size === 'compact'
            ? 'w-[6.75rem] min-h-[8.75rem] sm:w-[7.25rem] sm:min-h-[9.5rem]'
            : 'w-[6.75rem] min-h-[8.75rem] sm:min-h-[11rem] sm:w-36'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer motion-safe:hover:-translate-y-1'}`}
      style={{ borderColor: color }}
    >
      <span
        className="flex items-center gap-1 px-1.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wide sm:gap-1.5 sm:px-2"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 28%, var(--tp-paper))` }}
      >
        <TypeGlyph type={card.type} className="h-4 w-4 shrink-0" />
        <span className="flex-1">{TYPE_LABELS[card.type]}</span>
        {!unplayable && (
          <span
            className="flex h-6 min-w-6 items-center justify-center rounded-sm border-2 px-1 text-sm font-bold"
            style={{ borderColor: color }}
            aria-hidden="true"
          >
            {card.cost}
          </span>
        )}
      </span>
      <span className={`hyphens-auto px-1.5 pt-1 font-serif font-semibold leading-tight sm:px-2 sm:text-[0.95rem] ${hand ? 'text-[0.82rem]' : 'text-[0.9rem]'}`} lang="en">
        {card.name}
      </span>
      {!hand && (school || card.rarity === 'rare') && (
        <span className="px-1.5 text-[0.66rem] font-semibold uppercase tracking-wide text-[var(--tp-paper-muted)] sm:px-2" aria-hidden="true" data-testid="card-school">
          {[school, card.rarity === 'rare' ? 'Rare' : null].filter(Boolean).join(' · ')}
        </span>
      )}
      {fits && (
        <span
          className="mx-1.5 mt-1 self-start rounded-sm border border-[var(--tp-good)] px-1 text-[0.66rem] font-semibold leading-tight text-[var(--tp-good)] sm:mx-2"
          aria-hidden="true"
          data-testid="card-fits"
        >
          {fits}
        </span>
      )}
      {freeNote && (
        <span className="mx-1.5 mt-1 self-start rounded-sm bg-[var(--tp-accent)] px-1 text-[0.66rem] font-semibold text-[var(--tp-on-accent)] sm:mx-2" aria-hidden="true">
          {freeNote}
        </span>
      )}
      {hand && (
        <span className="flex-1 px-1.5 pb-1 pt-0.5 text-[0.74rem] font-semibold leading-snug sm:hidden" aria-hidden="true">
          {summary.join(' · ')}
        </span>
      )}
      <span className={`flex-1 space-y-0.5 px-1.5 pt-1 text-[0.74rem] leading-snug sm:px-2 sm:text-[0.78rem] ${hand ? 'hidden sm:block' : ''}`}>
        {lines.map((line) => (
          <span key={line} className="block">
            {emphasise(line)}
          </span>
        ))}
      </span>
      {size !== 'compact' && <span className="hidden px-2 pb-1 pt-1 text-[0.68rem] italic leading-snug text-[var(--tp-paper-muted)] sm:block">{card.flavor}</span>}
      {hotkey !== undefined && (
        <span className="absolute bottom-1 right-1.5 hidden text-[0.68rem] font-semibold text-[var(--tp-paper-muted)] sm:block" aria-hidden="true">
          {hotkey}
        </span>
      )}
    </button>
  )
}

export function keywordsOnCard(card: CardDef): Keyword[] {
  const text = describeCard(card).join(' ')
  return (Object.keys(KEYWORDS) as Keyword[]).filter((word) => text.includes(word))
}
