'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Go } from '@/components/seedpress/Go'
import { Stamp } from '@/components/seedpress/Stamp'
import { StickyTray } from '@/components/seedpress/StickyTray'
import { Keepsake } from '@/components/games/Keepsake'
import { CarePanel, CloudSection, CopyWordsButton, FOCUS_TARGET, GentleExit, QuietSupport, WritingForm } from '@/components/games/community-words/WritingParts'
import { useArrival } from '@/components/games/community-words/arrival'
import { draftKey } from '@/lib/games/community-words/draft'
import { useCommunityWords } from '@/lib/games/community-words/useCommunityWords'
import { useSense } from '@/lib/design/sense'
import { finalWordKeepsake } from '@/lib/keepsake/final-word'
import { cn } from '@/lib/utils/cn'
import styles from './LastWords.module.css'

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

const SMOKE_MS = 1600
// What is left of the smoke once it has risen: a trace, not a line
const SMOKE_TRACE = 0.45
// The closing words wait for the smoke and the dusk; the card follows once they have settled
const LINE_DELAY_MS = 1600
const CARD_DELAY_MS = 2300

/** One thread of smoke rising from the wick, then thinning to a faint trace. */
function Smoke({ motionScale }: { motionScale: 0 | 1 }) {
  const wisp = useRef<SVGPathElement>(null)

  useEffect(() => {
    const path = wisp.current
    if (motionScale === 0 || !path?.animate) return
    const rise = path.animate(
      [
        { strokeDashoffset: 80, opacity: 0, transform: 'translateY(6px) scaleX(0.8)' },
        { strokeDashoffset: 30, opacity: 0.8, transform: 'translateY(0) scaleX(1)', offset: 0.4 },
        { strokeDashoffset: 0, opacity: SMOKE_TRACE, transform: 'translateY(-4px) scaleX(1.25)' },
      ],
      { duration: SMOKE_MS, easing: 'ease-out', fill: 'backwards' }
    )
    return () => rise.cancel()
  }, [motionScale])

  return (
    <svg
      className="absolute left-1/2 -translate-x-1/2 overflow-visible"
      style={{ top: -12, width: 32, height: 52 }}
      viewBox="0 0 32 52"
      data-testid="candle-smoke"
    >
      <defs>
        <linearGradient id="candle-smoke-fade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--ink-soft)', stopOpacity: 0.9 }} />
          <stop offset="1" style={{ stopColor: 'var(--ink-soft)', stopOpacity: 0 }} />
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
        style={{ opacity: SMOKE_TRACE, transform: 'translateY(-4px) scaleX(1.25)', transformOrigin: '50% 100%' }}
      />
    </svg>
  )
}

/**
 * A small candle with a pixel flame. The flame is printed in two inks and never flickers: its second ink rests
 * a pixel out of register, and once the words are judged safe it settles into register in one 700 ms press.
 * Judgement is never undone while the words stay, so switching the sense dial later does not replay it.
 * In Quiet or reduced motion the flame is simply registered.
 */
function Candle({ lit, judgedSafe, motionScale }: { lit: boolean; judgedSafe: boolean; motionScale: 0 | 1 }) {
  return (
    <div className={cn(styles.candle, !judgedSafe && motionScale === 1 && styles.unsettled)} aria-hidden="true" data-testid="candle">
      <svg viewBox="0 0 32 48" shapeRendering="crispEdges" focusable="false">
        <g className={cn(styles.flame, !lit && styles.flameOut)}>
          <circle cx="16" cy="12" r="14" className={styles.halo} />
          <g className={styles.flameOuter}>
            <rect x="15" y="2" width="2" height="2" />
            <rect x="14" y="4" width="4" height="2" />
            <rect x="12" y="6" width="8" height="8" />
            <rect x="14" y="14" width="4" height="2" />
          </g>
          <g className={styles.flameCore}>
            <rect x="15" y="6" width="2" height="2" />
            <rect x="14" y="8" width="4" height="6" />
          </g>
        </g>
        <rect x="15" y="16" width="2" height="4" className={styles.wick} />
        <rect x="8" y="20" width="16" height="28" className={styles.waxBody} />
        <rect x="19" y="20" width="5" height="28" className={styles.waxShade} />
        <rect x="8" y="20" width="16" height="2" className={styles.waxEdge} />
        <rect x="8" y="22" width="3" height="6" className={styles.waxEdge} />
      </svg>
      {!lit && <Smoke motionScale={motionScale} />}
    </div>
  )
}

interface GoodnightProps {
  words: string
  prompt: string
  lineRef: RefObject<HTMLParagraphElement | null>
  motionScale: 0 | 1
}

