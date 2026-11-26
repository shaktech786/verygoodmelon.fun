'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Go } from '@/components/seedpress/Go'
import { PlaceStamps } from '@/components/seedpress/PlaceStamps'
import { Stamp } from '@/components/seedpress/Stamp'
import { StickyTray } from '@/components/seedpress/StickyTray'
import { WritingSlip } from '@/components/seedpress/WritingSlip'
import { Keepsake } from '@/components/games/Keepsake'
import { CarePanel, CloudSection, CopyWordsButton, FOCUS_TARGET, GentleExit, QuietSupport, WritingForm } from '@/components/games/community-words/WritingParts'
import { useArrival } from '@/components/games/community-words/arrival'
import { draftKey } from '@/lib/games/community-words/draft'
import { useCommunityWords } from '@/lib/games/community-words/useCommunityWords'
import { wakingLine } from '@/lib/games/community-words/waking'
import { useSense } from '@/lib/design/sense'
import { awakeningKeepsake } from '@/lib/keepsake/awakening'
import styles from './FirstWords.module.css'

const PROMPTS = [
  'Who do you hope is there?',
  'What do you notice first?',
  'What finally makes sense?',
  'What did you bring with you?',
  'Is it what you expected?',
  'What would you ask whoever greets you?',
  'What do you wish you had done more of?',
  'What do you want to say about the life you just lived?',
] as const

const MAX_INTENTION_LENGTH = 120

type Light = 'night' | 'dawn' | 'day'

// The note and the card follow the morning sky, which takes its 700 ms once awake (see FirstWords.module.css)
const NOTE_DELAY_MS = 500
const CARD_DELAY_MS = 1200

// Imagine, say, wake: where you are, in words
const PLACES = ['Imagine', 'Say', 'Wake'] as const

const STARS = [
  [8, 18], [17, 46], [26, 12], [35, 34], [44, 8], [56, 28], [63, 14], [72, 40], [81, 10], [90, 30], [12, 60], [68, 58],
] as const

/**
 * The sky over the whole visit: night on the other side, dawn on the way back, morning once awake.
 * Each later sky fades in over the one before, so it only ever gets lighter and never pulses.
 */
function Sky({ light }: { light: Light }) {
  return (
    <div className={styles.sky} data-light={light} aria-hidden="true">
      {(['night', 'dawn', 'day'] as const).map((phase) => (
        <div key={phase} data-sky={phase} data-current={phase === light ? '' : undefined} className={`${styles.layer} ${styles[phase]}`} />
      ))}
      {STARS.map(([left, top]) => (
        <span key={`${left}-${top}`} className={styles.star} style={{ left: `${left}%`, top: `${top}%` }} />
      ))}
      <div className={styles.sun} />
      <svg className={styles.ground} viewBox="0 0 400 40" preserveAspectRatio="none">
        <path d="M0 28 C 60 10, 120 12, 190 24 S 320 8, 400 22 L 400 40 L 0 40 Z" />
      </svg>
    </div>
  )
}

/** The plan for tomorrow, written by hand on a note left on the kitchen table. */
function TableNote({ note, motionScale }: { note: string; motionScale: 0 | 1 }) {
  const noteRef = useRef<HTMLDivElement>(null)
  useArrival(noteRef, { delay: NOTE_DELAY_MS, motionScale, from: 'translateY(-14px) rotate(-4deg)' })

  return (
    <div className={styles.table} data-testid="kitchen-table">
      {/* A cup of something warm, seen from above, half off the edge */}
      <div aria-hidden="true" className={styles.cup} />
      <div ref={noteRef} className={styles.note}>
        <span aria-hidden="true" className={styles.tape} />
        <p className={styles.noteLabel}>For tomorrow</p>
        <p className={styles.noteText}>{note}</p>
      </div>
    </div>
  )
}

/** A morning card to keep: the sunrise, and the note for tomorrow. */
function MorningCard({ note, motionScale }: { note: string; motionScale: 0 | 1 }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [day] = useState(() => new Date())
  const plan = useMemo(() => awakeningKeepsake({ note, day }), [note, day])
  useArrival(cardRef, { delay: CARD_DELAY_MS, motionScale })

  return (
    <div ref={cardRef}>
      <Keepsake plan={plan} label="This morning, on a card to keep" />
    </div>
  )
}

