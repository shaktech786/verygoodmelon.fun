'use client'

import { useRef } from 'react'
import { EMBLEM_ROWS, PAIRINGS, deckStep, type EmblemId } from '@/lib/games/arena-pairings'
import { Icon } from '@/components/seedpress/icons/Icon'
import { cn } from '@/lib/utils/cn'
import styles from './Arena.module.css'

/** The two speakers' colours, set on the Arena's root by Arena.module.css: voiceA is dusk and voiceB is clay. */
export const VOICE = { a: 'var(--voice-a)', b: 'var(--voice-b)' } as const
export const voiceTint = (voice: string, percent: number) => `color-mix(in oklab, ${voice} ${percent}%, var(--sheet))`

/** A round marker for the first voice and a diamond for the second, so the sides never rest on colour alone. */
export function VoiceMarker({ second, className = '' }: { second: boolean; className?: string }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 shrink-0 ${second ? 'rotate-45 rounded-[1px]' : 'rounded-full'} ${className}`}
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
      className={`${styles.deck} pt-3 pb-4 flex gap-3 overflow-x-auto snap-x snap-mandatory sm:pb-2 sm:grid sm:grid-cols-3 lg:grid-cols-4 sm:overflow-visible`}
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
            className={styles.card}
          >
            <span className={styles.pictures} aria-hidden="true">
              <Emblem id={pairing.emblems[0]} color={VOICE.a} />
              <span className="font-bold text-sm">&amp;</span>
              <Emblem id={pairing.emblems[1]} color={VOICE.b} />
            </span>
            <span className={styles.cardWords} aria-hidden="true">
              <span className={styles.cardNames}>
                {pairing.first} &amp; {pairing.second}
              </span>
              <span className={styles.cardTopic}>{pairing.topic}</span>
            </span>
            {chosen && <Chosen />}
          </button>
        )
      })}

      <button
        type="button"
        data-deck-card
        aria-pressed={selected === OWN_CARD}
        onClick={onWriteOwn}
        className={cn(styles.card, styles.cardOwn)}
      >
        <Icon name="pen" size={24} />
        <span className={styles.cardNames}>Write your own</span>
        <span className={styles.cardTopic}>any two minds, real or imagined</span>
        {selected === OWN_CARD && <Chosen />}
      </button>
    </div>
  )
}

/** The chosen card's stamp: a tick and the word, so a magnified view never has to guess from colour. */
function Chosen() {
  return (
    <span className={styles.chosenMark} aria-hidden="true">
      <Icon name="done" size={12} />
      Chosen
    </span>
  )
}
