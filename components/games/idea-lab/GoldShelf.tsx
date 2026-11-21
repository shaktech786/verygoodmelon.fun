import { forwardRef } from 'react'
import type { Concept } from '@/lib/games/idea-lab/concepts'
import { WORK_TITLES, goldsFor } from '@/lib/games/idea-lab/golds'

interface GoldShelfProps {
  work: number
  /** Clue level of each gold of this Work, in shelf order. */
  hints: number[]
  /** The gold whose riddle grew plainer on the last try, if any. */
  freshClue: number | null
  /** The player's concept for each gold of this Work, in shelf order, or undefined while unfound. */
  found: (Concept | undefined)[]
  /** Works whose letter can be read again. */
  completedWorks: number[]
  canBeginNextWork: boolean
  onReadLetter: (work: number) => void
  onBeginNextWork: () => void
}

const LETTER_BUTTON_LABELS = ['Read the letter from the Great Work', 'Read the letter from the Second Work']

export const GoldShelf = forwardRef<HTMLHeadingElement, GoldShelfProps>(function GoldShelf(
  { work, hints, freshClue, found, completedWorks, canBeginNextWork, onReadLetter, onBeginNextWork },
  headingRef,
) {
  const golds = goldsFor(work)
  const count = found.filter(Boolean).length
  const done = count === golds.length
  const title = done ? `${WORK_TITLES[work]} is complete` : work === 0 ? 'The seven golds' : 'The Second Work: seven new golds'
  const note = done
    ? 'Every heavy thing you started with became part of something kinder. The lab stays open whenever you want to wander.'
    : hints.some(level => level > 0)
      ? 'Plainer clues surface one riddle at a time, oldest first. There is no wrong order.'
      : 'Each riddle hides the two ideas a gold is made from. If you get stuck, plainer clues will surface here, one riddle at a time.'
  const unsolved = golds.map((gold, index) => ({ gold, index })).filter(({ index }) => !found[index])
  const solved = golds.flatMap((gold, index) => {
    const concept = found[index]
    return concept ? [{ gold, concept }] : []
  })

  return (
    <section className="bg-card-bg border border-card-border rounded-xl p-4 sm:p-5" aria-labelledby="great-work-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 id="great-work-title" ref={headingRef} tabIndex={-1} className="scroll-mt-24 font-medium text-foreground/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
          {title}
        </h2>
        <span className="text-sm text-foreground/70">{count} of {golds.length} found</span>
      </div>
      <p className="text-sm text-foreground/70 mb-3">{note}</p>

      {unsolved.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
          {unsolved.map(({ gold, index }) => {
            const level = hints[index] ?? 0
            const fresh = index === freshClue
            return (
              <li
                key={gold.name}
                className={`rounded-lg border border-dashed px-3 py-2.5 ${fresh ? 'border-warm bg-warm/10' : 'border-foreground/25'}`}
              >
                {fresh && <p className="text-xs font-semibold text-foreground mb-1">New clue</p>}
                <p className="text-sm font-medium text-foreground/80 italic">
                  <span className="sr-only">Not yet found. Riddle: </span>
                  {gold.riddles[0]}
                </p>
                {level >= 1 && (
                  <p className="text-sm text-foreground/80 mt-1.5">
                    <span className="font-medium">Plainer: </span>{gold.riddles[1]}
                  </p>
                )}
                {level >= 2 && (
                  <p className="text-sm text-foreground/80 mt-1">
                    <span className="font-medium">Ingredients: </span>{gold.riddles[2]}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {solved.length > 0 && (
        <ul className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 ${unsolved.length > 0 ? 'mt-3' : ''}`}>
          {solved.map(({ gold, concept }) => (
            <li key={gold.name} className="rounded-lg border border-warm bg-warm/15 px-3 py-2.5">
              <p className="font-semibold text-foreground">
                <span aria-hidden="true">{concept.emoji} </span>{concept.name}
              </p>
              {concept.description && <p className="text-sm text-foreground/75 mt-1">{concept.description}</p>}
            </li>
          ))}
        </ul>
      )}

      {(completedWorks.length > 0 || canBeginNextWork) && (
        <div className="flex flex-wrap gap-3 mt-4">
          {completedWorks.map(completed => (
            <button
              key={completed}
              type="button"
              onClick={() => onReadLetter(completed)}
              className="px-4 py-2 min-h-[44px] rounded-lg border border-warm bg-warm/15 text-sm font-medium text-foreground hover:bg-warm/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {LETTER_BUTTON_LABELS[completed]}
            </button>
          ))}
          {canBeginNextWork && (
            <button
              type="button"
              onClick={onBeginNextWork}
              className="px-4 py-2 min-h-[44px] rounded-lg border border-card-border text-sm font-medium text-foreground hover:bg-hover-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Begin the Second Work
            </button>
          )}
        </div>
      )}
    </section>
  )
})
