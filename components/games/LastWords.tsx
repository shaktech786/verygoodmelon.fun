'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Button } from '@/components/ui/Button'
import { Keepsake } from '@/components/games/Keepsake'
import { CarePanel, CloudSection, CopyWordsButton, FOCUS_TARGET, QuietSupport, WritingForm } from '@/components/games/community-words/WritingParts'
import { useArrival } from '@/components/games/community-words/arrival'
import { draftKey } from '@/lib/games/community-words/draft'
import { useCommunityWords } from '@/lib/games/community-words/useCommunityWords'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { finalWordKeepsake } from '@/lib/keepsake/final-word'

const PROMPTS = [
  'What do you want the people you love to know?',
  'What took you too long to learn?',
  'What would you tell your younger self?',
  'What are you most grateful for?',
  'What made it worth it?',
  'What would you want no one to worry about?',
  'What small thing did you love most?',
  'Who would you thank?',
] as const

const FLICKER: Keyframe[] = [
  { transform: 'scale(1, 1) rotate(-1.5deg)' },
  { transform: 'scale(0.96, 1.06) rotate(1deg)' },
  { transform: 'scale(1.02, 0.97) rotate(-0.5deg)' },
]

const SMOKE_MS = 2000
// What is left of the smoke once it has risen: a trace, not a line
const SMOKE_TRACE = 0.45
// The closing words wait for the smoke and the dusk; the card follows once they have settled
const LINE_DELAY_MS = 1800
const CARD_DELAY_MS = 2800

/** One thread of smoke rising from the wick, then thinning to a faint trace. */
function Smoke({ reduceMotion }: { reduceMotion: boolean }) {
  const wisp = useRef<SVGPathElement>(null)

  useEffect(() => {
    const path = wisp.current
    if (reduceMotion || !path?.animate) return
    const rise = path.animate(
      [
        { strokeDashoffset: 80, opacity: 0, transform: 'translateY(6px) scaleX(0.8)' },
        { strokeDashoffset: 30, opacity: 0.8, transform: 'translateY(0) scaleX(1)', offset: 0.4 },
        { strokeDashoffset: 0, opacity: SMOKE_TRACE, transform: 'translateY(-4px) scaleX(1.25)' },
      ],
      { duration: SMOKE_MS, easing: 'ease-out', fill: 'backwards' }
    )
    return () => rise.cancel()
  }, [reduceMotion])

  return (
    <svg
      className="absolute left-1/2 -translate-x-1/2 overflow-visible"
      style={{ top: -12, width: 32, height: 52 }}
      viewBox="0 0 32 52"
      data-testid="candle-smoke"
    >
      <defs>
        <linearGradient id="candle-smoke-fade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--primary-light)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--primary-light)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        ref={wisp}
        d="M16 52 C 12 44, 21 38, 16 30 S 10 17, 17 10 S 21 3, 18 0"
        fill="none"
        stroke="url(#candle-smoke-fade)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="80"
        style={{ opacity: SMOKE_TRACE, transform: 'translateY(-4px) scaleX(1.25)', transformOrigin: '50% 100%', filter: 'blur(0.6px)' }}
      />
    </svg>
  )
}

/** A small candle that burns while the player writes and goes out when they let it. */
function Candle({ lit }: { lit: boolean }) {
  const flame = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!lit || reduceMotion || !flame.current?.animate) return
    const flicker = flame.current.animate(FLICKER, {
      duration: 2600,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'ease-in-out',
    })
    return () => flicker.cancel()
  }, [lit, reduceMotion])

  return (
    <div className="relative mx-auto h-24 w-16" aria-hidden="true" data-testid="candle">
      <div
        className={`absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2 rounded-full transition-opacity duration-1000 ${lit ? 'opacity-60' : 'opacity-0'}`}
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--warm) 55%, transparent), transparent 65%)' }}
      />
      <div
        ref={flame}
        className={`absolute left-1/2 top-4 -ml-2 h-7 w-4 origin-bottom transition-opacity duration-500 ${lit ? 'opacity-100' : 'opacity-0'}`}
        style={{
          borderRadius: '50% 50% 45% 45% / 65% 65% 35% 35%',
          background: 'radial-gradient(circle at 50% 75%, var(--melon-yellow), var(--warm) 55%, var(--melon-orange))',
        }}
      />
      {!lit && <Smoke reduceMotion={reduceMotion} />}
      <div className="absolute left-1/2 top-[2.6rem] h-2 w-0.5 -translate-x-1/2 bg-foreground/60" />
      <div className="absolute bottom-0 left-1/2 h-12 w-8 -translate-x-1/2 rounded-t-sm border border-card-border bg-accent-soft" />
    </div>
  )
}

interface GoodnightProps {
  words: string
  prompt: string
  lineRef: RefObject<HTMLParagraphElement | null>
}

/** After the candle: the closing words, then the player's words on a card to keep. */
function Goodnight({ words, prompt, lineRef }: GoodnightProps) {
  const reduceMotion = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const [day] = useState(() => new Date())
  const plan = useMemo(() => finalWordKeepsake({ words, prompt, day }), [words, prompt, day])
  useArrival(lineRef, { delay: LINE_DELAY_MS, reduceMotion })
  useArrival(cardRef, { delay: CARD_DELAY_MS, reduceMotion })

  return (
    <div className="mt-6">
      <p ref={lineRef} {...FOCUS_TARGET} className="text-lg text-foreground/90 leading-relaxed">
        The candle is out. What you wrote is still yours to carry, or to say.
      </p>
      <div ref={cardRef} className="mt-6">
        <Keepsake plan={plan} label="Your words, on a card to keep" />
      </div>
    </div>
  )
}

