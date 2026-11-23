'use client'

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Keepsake } from '@/components/games/Keepsake'
import { CarePanel, CloudSection, CopyWordsButton, FOCUS_TARGET, GentleExit, QuietSupport, WritingForm } from '@/components/games/community-words/WritingParts'
import { useArrival } from '@/components/games/community-words/arrival'
import { draftKey } from '@/lib/games/community-words/draft'
import { useCommunityWords } from '@/lib/games/community-words/useCommunityWords'
import { wakingLine } from '@/lib/games/community-words/waking'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { awakeningKeepsake } from '@/lib/keepsake/awakening'

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

// Night and dawn are dark in both themes and day is a pale blue in both, so waking reads clearly either way
const SKY: Record<Light, string> = {
  night:
    'linear-gradient(to bottom, color-mix(in srgb, var(--melon-indigo) 30%, black), color-mix(in srgb, var(--melon-purple) 40%, black))',
  dawn: 'linear-gradient(to bottom, color-mix(in srgb, var(--melon-indigo) 45%, black), color-mix(in srgb, var(--melon-pink) 45%, var(--melon-purple)) 60%, var(--warm))',
  day: 'linear-gradient(to bottom, color-mix(in srgb, var(--melon-blue) 70%, white), color-mix(in srgb, var(--melon-blue) 22%, white))',
}

const SUN: Record<Light, { position: string; color: string }> = {
  night: { position: 'translate-y-[160%]', color: 'var(--melon-orange)' },
  dawn: { position: 'translate-y-[35%]', color: 'var(--melon-orange)' },
  day: { position: '-translate-y-[60%]', color: 'var(--melon-yellow)' },
}

const GROUND_IN_THE_DARK = 'color-mix(in srgb, var(--melon-green) 70%, black)'
const GROUND_BY_DAY = 'color-mix(in srgb, var(--melon-green-light) 75%, var(--melon-green))'

// Waking is the payoff, so the last change of light takes its time
const SUNRISE_MS = 4000
const NOTE_DELAY_MS = 2200
const CARD_DELAY_MS = 3400
const fade = (light: Light) => (light === 'day' ? 'duration-[4000ms]' : 'duration-[2000ms]')

// A plain wooden table and a paper note look the same whichever theme the page is in
const TABLE = 'repeating-linear-gradient(to bottom, #a97c55 0 46px, #9a6e48 46px 48px)'
const NOTE_PAPER = '#fdf8ec'
const NOTE_INK = '#2b2620'
const NOTE_INK_SOFT = '#6b5e50'
const HAND = '"Segoe Print", "Bradley Hand", "Noteworthy", "Comic Sans MS", cursive'
const NOTE_TILT = 'rotate(-1.2deg)'

const STARS = [
  [8, 18], [17, 46], [26, 12], [35, 34], [44, 8], [56, 28], [63, 14], [72, 40], [81, 10], [90, 30], [12, 60], [68, 58],
] as const

