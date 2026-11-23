import { forwardRef, useMemo, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { Keepsake } from '@/components/games/Keepsake'
import type { Concept } from '@/lib/games/idea-lab/concepts'
import { composeLetter } from '@/lib/games/idea-lab/golds'
import { alchemistKeepsake } from '@/lib/keepsake/alchemist'

interface LetterSceneProps {
  work: number
  discoveries: Concept[]
  canBeginNextWork: boolean
  reducedMotion: boolean
  onBeginNextWork: () => void
  onClose: () => void
}

/** The closing scene of a Work: the seven golds, told back to the player in the order they found them. */
export const LetterScene = forwardRef<HTMLHeadingElement, LetterSceneProps>(function LetterScene(
  { work, discoveries, canBeginNextWork, reducedMotion, onBeginNextWork, onClose },
  headingRef,
) {
  const letter = useMemo(() => composeLetter(work, discoveries), [work, discoveries])
  const [day] = useState(() => new Date())
  const plan = useMemo(() => alchemistKeepsake({ letter, day }), [letter, day])
  const emojiFor = (gold: string) => discoveries.find(c => c.name.toLowerCase() === gold.toLowerCase())?.emoji ?? '✨'

  return (
    <section
      aria-labelledby="idea-lab-letter-title"
      className={`mb-6 rounded-xl border-2 border-warm bg-warm/10 px-5 py-6 sm:px-10 sm:py-8 ${reducedMotion ? '' : 'animate-fade'}`}
    >
      <FlaskConical className="mx-auto mb-3 text-foreground/70" size={32} strokeWidth={1.5} aria-hidden="true" />
      <h2
        id="idea-lab-letter-title"
        ref={headingRef}
        tabIndex={-1}
        className="scroll-mt-24 text-center text-2xl sm:text-3xl font-semibold mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
      >
        {letter.title}
      </h2>
      <div className="max-w-xl mx-auto text-foreground leading-relaxed">
        <p className="mb-4">{letter.opening}</p>
        <ol className="space-y-2 mb-4">
          {letter.lines.map(line => (
            <li key={line.gold} className="flex gap-3">
              <span aria-hidden="true" className="shrink-0">{emojiFor(line.gold)}</span>
              <span>{line.text}</span>
            </li>
          ))}
        </ol>
        {letter.closing.map(line => <p key={line} className="mb-2 text-foreground/85">{line}</p>)}
      </div>
      <Keepsake plan={plan} label="Keep this letter" className="mt-6" />
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        {canBeginNextWork && (
          <button
            type="button"
            onClick={onBeginNextWork}
            className="px-5 py-2 min-h-[44px] rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Begin the Second Work
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 min-h-[44px] rounded-lg border border-card-border bg-card-bg text-foreground font-medium hover:bg-hover-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Keep wandering
        </button>
      </div>
    </section>
  )
})
