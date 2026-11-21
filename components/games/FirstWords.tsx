'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CarePanel, CloudSection, WritingForm } from '@/components/games/community-words/WritingParts'
import { useCommunityWords } from '@/lib/games/community-words/useCommunityWords'

const PROMPTS = [
  'Who do you hope is there?',
  'What do you notice first?',
  'What finally makes sense?',
  'What did you bring with you?',
  'Is it what you expected?',
  'What would you ask whoever greets you?',
  'How do you feel, now that it is over?',
  'What do you want to say about the life you just lived?',
] as const

type Light = 'before-dawn' | 'dawn' | 'day'

const SKY: Record<Light, string> = {
  'before-dawn':
    'linear-gradient(to top, color-mix(in srgb, var(--melon-purple) 16%, transparent), transparent 85%)',
  dawn: 'linear-gradient(to top, color-mix(in srgb, var(--warm) 38%, transparent), color-mix(in srgb, var(--melon-purple) 14%, transparent) 55%, transparent)',
  day: 'linear-gradient(to top, color-mix(in srgb, var(--melon-green-light) 22%, transparent), transparent 80%)',
}

const SUN: Record<Light, string> = {
  'before-dawn': 'translate-y-3/4 opacity-40',
  dawn: 'translate-y-1/4 opacity-90',
  day: 'translate-y-0 opacity-70',
}

/** A horizon that brightens as the player arrives, and turns to ordinary daylight when they come back. */
function Horizon({ light }: { light: Light }) {
  return (
    <div className="relative h-20 sm:h-28 overflow-hidden rounded-t-lg" aria-hidden="true">
      {(Object.keys(SKY) as Light[]).map((phase) => (
        <div
          key={phase}
          className={`absolute inset-0 transition-opacity duration-[1500ms] ${phase === light ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: SKY[phase] }}
        />
      ))}
      <div
        className={`absolute bottom-0 left-1/2 -ml-10 h-10 w-20 rounded-t-full bg-[var(--warm)] transition-all duration-[1500ms] ease-out ${SUN[light]}`}
      />
      <div className="absolute bottom-0 inset-x-0 h-px bg-foreground/15" />
    </div>
  )
}

export default function FirstWords() {
  const { submitted, stored, cloud, reflection, care, submit, reset } = useCommunityWords('first-words')
  const [awake, setAwake] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const arrivedRef = useRef<HTMLHeadingElement>(null)
  const welcomeBackRef = useRef<HTMLParagraphElement>(null)
  const returningToWrite = useRef(false)

  // Keep keyboard and screen-reader users oriented when the view changes
  useEffect(() => {
    if (submitted !== null) {
      arrivedRef.current?.focus()
    } else if (returningToWrite.current) {
      returningToWrite.current = false
      textareaRef.current?.focus()
    }
  }, [submitted])

  useEffect(() => {
    if (awake) welcomeBackRef.current?.focus()
  }, [awake])

  const imagineAgain = () => {
    returningToWrite.current = true
    setAwake(false)
    reset()
  }

  const light: Light = awake ? 'day' : submitted === null ? 'before-dawn' : 'dawn'
  const before = cloud.status === 'ready' && stored ? cloud.total - 1 : null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-card-bg border border-card-border rounded-lg">
        <Horizon light={light} />

        <div className="p-5 sm:p-8 pt-4 sm:pt-6">
          {submitted === null ? (
            <>
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
              />
              <p className="mt-4 text-center text-sm text-primary-light">
                Whatever you believe comes next, or don&apos;t, is welcome here.
              </p>
            </>
          ) : (
            <div className="text-center">
              <h2 ref={arrivedRef} tabIndex={-1} className="text-xl sm:text-2xl font-semibold text-foreground focus:outline-none">
                You&apos;ve arrived
              </h2>
              <p className="mt-1 text-primary-light">
                {before === null
                  ? 'Rest a moment with what you said.'
                  : before > 0
                    ? `${before.toLocaleString()} ${before === 1 ? 'other has' : 'others have'} arrived before you.`
                    : 'You are the first to arrive.'}
              </p>
              <blockquote className="mt-5 text-lg sm:text-xl text-foreground whitespace-pre-wrap break-words leading-relaxed">
                &ldquo;{submitted}&rdquo;
              </blockquote>

              <div aria-live="polite" className="mt-6">
                {reflection.pending && <p className="text-sm text-primary-light">The quiet listens…</p>}
                {reflection.text && (
                  <p className="animate-fade text-foreground/85 italic leading-relaxed text-base sm:text-lg">
                    {reflection.text}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {submitted !== null && (
        <>
          {care && <CarePanel />}

          <CloudSection
            cloud={cloud}
            heading="What others said on arriving"
            label="Most common first words"
            source={(total) => `From ${total.toLocaleString()} ${total === 1 ? 'arrival' : 'arrivals'}.`}
          />

          <section aria-labelledby="awakening-return" className="bg-card-bg border border-card-border rounded-lg p-5 sm:p-6 text-center">
            <h3 id="awakening-return" className="text-lg font-semibold text-foreground">
              {awake ? 'Back on this side' : 'Before you go back'}
            </h3>
            {awake ? (
              <p ref={welcomeBackRef} tabIndex={-1} className="mt-2 text-foreground/85 leading-relaxed focus:outline-none">
                Welcome back to today. It&apos;s good to have you here.
              </p>
            ) : (
              <>
                <p className="mt-2 text-foreground/80 leading-relaxed">
                  What we hope to find after the end is usually something we love before it. It&apos;s here, too.
                </p>
                <Button variant="primary" className="mt-4" onClick={() => setAwake(true)}>
                  Wake up
                </Button>
              </>
            )}
          </section>

          <div className="text-center">
            <Button variant="ghost" onClick={imagineAgain}>
              Imagine it again
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