/** After the candle: the closing words, then the player's words on a card to keep. */
function Goodnight({ words, prompt, lineRef, motionScale }: GoodnightProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [day] = useState(() => new Date())
  const plan = useMemo(() => finalWordKeepsake({ words, prompt, day }), [words, prompt, day])
  useArrival(lineRef, { delay: LINE_DELAY_MS, motionScale })
  useArrival(cardRef, { delay: CARD_DELAY_MS, motionScale })

  return (
    <div className={styles.goodnight}>
      <p ref={lineRef} {...FOCUS_TARGET}>
        The candle is out. What you wrote is still yours to carry, or to say.
      </p>
      <div ref={cardRef}>
        <Keepsake plan={plan} label="Your words, on a card to keep" />
      </div>
    </div>
  )
}

export default function LastWords() {
  // Care lasts for the visit, so the flame stays away even for the next words
  const { submitted, stored, cloud, reflection, care, judgement, submit, reset } = useCommunityWords('last-words')
  const safe = judgement === 'safe'
  const unjudged = judgement === 'unjudged'
  const [candleOut, setCandleOut] = useState(false)
  const [prompt, setPrompt] = useState('')
  const { motionScale } = useSense()
  // Read through a ref, so switching the sense dial later never scrolls the page or moves focus
  const smooth = useRef(motionScale === 1)
  useEffect(() => {
    smooth.current = motionScale === 1
  }, [motionScale])
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
    cardRef.current?.scrollIntoView({ block: 'start', behavior: smooth.current ? 'smooth' : 'auto' })
    goodnightRef.current?.focus({ preventScroll: true })
  }, [candleOut])

  const writeAnother = () => {
    returningToWrite.current = true
    setCandleOut(false)
    reset()
  }

  const joined = cloud.status === 'ready' && stored ? cloud.total > 1 : null

  return (
    <div className={styles.page}>
      {care && submitted === null && <CarePanel />}

      <div ref={cardRef} className={styles.scene}>
        <div aria-hidden="true" data-testid="dusk" className={cn(styles.dusk, candleOut && styles.fallen)} />
        {/* A flame beside words that may come from real danger is the wrong picture, lit or put out */}
        {!care && <Candle lit={!candleOut} judgedSafe={safe} motionScale={motionScale} />}

        {submitted === null ? (
          <div className={styles.inner}>
            {care && (
              <p className="sp-lead">
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
            <p className="sp-soft">Anonymous. Nothing is asked of you but a few honest words.</p>
          </div>
        ) : (
          <div className={styles.inner}>
            <h2 ref={thanksRef} {...FOCUS_TARGET} className="sp-h2">
              {care ? 'We’re glad you wrote this down' : 'Thank you for writing this'}
            </h2>
            {/* Silent until the cloud has answered, but its line is kept so nothing below jumps under a second tap */}
            <p className="sp-soft min-h-[1.6em]">
              {joined === null ? null : joined ? 'It joins what others would say.' : 'Yours are the first words here.'}
            </p>
            {/* Words are only framed back once they are known to be an imagined ending, never to someone who may be in danger */}
            {safe ? (
              <blockquote className={styles.words}>&ldquo;{submitted}&rdquo;</blockquote>
            ) : (
              (care || unjudged) && <p>What you wrote stays with you. There is no hurry here.</p>
            )}
            {safe && !candleOut && (
              <StickyTray pinned={false}>
                <Go onClick={() => setCandleOut(true)}>Blow out the candle</Go>
              </StickyTray>
            )}
            {candleOut && safe && <Goodnight words={submitted} prompt={prompt} lineRef={goodnightRef} motionScale={motionScale} />}
          </div>
        )}
      </div>

      {submitted !== null && (
        <>
          {care && <CarePanel />}

          <div aria-live="polite" className="grid gap-3">
            {judgement === 'awaiting' && <p className="sp-soft">Sitting with your words…</p>}
            {reflection.text && <p className={styles.reflection}>{reflection.text}</p>}
          </div>

          {unjudged && <QuietSupport />}

          <CloudSection
            cloud={cloud}
            heading="What others would say at the end"
            label="Most common last words"
          />

          {/* Urging words out into the world is only safe once they have been heard as an imagined ending */}
          {safe && (
            <section aria-labelledby="final-word-now" className={cn('sp-sheet', styles.now)}>
              <h3 id="final-word-now" className="sp-h3">These don&apos;t have to wait</h3>
              <p>
                Most last words are things we could already say. Is there someone who would like to hear yours now?
              </p>
              <CopyWordsButton words={submitted} label="Copy my words" copiedMessage="Your words are copied, ready to send." />
            </section>
          )}

          {/* Words not known to be safe are not met with an invitation to write about an ending again */}
          {unjudged && <GentleExit />}
          {(safe || care) && (
            <div>
              <Stamp onClick={writeAnother}>Write another</Stamp>
            </div>
          )}
        </>
      )}
    </div>
  )
}
