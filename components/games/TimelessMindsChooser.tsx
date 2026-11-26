'use client'

import { getThinkerById, type Thinker } from '@/lib/games/timeless-minds/thinkers'
import { Icon } from '@/components/seedpress/icons/Icon'
import { Stamp } from '@/components/seedpress/Stamp'
import { useInkTheme } from '@/lib/design/inks'
import { portraitPlates } from '@/lib/games/timeless-minds/portraits'
import styles from './TimelessMinds.module.css'

// A few warm, very different voices to start from; everyone else waits in the directory once talking
const FIRST_CHOICES = ['socrates', 'buddha', 'marie-curie', 'maya-angelou']
// Someone who may be struggling is offered only calm company
const CARE_CHOICES = ['buddha', 'marie-curie', 'maya-angelou', 'carl-sagan']

interface TimelessMindsChooserProps {
  care: boolean
  onChoose: (thinker: Thinker) => void
  onSurprise: () => void
  /** Hover or focus on a choice: the call can start loading before the pick. */
  onIntent?: () => void
}

/** Before the first call: a short, calm choice of who to call, as stamp cards, or a surprise. */
export default function TimelessMindsChooser({ care, onChoose, onSurprise, onIntent }: TimelessMindsChooserProps) {
  const theme = useInkTheme()
  const choices = (care ? CARE_CHOICES : FIRST_CHOICES)
    .map(getThinkerById)
    .filter((thinker): thinker is Thinker => thinker !== undefined)

  return (
    <section aria-labelledby="sage-chooser-heading" className="p-5 sm:p-8">
      <h2 id="sage-chooser-heading" className={styles.chooseTitle}>
        Who would you like to talk with?
      </h2>
      <p className={`${styles.chooseLine} mt-2`}>
        Pick someone to sit with for a while. You can meet anyone else later, from the Menu.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {choices.map((thinker) => (
          <li key={thinker.id}>
            <button type="button" className={styles.card} onClick={() => onChoose(thinker)} onPointerEnter={onIntent} onFocus={onIntent}>
              <span aria-hidden="true" className={styles.cardFace}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={portraitPlates(thinker.id, theme).ink} alt="" width={48} height={48} className="w-full h-full object-cover" style={{ objectPosition: 'center 22%' }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={styles.cardName}>{thinker.name}</span>
                <span className={styles.cardField}>{thinker.field}</span>
              </span>
              <Icon name="phone" size={24} className={styles.cardMark} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-center">
        <Stamp icon="dice" onClick={onSurprise}>
          Surprise me
        </Stamp>
      </div>
    </section>
  )
}
