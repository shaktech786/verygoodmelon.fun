'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CarePanel, CloudSection, CopyWordsButton, FOCUS_TARGET, QuietSupport, WritingForm } from '@/components/games/community-words/WritingParts'
import { draftKey } from '@/lib/games/community-words/draft'
import { useCommunityWords } from '@/lib/games/community-words/useCommunityWords'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

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
        className={`absolute left-1/2 top-4 -ml-2 h-7 w-4 origin-bottom transition-opacity duration-1000 ${lit ? 'opacity-100' : 'opacity-0'}`}
        style={{
          borderRadius: '50% 50% 45% 45% / 65% 65% 35% 35%',
          background: 'radial-gradient(circle at 50% 75%, var(--melon-yellow), var(--warm) 55%, var(--melon-orange))',
        }}
      />
      <div className="absolute left-1/2 top-[2.6rem] h-2 w-0.5 -translate-x-1/2 bg-foreground/60" />
      <div className="absolute bottom-0 left-1/2 h-12 w-8 -translate-x-1/2 rounded-t-sm border border-card-border bg-accent-soft" />
    </div>
  )
}

export default function LastWords() {
  // Care lasts for the visit, so the flame stays away even for the next words
  const { submitted, stored, cloud, reflection, care, submit, reset } = useCommunityWords('last-words')
  const [candleOut, setCandleOut] = useState(false)
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

  useEffect(() => {
    if (candleOut) goodnightRef.current?.focus()
  }, [candleOut])

  const writeAnother = () => {
    returningToWrite.current = true
    setCandleOut(false)
    reset()
  }

  const others = cloud.status === 'ready' && stored ? cloud.total - 1 : null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {care && submitted === null && <CarePanel />}

      <div className="bg-card-bg border border-card-border rounded-lg p-5 sm:p-8">
        {/* A flame beside words that may come from real danger is the wrong picture, lit or put out */}
        {!care && <Candle lit={!candleOut} />}

        {submitted === null ? (
          <div className="mt-4">
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
              onSubmit={submit}
              textareaRef={textareaRef}
              draftKey={draftKey('last-words')}
            />
            <p className="mt-4 text-center text-sm text-primary-light">
              Anonymous. Nothing is asked of you but a few honest words.
            </p>
          </div>
        ) : (
          <div className="mt-4 text-center">
            <h2 ref={thanksRef} {...FOCUS_TARGET} className="text-xl sm:text-2xl font-semibold text-foreground">
              {care ? 'We’re glad you wrote this down' : 'Thank you for writing this'}
            </h2>
            <p className="mt-1 text-primary-light">
              {others === null
                ? 'Take a moment with what you wrote.'
                : others > 0
                  ? `It joins what ${others.toLocaleString()} ${others === 1 ? 'other person' : 'others'} would say.`
                  : 'Yours are the first words here.'}
            </p>
            <blockquote className="mt-5 text-lg sm:text-xl text-foreground whitespace-pre-wrap break-words leading-relaxed">
              &ldquo;{submitted}&rdquo;
            </blockquote>
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
                Most last words are things we could say today. Is there someone who would like to hear yours now?
              </p>
              <div className="mt-4 flex justify-center">
                <CopyWordsButton words={submitted} label="Copy my words" copiedMessage="Your words are copied, ready to send." />
              </div>
            </section>
          )}

          <div className="text-center space-y-4">
            {!care &&
              (candleOut ? (
                <p ref={goodnightRef} {...FOCUS_TARGET} className="text-foreground/85 leading-relaxed">
                  The candle is out. What you wrote is still yours to carry, or to say.
                </p>
              ) : (
                <Button variant="primary" onClick={() => setCandleOut(true)}>
                  Blow out the candle
                </Button>
              ))}
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
