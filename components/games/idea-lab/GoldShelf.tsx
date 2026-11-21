import { forwardRef } from 'react'
import type { Concept } from '@/lib/games/idea-lab/concepts'
import { WORK_TITLES, goldsFor } from '@/lib/games/idea-lab/golds'

interface GoldShelfProps {
  work: number
  hintLevel: number
  /** The player's concept for each gold of this Work, in shelf order, or undefined while unfound. */
  found: (Concept | undefined)[]
  /** Works whose letter can be read again. */
  completedWorks: number[]
  canBeginNextWork: boolean
  onReadLetter: (work: number) => void
  onBeginNextWork: () => void
}

const HINT_NOTES = [
  'Each riddle hides the two ideas a gold is made from. If you get stuck, plainer clues will surface here.',
  'Plainer clues have surfaced under the riddles you have not solved yet.',
  'The shelf now names the ingredients too. There is no wrong order.',
]

const LETTER_BUTTON_LABELS = ['Read the letter from the Great Work', 'Read the letter from the Second Work']

export const GoldShelf = forwardRef<HTMLHeadingElement, GoldShelfProps>(function GoldShelf(
  { work, hintLevel, found, completedWorks, canBeginNextWork, onReadLetter, onBeginNextWork },
  headingRef,
) {
  const golds = goldsFor(work)
  const count = found.filter(Boolean).length
  const done = count === golds.length
  const title = done ? `${WORK_TITLES[work]} is complete` : work === 0 ? 'The seven golds' : 'The Second Work: seven new golds'

  return (
    <section className="mt-6 bg-card-bg border border-card-border rounded-xl p-4 sm:p-6" aria-labelledby="great-work-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 id="great-work-title" ref={headingRef} tabIndex={-1} className="scroll-mt-24 font-medium text-foreground/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
          {title}
        </h2>
        <span className="text-sm text-foreground/70">{count} of {golds.length} found</span>
      </div>
      <p className="text-sm text-foreground/70 mb-4">
        {done ? 'Every heavy thing you started with became part of something kinder. The lab stays open whenever you want to wander.' : HINT_NOTES[hintLevel]}
      </p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {golds.map((gold, index) => {
          const concept = found[index]
          return (
            <li
              key={gold.name}
              className={`rounded-lg border px-3 py-3 ${concept ? 'border-warm bg-warm/15' : 'border-dashed border-foreground/25'}`}
            >
              {concept ? (
                <>
                  <p className="font-semibold text-foreground">
                    <span aria-hidden="true">{concept.emoji} </span>{concept.name}
                  </p>
                  {concept.description && <p className="text-sm text-foreground/75 mt-1">{concept.description}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground/80 italic">
                    <span className="sr-only">Not yet found. Riddle: </span>
                    {gold.riddles[0]}
                  </p>
                  {hintLevel >= 1 && (
                    <p className="text-sm text-foreground/75 mt-2">
                      <span className="font-medium">Plainer: </span>{gold.riddles[1]}
                    </p>
                  )}
                  {hintLevel >= 2 && (
                    <p className="text-sm text-foreground/75 mt-1">
                      <span className="font-medium">Ingredients: </span>{gold.riddles[2]}
                    </p>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>

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
