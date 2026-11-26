import { forwardRef, useMemo, useState, type CSSProperties } from 'react'
import { Keepsake } from '@/components/games/Keepsake'
import type { Concept } from '@/lib/games/idea-lab/concepts'
import { composeLetter } from '@/lib/games/idea-lab/golds'
import { alchemistKeepsake } from '@/lib/keepsake/alchemist'
import { Icon } from '@/components/seedpress/icons/Icon'
import { Stamp } from '@/components/seedpress/Stamp'
import { cn } from '@/lib/utils/cn'
import styles from '../IdeaLab.module.css'

interface LetterSceneProps {
  work: number
  discoveries: Concept[]
  canBeginNextWork: boolean
  onBeginNextWork: () => void
  onClose: () => void
}

/** The closing scene of a Work: the seven golds, told back to the player in the order they found them. */
export const LetterScene = forwardRef<HTMLHeadingElement, LetterSceneProps>(function LetterScene(
  { work, discoveries, canBeginNextWork, onBeginNextWork, onClose },
  headingRef,
) {
  const letter = useMemo(() => composeLetter(work, discoveries), [work, discoveries])
  const [day] = useState(() => new Date())
  const plan = useMemo(() => alchemistKeepsake({ letter, day }), [letter, day])
  const emojiFor = (gold: string) => discoveries.find(c => c.name.toLowerCase() === gold.toLowerCase())?.emoji ?? '✨'

  // Each line prints in after the one before it; --n is its place in the sheet
  const place = (n: number) => ({ className: styles.printed, style: { '--n': n } as CSSProperties })

  return (
    <section aria-labelledby="idea-lab-letter-title" className={styles.letter}>
      <Icon name="flask" size={36} className={styles.letterMark} />
      <h2 id="idea-lab-letter-title" ref={headingRef} tabIndex={-1} className={styles.letterTitle}>
        {letter.title}
      </h2>
      <div className={styles.letterBody}>
        <p {...place(1)}>{letter.opening}</p>
        <ol className={styles.letterLines}>
          {letter.lines.map((line, index) => (
            <li key={line.gold} className={cn(styles.letterLine, styles.printed)} style={{ '--n': index + 2 } as CSSProperties}>
              <span aria-hidden="true">{emojiFor(line.gold)}</span>
              <span>{line.text}</span>
            </li>
          ))}
        </ol>
        {letter.closing.map((line, index) => (
          <p key={line} className={cn(styles.letterClosing, styles.printed)} style={{ '--n': letter.lines.length + 2 + index } as CSSProperties}>
            {line}
          </p>
        ))}
      </div>
      <Keepsake plan={plan} label="Keep this letter" className={styles.keepsake} />
      <div className={styles.letterActions}>
        {canBeginNextWork && <Stamp onClick={onBeginNextWork}>Begin the Second Work</Stamp>}
        <Stamp onClick={onClose}>Keep wandering</Stamp>
      </div>
    </section>
  )
})
