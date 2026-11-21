'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { CARE_GAMES } from '@/components/games/CrossGameSuggestions'
import { CarePanel, CloudSection, CopyWordsButton, FOCUS_TARGET, QuietSupport, WritingForm } from '@/components/games/community-words/WritingParts'
import { draftKey } from '@/lib/games/community-words/draft'
import { useCommunityWords } from '@/lib/games/community-words/useCommunityWords'
import { wakingLine } from '@/lib/games/community-words/waking'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

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

const STARS = [
  [8, 18], [17, 46], [26, 12], [35, 34], [44, 8], [56, 28], [63, 14], [72, 40], [81, 10], [90, 30], [12, 60], [68, 58],
] as const

/** The sky over the whole visit: night on the other side, dawn on the way back, morning once awake. */
function Sky({ light }: { light: Light }) {
  return (
    <div className="relative h-32 sm:h-40 overflow-hidden" aria-hidden="true">
      {(Object.keys(SKY) as Light[]).map((phase) => (
        <div
          key={phase}
          data-sky={phase}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ${phase === light ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: SKY[phase] }}
        />
      ))}
      {STARS.map(([left, top]) => (
        <span
          key={`${left}-${top}`}
          className={`absolute h-0.5 w-0.5 rounded-full bg-white transition-opacity duration-[2000ms] ${light === 'night' ? 'opacity-80' : light === 'dawn' ? 'opacity-30' : 'opacity-0'}`}
          style={{ left: `${left}%`, top: `${top}%` }}
        />
      ))}
      <div
        className={`absolute bottom-6 left-1/2 -ml-7 h-14 w-14 rounded-full transition-[transform,background-color,box-shadow] duration-[2000ms] ease-out ${SUN[light].position}`}
        style={{
          backgroundColor: SUN[light].color,
          boxShadow: `0 0 ${light === 'day' ? '36px 12px' : '24px 6px'} color-mix(in srgb, ${SUN[light].color} 55%, transparent)`,
        }}
      />
      <svg className="absolute inset-x-0 bottom-0 h-10 w-full" viewBox="0 0 400 40" preserveAspectRatio="none">
        <path
          d="M0 28 C 60 10, 120 12, 190 24 S 320 8, 400 22 L 400 40 L 0 40 Z"
          className="transition-[fill] duration-[2000ms]"
          style={{ fill: light === 'day' ? GROUND_BY_DAY : GROUND_IN_THE_DARK }}
        />
      </svg>
    </div>
  )
}

