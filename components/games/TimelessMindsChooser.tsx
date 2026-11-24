'use client'

import { Shuffle, Video } from 'lucide-react'
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
  'bg-background w-full min-h-[44px] flex items-center gap-3 rounded-xl border border-card-border px-4 py-3 text-left hover:border-chosen-line transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

/** Before the first call: a short, calm choice of who to call, or a surprise. */
export default function TimelessMindsChooser({ care, onChoose, onSurprise }: TimelessMindsChooserProps) {
  const choices = (care ? CARE_CHOICES : FIRST_CHOICES)
    .map(getThinkerById)
    .filter((thinker): thinker is Thinker => thinker !== undefined)

  return (
    <section aria-labelledby="sage-chooser-heading" className="p-5 sm:p-8">
      <h2 id="sage-chooser-heading" className="font-serif text-2xl sm:text-3xl text-foreground text-center">
        Who would you like to talk with?
      </h2>
      <p className="mt-2 text-center text-sm sm:text-base text-foreground/70">
        Pick someone to sit with for a while. You can meet anyone else later, from the Menu.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {choices.map((thinker) => (
          <li key={thinker.id}>
            <button type="button" className={choiceClass} onClick={() => onChoose(thinker)}>
              <span aria-hidden="true" className="call-avatar shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-serif text-lg">
                {thinker.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-tight text-foreground">{thinker.name}</span>
                <span className="block text-sm text-foreground/70">{thinker.field}</span>
              </span>
              <Video size={20} className="shrink-0 text-foreground/70" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={onSurprise}
          className="bg-background text-foreground border-card-border min-h-[44px] inline-flex items-center gap-2 rounded-full border px-5 text-sm sm:text-base hover:border-chosen-line transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <Shuffle size={18} aria-hidden="true" />
          Surprise me
        </button>
      </div>
    </section>
  )
}