/** The sky over the whole visit: night on the other side, dawn on the way back, morning once awake. */
function Sky({ light }: { light: Light }) {
  const reduceMotion = useReducedMotion()
  const glow = useRef<HTMLDivElement>(null)

  // On waking, warm light spreads from the horizon and gives way to the day
  useEffect(() => {
    if (light !== 'day' || reduceMotion || !glow.current?.animate) return
    const sunrise = glow.current.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.35 }, { opacity: 0 }], {
      duration: SUNRISE_MS,
      easing: 'ease-in-out',
    })
    return () => sunrise.cancel()
  }, [light, reduceMotion])

  return (
    <div className="relative h-32 sm:h-40 overflow-hidden" aria-hidden="true">
      {(Object.keys(SKY) as Light[]).map((phase) => (
        <div
          key={phase}
          data-sky={phase}
          className={`absolute inset-0 transition-opacity ${fade(light)} ${phase === light ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: SKY[phase] }}
        />
      ))}
      <div
        ref={glow}
        data-testid="sunrise-glow"
        className="absolute inset-0 opacity-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 100%, color-mix(in srgb, var(--warm) 85%, white), color-mix(in srgb, var(--melon-pink) 35%, transparent) 45%, transparent 75%)' }}
      />
      {STARS.map(([left, top]) => (
        <span
          key={`${left}-${top}`}
          className={`absolute h-0.5 w-0.5 rounded-full bg-white transition-opacity ${fade(light)} ${light === 'night' ? 'opacity-80' : light === 'dawn' ? 'opacity-30' : 'opacity-0'}`}
          style={{ left: `${left}%`, top: `${top}%` }}
        />
      ))}
      <div
        className={`absolute bottom-6 left-1/2 -ml-7 h-14 w-14 rounded-full transition-[transform,background-color,box-shadow] ${fade(light)} ease-in-out ${SUN[light].position}`}
        style={{
          backgroundColor: SUN[light].color,
          boxShadow: `0 0 ${light === 'day' ? '36px 12px' : '24px 6px'} color-mix(in srgb, ${SUN[light].color} 55%, transparent)`,
        }}
      />
      <svg className="absolute inset-x-0 bottom-0 h-10 w-full" viewBox="0 0 400 40" preserveAspectRatio="none">
        <path
          d="M0 28 C 60 10, 120 12, 190 24 S 320 8, 400 22 L 400 40 L 0 40 Z"
          className={`transition-[fill] ${fade(light)}`}
          style={{ fill: light === 'day' ? GROUND_BY_DAY : GROUND_IN_THE_DARK }}
        />
      </svg>
    </div>
  )
}

/** The plan for tomorrow, written by hand on a note left on the kitchen table. */
function TableNote({ note }: { note: string }) {
  const reduceMotion = useReducedMotion()
  const noteRef = useRef<HTMLDivElement>(null)
  useArrival(noteRef, { delay: NOTE_DELAY_MS, reduceMotion, from: 'translateY(-14px) rotate(-4deg)', to: NOTE_TILT })

  return (
    <div className="relative -mx-5 sm:-mx-8 mt-5 overflow-hidden px-8 sm:px-14 pt-7 pb-9" style={{ background: TABLE }} data-testid="kitchen-table">
      {/* A cup of something warm, seen from above, half off the edge */}
      <div aria-hidden="true" className="absolute -right-3 bottom-3 h-16 w-16 rounded-full border-[6px]" style={{ borderColor: '#d6c7b0', background: '#efe7da' }}>
        <div className="absolute inset-[7px] rounded-full" style={{ background: '#6b4a32' }} />
      </div>
      <div
        ref={noteRef}
        className="relative mx-auto max-w-sm px-6 pt-6 pb-5 text-left shadow-[0_6px_14px_rgba(60,40,20,0.35)]"
        style={{ background: NOTE_PAPER, transform: NOTE_TILT }}
      >
        <span aria-hidden="true" className="absolute -top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rotate-2" style={{ background: 'rgba(243, 227, 179, 0.85)' }} />
        <p className="text-sm" style={{ fontFamily: HAND, color: NOTE_INK_SOFT }}>
          For tomorrow
        </p>
        <p className="mt-1 text-xl sm:text-2xl leading-snug break-words" style={{ fontFamily: HAND, color: NOTE_INK }}>
          {note}
        </p>
      </div>
    </div>
  )
}

/** A morning card to keep: the sunrise, and the note for tomorrow. */
function MorningCard({ note }: { note: string }) {
  const reduceMotion = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const [day] = useState(() => new Date())
  const plan = useMemo(() => awakeningKeepsake({ note, day }), [note, day])
  useArrival(cardRef, { delay: CARD_DELAY_MS, reduceMotion })

  return (
    <div ref={cardRef} className="mt-6">
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
  const reduceMotion = useReducedMotion()
  const sceneRef = useRef<HTMLDivElement>(null)
  const careRef = useRef<HTMLDivElement>(null)
  const intentionRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const beforeWakingRef = useRef<HTMLHeadingElement>(null)
  const morningRef = useRef<HTMLHeadingElement>(null)
  const returningToWrite = useRef(false)
  const intentionId = useId()

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
      sceneRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
      beforeWakingRef.current?.focus({ preventScroll: true })
    } else if (returningToWrite.current) {
      returningToWrite.current = false
      textareaRef.current?.focus()
    }
  }, [submitted, reduceMotion])

  // Words that called for care, or that no reply could judge, are met by support first, so it is what
  // comes into view, even when that answer (or the lack of one) arrives after the dawn sky has been scrolled to
  const afterWords = submitted !== null
  const supportFirst = afterWords && (care || unjudged)
  useEffect(() => {
    if (supportFirst) careRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [supportFirst, reduceMotion])

  // The sky turning to morning is the payoff, so bring it on screen before focus moves; in care, the support stays in view
  useEffect(() => {
    if (!awake) return
    const inView = care ? careRef : sceneRef
    inView.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
    morningRef.current?.focus({ preventScroll: true })
  }, [awake, care, reduceMotion])

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

  const light: Light = awake ? 'day' : submitted === null ? 'night' : 'dawn'
  const joined = cloud.status === 'ready' && stored ? cloud.total > 1 : null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Support comes first whenever care is called for, before the scene and anything to press */}
      {care ? (
        <div ref={careRef} className="scroll-mt-20">
          <CarePanel />
        </div>
      ) : (
        unjudged && (
          // Unheard words may still be danger said sideways, so support leads here too, said softly
          <div ref={careRef} className="scroll-mt-20 rounded-lg border border-card-border bg-card-bg p-4">
            <QuietSupport />
          </div>
        )
      )}

      <div ref={sceneRef} className="bg-card-bg border border-card-border rounded-lg overflow-hidden scroll-mt-20">
        {/* No sky after words that called for care or went unjudged: a sunrise is a celebration, and this is not the moment for one */}
        {!supportFirst && <Sky light={light} />}

        <div className="p-5 sm:p-8 pt-5 sm:pt-6">
          {submitted === null ? (
            <>
              {care && (
                <p className="mb-5 text-center text-foreground/85 leading-relaxed">
                  This one imagines the moment after a life ends. If that is too close today, gentler games are waiting just below.
                </p>
              )}
              {care && !goingOn ? (
                <div className="text-center">
                  <Button variant="secondary" onClick={goOn}>
                    I&apos;d still like to
                  </Button>
                </div>
              ) : (
                <>
                  <p className="mb-5 text-center text-lg sm:text-xl text-foreground leading-relaxed">
                    You open your eyes. It is quiet, and the light is soft.
                  </p>
                  <WritingForm
                    prompts={PROMPTS}
                    label="Your first words on arriving"
                    placeholder="Say it the way you would…"
                    submitLabel="Speak"
                    onSubmit={submit}
                    textareaRef={textareaRef}
                    draftKey={draftKey('first-words')}
                  />
                  <p className="mt-4 text-center text-sm text-primary-light">
                    Whatever you believe comes next, or don&apos;t, is welcome here. In a moment, you wake up.
                  </p>
                </>
              )}
            </>
          ) : awake ? (
            <div className="text-center">
              <h2 ref={morningRef} {...FOCUS_TARGET} className="text-2xl sm:text-3xl font-semibold text-foreground">
                Good morning
              </h2>
              <p className="mt-3 text-foreground/85 leading-relaxed break-words">
                {wakingLine({ words: submitted, intention: carried, judgement })}
              </p>
              {carried && safe && (
                <>
                  <TableNote note={carried} />
                  <div className="mt-5">
                    <CopyWordsButton
                      words={carried}
                      label="Copy it for tomorrow"
                      copiedMessage="Copied. Put it somewhere you will see it tomorrow."
                    />
                  </div>
                  <MorningCard note={carried} />
                </>
              )}
            </div>
          ) : (
            <div className="text-center">
              <h2 ref={beforeWakingRef} {...FOCUS_TARGET} className="text-xl sm:text-2xl font-semibold text-foreground">
                Before you wake
              </h2>
              {/* A promise of morning belongs only to words known to be an imagined ending */}
              {safe && (
                <p className="mt-1 text-primary-light">
                  {joined === null
                    ? 'Morning is close.'
                    : joined
                      ? 'Others have stood here and come back.'
                      : 'You are the first to stand here and come back.'}
                </p>
              )}
              {/* Words are only framed back once they are known to be an imagined ending, never to someone who may be in danger */}
              {safe ? (
                <blockquote className="mt-5 text-lg sm:text-xl text-foreground whitespace-pre-wrap break-words leading-relaxed">
                  &ldquo;{submitted}&rdquo;
                </blockquote>
              ) : (
                (care || unjudged) && (
                  <p className="mt-5 text-foreground/85 leading-relaxed">What you said stays with you. There is no hurry here.</p>
                )
              )}

              <div aria-live="polite" className="mt-5">
                {judgement === 'awaiting' && <p className="text-sm text-primary-light">The quiet listens…</p>}
                {reflection.text && (
                  <p className="animate-fade text-foreground/85 italic leading-relaxed text-base sm:text-lg">
                    {reflection.text}
                  </p>
                )}
                {reflection.intention && typedIntention === null && !care && (
                  <p className="sr-only">Suggested for tomorrow: {reflection.intention}</p>
                )}
              </div>

              {!unjudged && (
                <form onSubmit={wake} className="mt-6 text-left">
                  {!care && (
                    <>
                      <label htmlFor={intentionId} className="block text-sm sm:text-base font-medium text-foreground">
                        One small thing to bring back into tomorrow
                      </label>
                      <textarea
                        ref={intentionRef}
                        id={intentionId}
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
                        className="mt-2 w-full resize-none overflow-hidden px-4 py-3 border border-card-border rounded-lg bg-background text-foreground text-base sm:text-lg placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-focus-ring"
                      />
                      <p className="mt-1 text-xs sm:text-sm text-primary-light">
                        Change it, or leave it empty. It is never sent or saved anywhere; you can copy it once you wake.
                      </p>
                    </>
                  )}
                  {mayWake && (
                    <div className="mt-4 text-center">
                      <Button
                        type="submit"
                        // In care, going on is a quiet choice beside the support, never a call to action
                        variant={care ? 'secondary' : 'primary'}
                        className={care ? undefined : 'px-8 py-3 text-lg'}
                        // The second click of a double click on Speak can land here; waking should be a choice
                        onClick={(event) => event.detail > 1 && event.preventDefault()}
                      >
                        Wake up
                      </Button>
                    </div>
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
            <div className="text-center">
              <Button variant="secondary" onClick={imagineAgain}>
                Imagine it again
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