/** In place of imagining it again, once someone may be in danger: somewhere calm, with support already on screen. */
function GentleExit() {
  return (
    <nav aria-label="Somewhere calm to go next" className="text-center">
      <p className="text-foreground/85">When you are ready, somewhere calm:</p>
      <ul className="mt-3 flex flex-wrap justify-center gap-3">
        {CARE_GAMES.map((game) => (
          <li key={game.id}>
            <Link
              href={`/games/${game.slug}`}
              className="inline-flex items-center min-h-11 px-5 rounded-lg border border-card-border bg-card-bg text-foreground font-medium hover:bg-hover-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {game.title}: {game.description}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function FirstWords() {
  // Care lasts for the visit, so every later arrival is met the gentle way too
  const { submitted, stored, cloud, reflection, care, submit, reset, noticeDistress } = useCommunityWords('first-words')
  const [typedIntention, setTypedIntention] = useState<string | null>(null)
  const [carried, setCarried] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()
  const sceneRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const beforeWakingRef = useRef<HTMLHeadingElement>(null)
  const morningRef = useRef<HTMLHeadingElement>(null)
  const returningToWrite = useRef(false)
  const intentionId = useId()

  const awake = carried !== null
  // The suggestion fills the box until the player writes their own
  const intention = typedIntention ?? reflection.intention

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

  // The sky turning to morning is the payoff, so bring it on screen before focus moves
  useEffect(() => {
    if (!awake) return
    sceneRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
    morningRef.current?.focus({ preventScroll: true })
  }, [awake, reduceMotion])

  const wake = (event: FormEvent) => {
    event.preventDefault()
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
  const before = cloud.status === 'ready' && stored ? cloud.total - 1 : null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {care && submitted === null && <CarePanel />}

      <div ref={sceneRef} className="bg-card-bg border border-card-border rounded-lg overflow-hidden scroll-mt-20">
        <Sky light={light} />

        <div className="p-5 sm:p-8 pt-5 sm:pt-6">
          {submitted === null ? (
            <>
              {care && (
                <p className="mb-5 text-center text-foreground/85 leading-relaxed">
                  This one imagines the moment after a life ends. If that is too close today, gentler games are waiting just below.
                </p>
              )}
              <p className="mb-5 text-center text-lg sm:text-xl text-foreground leading-relaxed">
                You open your eyes. It is quiet, and nothing hurts.
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
          ) : awake ? (
            <div className="text-center">
              <h2 ref={morningRef} {...FOCUS_TARGET} className="text-2xl sm:text-3xl font-semibold text-foreground">
                Good morning
              </h2>
              <p className="mt-3 text-foreground/85 leading-relaxed break-words">
                {wakingLine({ words: submitted, intention: carried, care })}
              </p>
              {carried && !care && (
                <>
                  <p className="mt-4 rounded-lg border border-card-border border-l-4 border-l-[var(--warm)] bg-background px-5 py-4 text-left text-lg sm:text-xl font-medium text-foreground break-words">
                    {carried}
                  </p>
                  <div className="mt-4">
                    <CopyWordsButton
                      words={carried}
                      label="Copy it for tomorrow"
                      copiedMessage="Copied. Put it somewhere you will see it tomorrow."
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center">
              <h2 ref={beforeWakingRef} {...FOCUS_TARGET} className="text-xl sm:text-2xl font-semibold text-foreground">
                Before you wake
              </h2>
              <p className="mt-1 text-primary-light">
                {before === null
                  ? 'Morning is close.'
                  : before > 0
                    ? `${before.toLocaleString()} ${before === 1 ? 'other has' : 'others have'} stood here and come back.`
                    : 'You are the first to stand here and come back.'}
              </p>
              <blockquote className="mt-5 text-lg sm:text-xl text-foreground whitespace-pre-wrap break-words leading-relaxed">
                &ldquo;{submitted}&rdquo;
              </blockquote>

              <div aria-live="polite" className="mt-5">
                {reflection.pending && <p className="text-sm text-primary-light">The quiet listens…</p>}
                {reflection.text && (
                  <p className="animate-fade text-foreground/85 italic leading-relaxed text-base sm:text-lg">
                    {reflection.text}
                  </p>
                )}
                {reflection.intention && typedIntention === null && !care && (
                  <p className="sr-only">Suggested for tomorrow: {reflection.intention}</p>
                )}
              </div>

              <form onSubmit={wake} className="mt-6 text-left">
                {!care && (
                  <>
                    <label htmlFor={intentionId} className="block text-sm sm:text-base font-medium text-foreground">
                      One small thing to bring back into tomorrow
                    </label>
                    <input
                      id={intentionId}
                      type="text"
                      value={intention}
                      onChange={(e) => setTypedIntention(e.target.value)}
                      maxLength={MAX_INTENTION_LENGTH}
                      placeholder="Something small you could do tomorrow…"
                      className="mt-2 w-full px-4 py-3 border border-card-border rounded-lg bg-background text-foreground text-base sm:text-lg placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <p className="mt-1 text-xs sm:text-sm text-primary-light">
                      Change it, or leave it empty. It is never sent or saved anywhere; you can copy it once you wake.
                    </p>
                  </>
                )}
                <div className="mt-4 text-center">
                  <Button
                    type="submit"
                    variant="primary"
                    className="px-8 py-3 text-lg"
                    // The second click of a double click on Speak can land here; waking should be a choice
                    onClick={(event) => event.detail > 1 && event.preventDefault()}
                  >
                    Wake up
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {submitted !== null && (
        <>
          {care && <CarePanel />}
          {reflection.unjudged && !care && <QuietSupport />}

          <CloudSection
            cloud={cloud}
            heading="What others said on the other side"
            label="Most common first words"
            source={(total) => `From ${total.toLocaleString()} ${total === 1 ? 'visit' : 'visits'}.`}
          />

          {/* Someone who may be in danger is not invited to picture their death again */}
          {care ? (
            <GentleExit />
          ) : (
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