export default function LastWords() {
  // Care lasts for the visit, so the flame stays away even for the next words
  const { submitted, stored, cloud, reflection, care, judgedSafe, submit, reset } = useCommunityWords('last-words')
  const [candleOut, setCandleOut] = useState(false)
  const [prompt, setPrompt] = useState('')
  const reduceMotion = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const thanksRef = useRef<HTMLHeadingElement>(null)
  const goodnightRef = useRef<HTMLParagraphElement>(null)
  const returningToWrite = useRef(false)

  // Keep keyboard and screen-reader users oriented when the view changes
  useEffect(() => {
    if (submitted !== null) {
      thanksRef.current?.focus()
    } else if (returningToWrite.current) {
      returningToWrite.current = false
      textareaRef.current?.focus()
    }
  }, [submitted])

  // The smoke rises at the top of the card, so the card comes into view as the candle goes out
  useEffect(() => {
    if (!candleOut) return
    cardRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
    goodnightRef.current?.focus({ preventScroll: true })
  }, [candleOut, reduceMotion])

  const writeAnother = () => {
    returningToWrite.current = true
    setCandleOut(false)
    reset()
  }

  const others = cloud.status === 'ready' && stored ? cloud.total - 1 : null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {care && submitted === null && <CarePanel />}

      <div ref={cardRef} className="relative bg-card-bg border border-card-border rounded-lg p-5 sm:p-8 scroll-mt-20">
        <div
          aria-hidden="true"
          data-testid="dusk"
          className={`pointer-events-none absolute inset-0 rounded-lg transition-opacity duration-[2000ms] ease-in-out ${candleOut ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background:
              'linear-gradient(to bottom, color-mix(in srgb, var(--melon-indigo) 14%, transparent), color-mix(in srgb, var(--melon-purple) 6%, transparent) 70%, transparent)',
          }}
        />
        {/* A flame beside words that may come from real danger is the wrong picture, lit or put out */}
        {!care && <Candle lit={!candleOut} />}

        {submitted === null ? (
          <div className="relative mt-4">
            {care && (
              <p className="mb-5 text-center text-foreground/85 leading-relaxed">
                There is no need to write about endings today. If you would rather, gentler games are waiting just below.
              </p>
            )}
            <WritingForm
              prompts={PROMPTS}
              label="Your final words"
              placeholder="Write it the way you would say it…"
              submitLabel="Leave these words"
              onSubmit={(words, shown) => {
                setPrompt(shown)
                submit(words)
              }}
              textareaRef={textareaRef}
              draftKey={draftKey('last-words')}
            />
            <p className="mt-4 text-center text-sm text-primary-light">
              Anonymous. Nothing is asked of you but a few honest words.
            </p>
          </div>
        ) : (
          <div className="relative mt-4 text-center">
            <h2 ref={thanksRef} {...FOCUS_TARGET} className="text-xl sm:text-2xl font-semibold text-foreground">
              {care ? 'We’re glad you wrote this down' : 'Thank you for writing this'}
            </h2>
            {/* Silent while the count is unknown, but its line is kept so nothing below jumps under a second tap */}
            <p className="mt-1 min-h-[1.6em] text-primary-light">
              {others === null
                ? null
                : others > 0
                  ? `It joins what ${others.toLocaleString()} ${others === 1 ? 'other person' : 'others'} would say.`
                  : 'Yours are the first words here.'}
            </p>
            <blockquote className="mt-5 text-lg sm:text-xl text-foreground whitespace-pre-wrap break-words leading-relaxed">
              &ldquo;{submitted}&rdquo;
            </blockquote>
            {candleOut && judgedSafe && <Goodnight words={submitted} prompt={prompt} lineRef={goodnightRef} />}
          </div>
        )}
      </div>

      {submitted !== null && (
        <>
          {care && <CarePanel />}

          <div aria-live="polite">
            {reflection.pending && (
              <p className="text-center text-sm text-primary-light py-2">Sitting with your words…</p>
            )}
            {reflection.text && (
              <p className="animate-fade px-2 sm:px-6 text-center text-foreground/85 italic leading-relaxed text-base sm:text-lg">
                {reflection.text}
              </p>
            )}
          </div>

          {reflection.unjudged && !care && <QuietSupport />}

          <CloudSection
            cloud={cloud}
            heading="What others would say at the end"
            label="Most common last words"
            source={(total) => `From ${total.toLocaleString()} ${total === 1 ? 'person' : 'people'}.`}
          />

          {/* Urging words out into the world is only safe once they have been heard as an imagined ending */}
          {!care && !reflection.unjudged && !reflection.pending && (
            <section aria-labelledby="final-word-now" className="bg-card-bg border border-card-border rounded-lg p-5 sm:p-6 text-center">
              <h3 id="final-word-now" className="text-lg font-semibold text-foreground">These don&apos;t have to wait</h3>
              <p className="mt-2 text-foreground/80 leading-relaxed">
                Most last words are things we could already say. Is there someone who would like to hear yours now?
              </p>
              <div className="mt-4 flex justify-center">
                <CopyWordsButton words={submitted} label="Copy my words" copiedMessage="Your words are copied, ready to send." />
              </div>
            </section>
          )}

          <div className="text-center space-y-4">
            {judgedSafe && !candleOut && (
              <Button variant="primary" onClick={() => setCandleOut(true)}>
                Blow out the candle
              </Button>
            )}
            <div>
              <Button variant="secondary" onClick={writeAnother}>
                Write another
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
