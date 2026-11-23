'use client'

import { Shuffle } from 'lucide-react'
import { getThinkerById, type Thinker } from '@/lib/games/timeless-minds/thinkers'

// A few warm, very different voices to start from; everyone else waits in the directory once talking
const FIRST_CHOICES = ['socrates', 'buddha', 'marie-curie', 'maya-angelou']
// Someone who may be struggling is offered only calm company
const CARE_CHOICES = ['buddha', 'marie-curie', 'maya-angelou', 'carl-sagan']

interface TimelessMindsChooserProps {
  care: boolean
  onChoose: (thinker: Thinker) => void
  onSurprise: () => void
}

const choiceClass =
  'sage-note w-full min-h-[44px] flex items-center gap-3 rounded-xl border px-4 py-3 text-left hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

/** Before the first call: a short, calm choice of who to sit with, or a surprise. */
export default function TimelessMindsChooser({ care, onChoose, onSurprise }: TimelessMindsChooserProps) {
  const choices = (care ? CARE_CHOICES : FIRST_CHOICES)
    .map(getThinkerById)
    .filter((thinker): thinker is Thinker => thinker !== undefined)

  return (
    <section aria-labelledby="sage-chooser-heading" className="p-5 sm:p-8">
      <h2 id="sage-chooser-heading" className="font-serif text-2xl sm:text-3xl sage-ink text-center">
        Who would you like to talk with?
      </h2>
      <p className="mt-2 text-center text-sm sm:text-base sage-ink-soft">
        Pick someone to sit with for a while. You can meet anyone else later, from the Menu.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {choices.map((thinker) => (
          <li key={thinker.id}>
            <button type="button" className={choiceClass} onClick={() => onChoose(thinker)}>
              <span aria-hidden="true" className="sage-frame shrink-0 w-10 h-10 rounded-md flex items-center justify-center font-serif text-lg text-white">
                {thinker.name.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-lg leading-tight sage-ink">{thinker.name}</span>
                <span className="block text-sm sage-ink-soft">{thinker.field}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={onSurprise}
          className="sage-paper min-h-[44px] inline-flex items-center gap-2 rounded-full border px-5 text-sm sm:text-base hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <Shuffle size={18} aria-hidden="true" />
          Surprise me
        </button>
      </div>
    </section>
  )
}
