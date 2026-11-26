import { forwardRef, useEffect, useRef } from 'react'
import type { Concept } from '@/lib/games/idea-lab/concepts'
import { WORK_TITLES, goldsFor } from '@/lib/games/idea-lab/golds'
import { Stamp } from '@/components/seedpress/Stamp'
import { cn } from '@/lib/utils/cn'
import styles from '../IdeaLab.module.css'

interface GoldShelfProps {
  work: number
  /** Clue level of each gold of this Work, in shelf order. */
  hints: number[]
  /** The gold whose riddle grew plainer on the last try, if any. */
  freshClue: number | null
  /** The gold found by the last combination: its riddle stays in place while it turns gold. */
  freshGold: number | null
  reducedMotion: boolean
  /** The player's concept for each gold of this Work, in shelf order, or undefined while unfound. */
  found: (Concept | undefined)[]
  /** Works whose letter can be read again. */
  completedWorks: number[]
  canBeginNextWork: boolean
  onReadLetter: (work: number) => void
  onBeginNextWork: () => void
}

/** The gold just found, for the phone bench's "See it on the shelf". */
export const FRESH_GOLD_ID = 'alchemist-fresh-gold'

const LETTER_BUTTON_LABELS = ['Read the letter from the Great Work', 'Read the letter from the Second Work']

export const GoldShelf = forwardRef<HTMLHeadingElement, GoldShelfProps>(function GoldShelf(
  { work, hints, freshClue, freshGold, reducedMotion, found, completedWorks, canBeginNextWork, onReadLetter, onBeginNextWork },
  headingRef,
) {
  const freshRef = useRef<HTMLLIElement>(null)

  // In the wide layout the riddles scroll in their own column; bring the one turning gold into view there.
  // On a phone the page is left where it is: the bench offers a note to tap instead.
  useEffect(() => {
    const card = freshRef.current
    const column = card?.closest<HTMLElement>('[data-shelf-scroll]')
    if (!card || !column || column.scrollHeight <= column.clientHeight) return
    const cardBox = card.getBoundingClientRect()
    const columnBox = column.getBoundingClientRect()
    // The column can reach past the bottom of the window while the page is still scrolled to the top.
    const visibleBottom = Math.min(columnBox.bottom, window.innerHeight)
    const offset = cardBox.top < columnBox.top
      ? cardBox.top - columnBox.top - 12
      : cardBox.bottom > visibleBottom ? cardBox.bottom - visibleBottom + 12 : 0
    if (offset !== 0) column.scrollBy({ top: offset, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [freshGold, reducedMotion])

  const golds = goldsFor(work)
  const done = found.filter(Boolean).length === golds.length
  const title = done ? `${WORK_TITLES[work]} is complete` : work === 0 ? 'The seven golds' : 'The Second Work: seven new golds'
  const note = done
    ? 'Every heavy thing you started with became part of something kinder. The lab stays open whenever you want to wander.'
    : hints.some(level => level > 0)
      ? 'Plainer clues surface one riddle at a time, oldest first. There is no wrong order.'
      : 'Each riddle hides the two ideas a gold is made from. If you get stuck, plainer clues will surface here, one riddle at a time.'
  const unsolved = golds.map((gold, index) => ({ gold, index })).filter(({ index }) => !found[index] || index === freshGold)
  const solved = golds.flatMap((gold, index) => {
    const concept = found[index]
    return concept && index !== freshGold ? [{ gold, concept }] : []
  })

  return (
    <section className={cn(styles.panel, styles.shelf)} aria-labelledby="great-work-title">
      <h2 id="great-work-title" ref={headingRef} tabIndex={-1} className={cn(styles.heading, styles.shelfHeading)}>
        {title}
      </h2>
      <p className={styles.soft}>{note}</p>

      {unsolved.length > 0 && (
        <ul className={styles.shelfList}>
          {unsolved.map(({ gold, index }) => {
            const level = hints[index] ?? 0
            const fresh = index === freshClue
            const answer = index === freshGold ? found[index] : undefined
            if (answer) {
              return (
                <li
                  key={gold.name}
                  ref={freshRef}
                  id={FRESH_GOLD_ID}
                  tabIndex={-1}
                  className={cn(styles.riddleCard, 'alchemist-gold-settled', !reducedMotion && 'alchemist-gold-turn')}
                >
                  <p className={styles.riddle}>
                    <span className="sr-only">Just found. Riddle: </span>
                    {gold.riddles[0]}
                  </p>
                  <div className={reducedMotion ? undefined : 'alchemist-gold-answer'}>
                    <p className={styles.goldName}>
                      <span aria-hidden="true">{answer.emoji} </span>{answer.name}
                    </p>
                    {answer.description && <p className={styles.goldWords}>{answer.description}</p>}
                  </div>
                </li>
              )
            }
            return (
              <li key={gold.name} className={cn(styles.riddleCard, fresh && styles.riddleFresh)}>
                {fresh && <p className={styles.freshWord}>New clue</p>}
                <p className={styles.riddle}>
                  <span className="sr-only">Not yet found. Riddle: </span>
                  {gold.riddles[0]}
                </p>
                {level >= 1 && (
                  <p className={styles.clue}>
                    <b>Plainer: </b>{gold.riddles[1]}
                  </p>
                )}
                {level >= 2 && (
                  <p className={styles.clue}>
                    <b>Ingredients: </b>{gold.riddles[2]}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {solved.length > 0 && (
        <ul className={cn(styles.shelfList, unsolved.length > 0 && styles.shelfListAfter)}>
          {solved.map(({ gold, concept }) => (
            <li key={gold.name} className={styles.goldCard}>
              <p className={styles.goldName}>
                <span aria-hidden="true">{concept.emoji} </span>{concept.name}
              </p>
              {concept.description && <p className={styles.goldWords}>{concept.description}</p>}
            </li>
          ))}
        </ul>
      )}

      {(completedWorks.length > 0 || canBeginNextWork) && (
        <div className={styles.shelfActions}>
          {completedWorks.map(completed => (
            <Stamp key={completed} onClick={() => onReadLetter(completed)}>
              {LETTER_BUTTON_LABELS[completed]}
            </Stamp>
          ))}
          {canBeginNextWork && <Stamp onClick={onBeginNextWork}>Begin the Second Work</Stamp>}
        </div>
      )}
    </section>
  )
})