export default function FirstWords() {
  // Care lasts for the visit, so every later arrival is met the gentle way too
  const { submitted, stored, cloud, reflection, care, judgement, submit, reset, noticeDistress } = useCommunityWords('first-words')
  const safe = judgement === 'safe'
  const unjudged = judgement === 'unjudged'
  // Waking is a ceremony over the words, so it waits for them to be judged safe; care has its own gentle morning
  const mayWake = safe || care
  const [typedIntention, setTypedIntention] = useState<string | null>(null)
  const [carried, setCarried] = useState<string | null>(null)
  // In care mode the premise waits until someone chooses it, rather than meeting them on arrival
  const [goingOn, setGoingOn] = useState(false)
  const { motionScale } = useSense()
  const sceneRef = useRef<HTMLDivElement>(null)
  const careRef = useRef<HTMLDivElement>(null)
  const intentionRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const beforeWakingRef = useRef<HTMLHeadingElement>(null)
  const morningRef = useRef<HTMLHeadingElement>(null)
  const returningToWrite = useRef(false)
  // Read through a ref, so switching the sense dial later never scrolls the page or moves focus
  const scrollBehavior = useRef<ScrollBehavior>(motionScale === 0 ? 'auto' : 'smooth')
  useEffect(() => {
    scrollBehavior.current = motionScale === 0 ? 'auto' : 'smooth'
  }, [motionScale])

  const awake = carried !== null
  // The suggestion fills the box until the player writes their own
  const intention = typedIntention ?? reflection.intention

  // The plan for tomorrow grows with what is written, so none of it is ever hidden past the edge
  useLayoutEffect(() => {
    const box = intentionRef.current
    if (!box) return
    box.style.height = 'auto'
    box.style.height = `${box.scrollHeight + box.offsetHeight - box.clientHeight}px`
  }, [intention])

  // Keep keyboard and screen-reader users oriented when the view changes. On a phone the
  // keyboard leaves the page scrolled low, so the dawn sky is brought back into view first.
  useEffect(() => {
    if (submitted !== null) {
      sceneRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior.current })
      beforeWakingRef.current?.focus({ preventScroll: true })
    } else if (returningToWrite.current) {
      returningToWrite.current = false
      textareaRef.current?.focus()
    }
  }, [submitted])

  // Words that called for care, or that no reply could judge, are met by support first, so it is what
  // comes into view, even when that answer (or the lack of one) arrives after the dawn sky has been scrolled to
  const afterWords = submitted !== null
  const supportFirst = afterWords && (care || unjudged)
  useEffect(() => {
    if (supportFirst) careRef.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior.current })
  }, [supportFirst])

  // The sky turning to morning is the payoff, so bring it on screen before focus moves; in care, the support stays in view
  useEffect(() => {
    if (!awake) return
    const inView = care ? careRef : sceneRef
    inView.current?.scrollIntoView({ block: 'start', behavior: scrollBehavior.current })
    morningRef.current?.focus({ preventScroll: true })
  }, [awake, care])

  useEffect(() => {
    if (goingOn) textareaRef.current?.focus()
  }, [goingOn])

  const goOn = () => setGoingOn(true)

  const wake = (event: FormEvent) => {
    event.preventDefault()
    // Enter in the plan box submits the form even while the button is held back
    if (!mayWake) return
    const chosen = care ? '' : intention.trim()
    if (chosen) noticeDistress(chosen)
    setCarried(chosen)
  }

  const imagineAgain = () => {
    returningToWrite.current = true
    setCarried(null)
    setTypedIntention(null)
    reset()
  }

  // The sun only starts to rise once the words are judged safe; until then the sky stays dark
  const light: Light = awake ? 'day' : safe ? 'dawn' : 'night'
  // Places move on only once the words are judged safe: before that nothing marks a step forward
  const place = awake ? 2 : submitted !== null && safe ? 1 : 0
  const showPlaces = !supportFirst && !(care && !goingOn)
  const joined = cloud.status === 'ready' && stored ? cloud.total > 1 : null

  return (
    <div className={styles.page}>
      {/* Support comes first whenever care is called for, before the scene and anything to press */}
      {care ? (
        <div ref={careRef} className={styles.careSlot}>
          <CarePanel />
        </div>
      ) : (
        unjudged && (
          // Unheard words may still be danger said sideways, so support leads here too, said softly
          <div ref={careRef} className={`sp-sheet ${styles.careSlot}`}>
            <QuietSupport />
          </div>
        )
      )}

      <div ref={sceneRef} className={styles.scene}>
        {/* No sky after words that called for care or went unjudged: a sunrise is a celebration, and this is not the moment for one */}
        {!supportFirst && <Sky light={light} />}

        <div className={styles.inner}>
          {showPlaces && <PlaceStamps places={PLACES} here={place} label="Where you are" />}

          {submitted === null ? (
            <>
              {care && (
                <p className="sp-lead">
                  This one imagines the moment after a life ends. If that is too close today, gentler games are waiting just below.
                </p>
              )}
              {care && !goingOn ? (
                <div>
                  <Stamp onClick={goOn}>I&apos;d still like to</Stamp>
                </div>
              ) : (
                <>
                  <p className="sp-lead">You open your eyes. It is quiet, and the light is soft.</p>
                  <WritingForm
                    prompts={PROMPTS}
                    label="Your first words on arriving"
                    placeholder="Say it the way you would…"
                    submitLabel="Speak"
                    onSubmit={submit}
                    textareaRef={textareaRef}
                    draftKey={draftKey('first-words')}
                  />
                  <p className="sp-soft">
                    Whatever you believe comes next, or don&apos;t, is welcome here. In a moment, you wake up.
                  </p>
                </>
              )}
            </>
          ) : awake ? (
            <div className={styles.morning}>
              <h2 ref={morningRef} {...FOCUS_TARGET} className="sp-h2">
                Good morning
              </h2>
              <p className="break-words">{wakingLine({ words: submitted, intention: carried, judgement })}</p>
              {carried && safe && (
                <>
                  <TableNote note={carried} motionScale={motionScale} />
                  <div>
                    <CopyWordsButton
                      words={carried}
                      label="Copy it for tomorrow"
                      copiedMessage="Copied. Put it somewhere you will see it tomorrow."
                    />
                  </div>
                  <MorningCard note={carried} motionScale={motionScale} />
                </>
              )}
            </div>
          ) : (
            <div className={styles.stack}>
              <h2 ref={beforeWakingRef} {...FOCUS_TARGET} className="sp-h2">
                Before you wake
              </h2>
              {/* A promise of morning belongs only to words known to be an imagined ending */}
              {safe && (
                <p className="sp-soft">
                  {joined === null
                    ? 'Morning is close.'
                    : joined
                      ? 'Others have stood here and come back.'
                      : 'You are the first to stand here and come back.'}
                </p>
              )}
              {/* Words are only framed back once they are known to be an imagined ending, never to someone who may be in danger */}
              {safe ? (
                <blockquote className={styles.words}>&ldquo;{submitted}&rdquo;</blockquote>
              ) : (
                (care || unjudged) && <p>What you said stays with you. There is no hurry here.</p>
              )}

              <div aria-live="polite" className="grid gap-3">
                {judgement === 'awaiting' && <p className="sp-soft">The quiet listens…</p>}
                {reflection.text && <p className={styles.reflection}>{reflection.text}</p>}
                {reflection.intention && typedIntention === null && !care && (
                  <p className="sr-only">Suggested for tomorrow: {reflection.intention}</p>
                )}
              </div>

              {!unjudged && (
                <form onSubmit={wake} className="sp-form w-full">
                  {!care && (
                    <WritingSlip
                      ref={intentionRef}
                      label="One small thing to bring back into tomorrow"
                      compact
                      rows={2}
                      value={intention}
                      onChange={(e) => setTypedIntention(e.target.value.replace(/\s*\n\s*/g, ' '))}
                      onKeyDown={(e) => {
                        // One line of intention: Enter wakes, as it did before the box could grow
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          e.currentTarget.form?.requestSubmit()
                        }
                      }}
                      maxLength={MAX_INTENTION_LENGTH}
                      placeholder="Something small you could do tomorrow…"
                      note="Change it, or leave it empty. It is never sent or saved anywhere; you can copy it once you wake."
                    />
                  )}
                  {mayWake && (
                    <StickyTray>
                      {/* In care, going on is a quiet choice beside the support, never a call to action */}
                      {care ? (
                        <Stamp type="submit" onClick={(event) => event.detail > 1 && event.preventDefault()}>
                          Wake up
                        </Stamp>
                      ) : (
                        // The second click of a double click on Speak can land here; waking should be a choice
                        <Go type="submit" onClick={(event) => event.detail > 1 && event.preventDefault()}>
                          Wake up
                        </Go>
                      )}
                    </StickyTray>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {submitted !== null && (
        <>
          <CloudSection
            cloud={cloud}
            heading="What others said on the other side"
            label="Most common first words"
          />

          {/* Words not known to be safe never come with an invitation to picture a death again; in care the calm games wait just below */}
          {unjudged && <GentleExit />}
          {safe && (
            <div>
              <Stamp onClick={imagineAgain}>Imagine it again</Stamp>
            </div>
          )}
        </>
      )}
    </div>
  )
}
