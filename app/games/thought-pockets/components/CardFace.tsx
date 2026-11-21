'use client'

import { useRef } from 'react'
import { CardDef, CardType } from '@/types/thought-pockets'
import { TYPE_LABELS, describeCard } from '@/lib/games/thought-pockets/data/cards'
import { KEYWORDS, Keyword } from '@/lib/games/thought-pockets/data/keywords'
import { TypeGlyph } from './Glyphs'

export const TYPE_COLORS: Record<CardType, string> = {
  evidence: '#2f6b4f',
  logic: '#8a5410',
  guard: '#2f5378',
  rhetoric: '#66437a',
  doubt: '#7a3434',
}

const LONG_PRESS_MS = 450

function emphasise(line: string): React.ReactNode[] {
  return line.split(/(\b(?:Weight|Multiplier|Guard|Focus|Resolve|Unsettle|Pierce|Postpone|Doubt|Conclusion)\b)/).map((part, i) =>
    part in KEYWORDS ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
  )
}

interface CardFaceProps {
  card: CardDef
  cost?: number
  hotkey?: number
  disabled?: boolean
  selected?: boolean
  compact?: boolean
  label?: string
  onActivate?: () => void
  onInspect?: () => void
}

/** A card as parchment: type band with glyph and word, cost in Focus, the full rules text. */
export function CardFace({ card, cost = card.cost, hotkey, disabled, selected, compact, label, onActivate, onInspect }: CardFaceProps) {
  const timer = useRef<number | null>(null)
  const longPressed = useRef(false)
  const lines = describeCard(card)
  const color = TYPE_COLORS[card.type]
  const discounted = cost < card.cost
  const unplayable = card.type === 'doubt'

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
      aria-pressed={selected}
      aria-label={label ?? `${card.name}. ${TYPE_LABELS[card.type]}, costs ${cost} Focus. ${lines.join(' ')}`}
      className={`relative flex flex-col overflow-hidden rounded-lg border-2 bg-[var(--tp-paper)] text-left text-[var(--tp-paper-ink)] shadow-md motion-safe:transition-transform motion-safe:duration-75 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-accent)] ${
        compact ? 'w-[6.9rem] min-h-[9.5rem] sm:w-[7.25rem]' : 'w-[6.9rem] min-h-[10rem] sm:min-h-[11rem] sm:w-36'
      } ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer motion-safe:hover:-translate-y-1'} ${
        selected ? 'ring-4 ring-[var(--tp-accent)]' : ''
      }`}
      style={{ borderColor: color }}
    >
      <span className="flex items-center gap-1.5 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white" style={{ backgroundColor: color }}>
        <TypeGlyph type={card.type} className="h-4 w-4 shrink-0" />
        <span className="flex-1">{TYPE_LABELS[card.type]}</span>
        {!unplayable && (
          <span
            className={`flex h-6 min-w-6 items-center justify-center rounded-full border border-white/80 px-1 text-sm font-bold ${discounted ? 'bg-white text-[var(--tp-paper-ink)]' : ''}`}
            title={`Costs ${cost} Focus`}
          >
            {cost}
          </span>
        )}
      </span>
      <span className="px-2 pt-1.5 font-serif text-[0.95rem] font-semibold leading-tight">{card.name}</span>
      <span className="flex-1 space-y-0.5 px-2 pt-1 text-[0.78rem] leading-snug">
        {lines.map((line) => (
          <span key={line} className="block">
            {emphasise(line)}
          </span>
        ))}
      </span>
      {!compact && <span className="hidden px-2 pb-1 pt-1 text-[0.68rem] italic leading-snug text-[#5a4c3a] sm:block">{card.flavor}</span>}
      {hotkey !== undefined && (
        <span className="absolute bottom-1 right-1.5 text-[0.68rem] font-semibold text-[#5a4c3a]" aria-hidden="true">
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
