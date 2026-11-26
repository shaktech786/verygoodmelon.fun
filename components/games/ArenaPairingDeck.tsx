'use client'

import { useRef } from 'react'
import { ARENA_VOICE_COLOURS, EMBLEM_ROWS, PAIRINGS, deckStep, type EmblemId } from '@/lib/games/arena-pairings'
import { Icon } from '@/components/seedpress/icons/Icon'

const { light, dark } = ARENA_VOICE_COLOURS

/** The two speakers' colours, told apart by more than hue too: side, name, and a round or a diamond marker. */
export const ARENA_VOICES_CSS = `
.arena-voices { --voice-a: ${light.a}; --voice-b: ${light.b}; }
html[data-theme="dark"] .arena-voices { --voice-a: ${dark.a}; --voice-b: ${dark.b}; }
@media (prefers-color-scheme: dark) {
  html[data-theme="auto"] .arena-voices { --voice-a: ${dark.a}; --voice-b: ${dark.b}; }
}
`

export const VOICE = { a: 'var(--voice-a)', b: 'var(--voice-b)' } as const
export const voiceTint = (voice: string, percent: number) => `color-mix(in srgb, ${voice} ${percent}%, var(--card-bg))`

/** A round marker for the first voice and a diamond for the second, so the sides never rest on colour alone. */
export function VoiceMarker({ second, className = '' }: { second: boolean; className?: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 shrink-0 ${second ? 'rotate-45 rounded-[1px]' : 'rounded-full'} ${className}`}
      style={{ background: second ? VOICE.b : VOICE.a }}
      aria-hidden="true"
    />
  )
}


function emblemPath(rows: readonly string[]): string {
  return rows
    .flatMap((row, y) => Array.from(row, (cell, x) => (cell === 'X' ? `M${x} ${y}h1v1h-1z` : '')))
    .join('')
}

const EMBLEM_PATHS = Object.fromEntries(
  Object.entries(EMBLEM_ROWS).map(([id, rows]) => [id, emblemPath(rows)])
) as Record<EmblemId, string>

export function Emblem({ id, color, className = 'w-8 h-8' }: { id: EmblemId; color: string; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" shapeRendering="crispEdges" className={className} data-emblem={id} aria-hidden="true">
      <path d={EMBLEM_PATHS[id]} fill={color} />
    </svg>
  )
}

const CARD = `
  relative shrink-0 snap-start flex flex-col w-[9.5rem] sm:w-auto text-left rounded-2xl border-2 bg-card-bg
  border-card-border hover:border-foreground/25
  aria-pressed:border-chosen-line aria-pressed:bg-chosen
  transition-colors duration-150
  focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
`

/** Index of the "write your own" card, which always comes last. */
export const OWN_CARD = PAIRINGS.length

interface PairingDeckProps {
  /** A pairing's index, OWN_CARD for "write your own", or null before anything is picked */
  selected: number | null
  onPick: (index: number) => void
  onWriteOwn: () => void
}

/** Every ready-made pairing as a small illustrated card, with "Write your own" as the last card. */
export function PairingDeck({ selected, onPick, onWriteOwn }: PairingDeckProps) {
  const deckRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const cards = Array.from(deckRef.current?.querySelectorAll<HTMLButtonElement>('[data-deck-card]') ?? [])
    const index = cards.indexOf(document.activeElement as HTMLButtonElement)
    if (index === -1) return
    const columns = cards.filter((card) => card.offsetTop === cards[0].offsetTop).length
    const next = deckStep(index, e.key, cards.length, columns)
    if (next === null) return
    e.preventDefault()
    cards[next].focus()
  }

  return (
    <div
      ref={deckRef}
      role="group"
      aria-label="Pairings"
      onKeyDown={handleKeyDown}
      className="
        -mx-4 px-4 pt-1 pb-3 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4
        sm:mx-0 sm:px-0 sm:pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible
      "
    >
      {PAIRINGS.map((pairing, index) => {
        const chosen = selected === index
        return (
          <button
            key={pairing.topic}
            type="button"
            data-deck-card
            aria-pressed={chosen}
            aria-label={`${pairing.first} and ${pairing.second}: ${pairing.topic}`}
            onClick={() => onPick(index)}
            className={CARD}
          >
            <span
              className="flex items-center justify-center gap-2 h-16 rounded-t-[0.9rem] border-b border-card-border"
              style={{ background: `linear-gradient(90deg, ${voiceTint(VOICE.a, 14)} 50%, ${voiceTint(VOICE.b, 14)} 50%)` }}
              aria-hidden="true"
            >
              <Emblem id={pairing.emblems[0]} color={VOICE.a} />
              <span className="text-sm font-semibold text-foreground/60">&amp;</span>
              <Emblem id={pairing.emblems[1]} color={VOICE.b} />
            </span>
            <span className="block px-3 pt-2.5 pb-3" aria-hidden="true">
              <span className="block text-sm font-semibold text-foreground leading-snug">
                {pairing.first} <span className="font-normal text-foreground/70">&amp;</span> {pairing.second}
              </span>
              <span className="mt-1 block text-[13px] text-foreground/75 leading-snug">{pairing.topic}</span>
            </span>
            {chosen && (
              <span
                className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-chosen-line text-background"
                aria-hidden="true"
              >
                <Icon name="done" size={16} />
              </span>
            )}
          </button>
        )
      })}

      <button
        type="button"
        data-deck-card
        aria-pressed={selected === OWN_CARD}
        onClick={onWriteOwn}
        className={`${CARD} border-dashed sm:col-span-full flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 px-3 py-4 text-center`}
      >
        <Icon name="pen" size={24} className="text-melon-green" />
        <span className="text-sm font-semibold text-foreground">Write your own</span>
        <span className="text-[13px] text-foreground/75">any two minds, real or imagined</span>
        {selected === OWN_CARD && (
          <span
            className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-chosen-line text-background"
            aria-hidden="true"
          >
            <Icon name="done" size={16} />
          </span>
        )}
      </button>
    </div>
  )
}
