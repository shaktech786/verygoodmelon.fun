'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { KeepsakeSave } from '@/components/games/Keepsake'
import { useCareMode } from '@/components/games/CareMode'
import { OwnSupportMark } from '@/components/games/OwnSupport'
import { CareBlock } from '@/components/seedpress/CareBlock'
import { Go } from '@/components/seedpress/Go'
import { Icon } from '@/components/seedpress/icons/Icon'
import { InlineConfirm } from '@/components/seedpress/InlineConfirm'
import { InkLink } from '@/components/seedpress/Link'
import { Note } from '@/components/seedpress/Note'
import { PlaceStamps } from '@/components/seedpress/PlaceStamps'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { Stamp } from '@/components/seedpress/Stamp'
import { StatusLine } from '@/components/seedpress/StatusLine'
import { StickyTray } from '@/components/seedpress/StickyTray'
import { WritingSlip } from '@/components/seedpress/WritingSlip'
import { DIRECTORY_LINE } from '@/lib/care/helplines'
import { soundsLikeDistress } from '@/lib/games/community-words/moderation'
import { CarryScreen } from '@/components/games/hard-talk/CarryScreen'
import { BreathMelon, StepOutArt, ThresholdArt } from '@/components/games/hard-talk/ThresholdArt'
import styles from '@/components/games/hard-talk/HardTalk.module.css'
import { plainSpeakerKeepsake } from '@/lib/keepsake/plain-speaker'
import { cn } from '@/lib/utils/cn'
import { useSense } from '@/lib/design/sense'
import {
  CHECK_INS,
  KINDNESS,
  SETTLE,
  TALKS,
  TALK_KINDS,
  TEXT_MAX,
  WHO_MAX,
  pick,
  themLine,
  worriesFor,
  type CheckInId,
  type TalkKind,
} from '@/lib/games/hard-talk/content'
import { STAGES, nextStep, previousStep, stageOf, stepPosition, type StepId } from '@/lib/games/hard-talk/flow'
import {
  carryNotes,
  chooseKind,
  decideReturn,
  newSession,
  readSaved,
  writeSaved,
  type Session,
} from '@/lib/games/hard-talk/session'

type View = 'steps' | 'offer' | 'check-in' | 'step-out'

const BREATHS_OFFERED = 3
const NEAR_LIMIT = 40

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** A shape, not only a colour, shows which option is chosen: the tick. */
function ChoiceFace({ selected, children }: { selected: boolean; children: ReactNode }) {
  return (
    <span className="sp-choice__face">
      <span className="sp-choice__mark">{selected && <Icon name="done" />}</span>
      <span>{children}</span>
    </span>
  )
}

/** Keeps a text box in view when a phone keyboard slides up over it. */
function keepInView(element: HTMLElement, smooth: boolean) {
  const viewport = window.visualViewport
  if (!viewport) return
  const onResize = () => element.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
  viewport.addEventListener('resize', onResize)
  element.addEventListener('blur', () => viewport.removeEventListener('resize', onResize), { once: true })
}

function charactersLeft(value: string, max: number): ReactNode {
  const left = max - value.length
  if (left > NEAR_LIMIT) return null
  return <span aria-live="polite">{left === 0 ? 'That’s the most this box holds.' : `${left} characters left`}</span>
}

function Quote({ children }: { children: ReactNode }) {
  return <span className={styles.quote}>“{children}”</span>
}

interface Opening {
  view: View
  session: Session
  storageWorks: boolean
  welcomeBack: boolean
  /** A fresh start replaces whatever was kept, so old words are let go straight away. */
  replacesSaved: boolean
}

function openGame(): Opening {
  const saved = readSaved(browserStorage())
  const now = Date.now()
  const plan = decideReturn(saved.session, now)
  if (plan.type === 'fresh') {
    return {
      view: 'steps',
      session: newSession(plan.run, now),
      storageWorks: saved.available,
      welcomeBack: false,
      replacesSaved: saved.session !== null,
    }
  }
  return {
    view: plan.type === 'resume' ? 'steps' : plan.type,
    session: plan.session,
    storageWorks: saved.available,
    welcomeBack: plan.type === 'resume' && plan.session.step !== 'kind' && plan.session.step !== 'carry',
    replacesSaved: false,
  }
}

const subscribeToNothing = () => () => {}
const clock = () => Date.now()
const stamped = (session: Session): Session => ({ ...session, updatedAt: clock() })

export default function HardTalk() {
  // Saved progress lives only in this browser, so the game is drawn once the page has hydrated.
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false)
  const { care } = useCareMode()
  return (
    <div id="hard-talk" className={styles.root}>
      {hydrated ? (
        <HardTalkGame />
      ) : (
        <section aria-label="Before the talk" aria-busy="true" className={cn(styles.card, styles.skeleton)} />
      )}
      <p className="sp-soft">What you write stays in this browser and is never sent anywhere. Starting over clears it.</p>
      {/* In care the page's own care block carries the helplines, so this note steps aside */}
      {!care && (
        <aside aria-label="Support">
          <Note>
            This is a moment to steady yourself, not a substitute for support. If a conversation could put your safety at
            risk, you deserve help with it: <InkLink href={DIRECTORY_LINE.href}>{DIRECTORY_LINE.label}</InkLink> lists
            free, confidential support.
          </Note>
        </aside>
      )}
    </div>
  )
}

function HardTalkGame() {
  const { motionScale } = useSense()
  const reducedMotion = motionScale === 0
  const [opening] = useState(openGame)
  const [view, setView] = useState<View>(opening.view)
  const [session, setSession] = useState<Session>(opening.session)
  const [storageWorks, setStorageWorks] = useState(opening.storageWorks)
  const [welcomeBack, setWelcomeBack] = useState(opening.welcomeBack)
  const [confirmingStartOver, setConfirmingStartOver] = useState<'top' | 'bottom' | null>(null)
  const [breathingIn, setBreathingIn] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const [onScreen, setOnScreen] = useState(false)
  const [day] = useState(() => new Date())
  const headingRef = useRef<HTMLHeadingElement>(null)
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)
  const keepOnScreenRef = useRef<HTMLButtonElement>(null)
  const revealResponse = useRef(false)
  const { enterCareMode } = useCareMode()
  // Words that sound like someone in danger are met with support, never made into a card to keep or share
  const distressed = [session.who, session.understand, session.ownOpening].some(soundsLikeDistress)

  useEffect(() => {
    if (distressed) enterCareMode()
  }, [distressed, enterCareMode])

  useEffect(() => {
    if (opening.replacesSaved) writeSaved(browserStorage(), opening.session)
  }, [opening])

  useEffect(() => {
    if (focusRequest === 0) return
    const field = fieldRef.current
    if (!field) {
      headingRef.current?.focus()
      return
    }
    // Typing should go straight into the box; the heading still describes it to screen readers.
    headingRef.current?.scrollIntoView({ block: 'nearest' })
    field.focus({ preventScroll: true })
  }, [focusRequest])

  useEffect(() => {
    if (!revealResponse.current) return
    revealResponse.current = false
    const response = responseRef.current
    if (!response) return
    const { top, bottom } = response.getBoundingClientRect()
    if (top < 0 || bottom > window.innerHeight) {
      response.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
    }
  }, [session.worry, session.checkIn, reducedMotion])

  const save = (next: Session) => {
    setSession(next)
    if (!writeSaved(browserStorage(), next)) setStorageWorks(false)
  }
  const update = (change: (s: Session) => Session) => save(stamped(change(session)))

  const moveOn = () => {
    setFocusRequest((n) => n + 1)
    setWelcomeBack(false)
    setConfirmingStartOver(null)
    setBreathingIn(false)
    setView('steps')
  }

  const goTo = (step: StepId) => {
    moveOn()
    update((s) => ({ ...s, step, finishedAt: step === 'carry' ? (s.finishedAt ?? clock()) : null }))
  }

  const next = () => {
    const step = nextStep(session.kind, session.step)
    if (step) goTo(step)
  }
  const back = () => {
    const step = previousStep(session.kind, session.step)
    if (step) goTo(step)
  }

  const startOver = () => {
    moveOn()
    save(newSession(session.run + 1, clock()))
  }

  const pickKind = (kind: TalkKind) => {
    moveOn()
    update((s) => ({ ...chooseKind(s, kind), step: nextStep(kind, 'kind') ?? 'who' }))
  }

  const breathe = () => {
    if (breathingIn) update((s) => ({ ...s, breaths: s.breaths + 1 }))
    setBreathingIn(!breathingIn)
  }

  const kind = session.kind ?? 'other'
  const notes = carryNotes(session)
  const pocketCard = useMemo(
    () => plainSpeakerKeepsake({ line: notes.line, begin: notes.begin, day }),
    [notes.line, notes.begin, day],
  )
  const talk = TALKS[kind]
  const { index, total } = stepPosition(session.kind, session.step)
  const stage = stageOf(session.kind, session.step)
  const progress = view === 'check-in' ? 1 : (index - 1) / (total - 1)
  const hasWritten = Boolean(session.who || session.understand || session.ownOpening)
  const canStartOver = view === 'steps' && (session.step !== 'kind' || hasWritten || session.kind !== null)

  const heading = (text: string) => (
    <h2 ref={headingRef} id="hard-talk-heading" tabIndex={-1} className={cn('sp-h3', styles.heading)}>
      {text}
    </h2>
  )
  const sub = (text: string) => <p id="hard-talk-sub" className={styles.sub}>{text}</p>

  const optional = (filled: boolean) => (filled ? 'Next' : 'Skip')

  const support = (
    <>
      <OwnSupportMark />
      <CareBlock lead="What you wrote sounds very heavy. You don’t have to carry it alone." />
    </>
  )

  const keepOnScreenButton = (
    <Go ref={keepOnScreenRef} onClick={() => setOnScreen(true)}>
      Keep this on screen
    </Go>
  )

  const stepOut = () => {
    setFocusRequest((n) => n + 1)
    setConfirmingStartOver(null)
    setView('step-out')
  }

  function renderStep(): { body: ReactNode; nextLabel: string | null } {
    switch (session.step) {
      case 'kind':
        return {
          nextLabel: session.kind ? 'Next' : 'Skip',
          body: (
            <>
              {heading('What kind of talk is coming up?')}
              {sub('Pick the closest one. You can change it later.')}
              <div className={styles.picks}>
                {TALK_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pickKind(k)}
                    aria-pressed={session.kind === k}
                    className={styles.pick}
                  >
                    <span className="sp-choice__mark">{session.kind === k && <Icon name="done" />}</span>
                    <span>
                      <span className={styles.pickTitle}>{TALKS[k].label}</span>
                      <span className={styles.pickDetail}>{TALKS[k].detail}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ),
        }
      case 'who':
        return {
          nextLabel: optional(Boolean(session.who.trim())),
          body: (
            <>
              {heading('Who is it with?')}
              {sub('A name or a role, like “my manager”. Only you will see it.')}
              <WritingSlip
                label="Who the talk is with"
                labelHidden
                line
                ref={fieldRef}
                autoComplete="off"
                aria-describedby="hard-talk-sub"
                maxLength={WHO_MAX}
                value={session.who}
                onChange={(e) => update((s) => ({ ...s, who: e.target.value.slice(0, WHO_MAX) }))}
                onFocus={(e) => keepInView(e.currentTarget, !reducedMotion)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    next()
                  }
                }}
              />
            </>
          ),
        }
      case 'shoulders':
      case 'ground': {
        const prompt = pick(SETTLE[session.step], session.run)
        return { nextLabel: 'Next', body: <>{heading(prompt.line)}{sub(prompt.sub)}</> }
      }
      case 'breath': {
        const done = session.breaths >= BREATHS_OFFERED
        const counted = Math.min(session.breaths, BREATHS_OFFERED)
        return {
          nextLabel: session.breaths > 0 ? 'Next' : 'Skip',
          body: (
            <>
              {heading('If you like, take three slow breaths.')}
              {sub('Tap as you breathe in, and again as you breathe out. Let the out-breath be a little longer.')}
              <BreathMelon breathingIn={breathingIn} reducedMotion={reducedMotion} />
              <div className={styles.breathing}>
                <div className={styles.pips} aria-hidden="true">
                  {Array.from({ length: BREATHS_OFFERED }, (_, i) => (
                    <span key={i} className={cn(styles.pip, i < counted && styles.pipDone)} />
                  ))}
                </div>
                <Stamp onClick={breathe}>{breathingIn ? 'I’m breathing out' : 'I’m breathing in'}</Stamp>
                <p className={styles.breathLine} aria-live="polite">
                  {breathingIn
                    ? 'In… and tap again as you let it go, slowly.'
                    : done
                      ? 'That’s three. Carry on whenever you like.'
                      : counted === BREATHS_OFFERED - 1
                        ? 'One more, if you like.'
                        : counted > 0
                          ? 'Good. Another, whenever you’re ready.'
                          : ''}
                </p>
              </div>
            </>
          ),
        }
      }
      case 'understand':
        return {
          nextLabel: optional(Boolean(session.understand.trim())),
          body: (
            <>
              {heading(talk.understand.heading)}
              {sub('One sentence is plenty, or skip it.')}
              <p id="hard-talk-example" className={styles.example}>For example: {talk.understand.example}</p>
              <WritingSlip
                label={talk.understand.heading}
                labelHidden
                ref={fieldRef}
                rows={3}
                maxLength={TEXT_MAX}
                value={session.understand}
                aria-describedby="hard-talk-sub hard-talk-example"
                onChange={(e) => update((s) => ({ ...s, understand: e.target.value.slice(0, TEXT_MAX) }))}
                onFocus={(e) => keepInView(e.currentTarget, !reducedMotion)}
                note={charactersLeft(session.understand, TEXT_MAX)}
              />
            </>
          ),
        }
      case 'worry': {
        const worries = worriesFor(kind)
        const chosen = worries.find((w) => w.id === session.worry)
        return {
          nextLabel: optional(Boolean(chosen)),
          body: (
            <>
              {heading('Which moment worries you most?')}
              {sub('Pick one, and we’ll think it through.')}
              <fieldset className={styles.picks}>
                <legend className="sr-only">The moment that worries you most</legend>
                {worries.map((w) => (
                  <label key={w.id} className="sp-choice sp-choice--card">
                    <input
                      type="radio"
                      name="hard-talk-worry"
                      value={w.id}
                      checked={session.worry === w.id}
                      onChange={() => {
                        revealResponse.current = true
                        update((s) => ({ ...s, worry: w.id }))
                      }}
                    />
                    <ChoiceFace selected={session.worry === w.id}>{w.label}</ChoiceFace>
                  </label>
                ))}
              </fieldset>
              <div ref={responseRef} aria-live="polite" className={styles.response}>
                {chosen && <Note>{chosen.response}</Note>}
              </div>
            </>
          ),
        }
      }
      case 'opening':
        return {
          nextLabel: optional(session.openingPick !== null && (session.openingPick !== 'own' || Boolean(session.ownOpening.trim()))),
          body: (
            <>
              {heading('Choose a first sentence.')}
              {sub('Starting with what you want makes the rest easier.')}
              <fieldset className={cn(styles.picks, styles.picksOne)}>
                <legend className="sr-only">Your first sentence</legend>
                {talk.openings.map((line, i) => (
                  <label key={line} className="sp-choice sp-choice--card">
                    <input
                      type="radio"
                      name="hard-talk-opening"
                      checked={session.openingPick === i}
                      onChange={() => update((s) => ({ ...s, openingPick: i }))}
                    />
                    <ChoiceFace selected={session.openingPick === i}>{line}</ChoiceFace>
                  </label>
                ))}
                <label className="sp-choice sp-choice--card">
                  <input
                    type="radio"
                    name="hard-talk-opening"
                    checked={session.openingPick === 'own'}
                    onChange={() => update((s) => ({ ...s, openingPick: 'own' }))}
                  />
                  <ChoiceFace selected={session.openingPick === 'own'}>In my own words</ChoiceFace>
                </label>
              </fieldset>
              {session.openingPick === 'own' && (
                <WritingSlip
                  label="Your first sentence, in your own words"
                  labelHidden
                  rows={2}
                  maxLength={TEXT_MAX}
                  value={session.ownOpening}
                  onChange={(e) => update((s) => ({ ...s, ownOpening: e.target.value.slice(0, TEXT_MAX) }))}
                  onFocus={(e) => keepInView(e.currentTarget, !reducedMotion)}
                  note={charactersLeft(session.ownOpening, TEXT_MAX)}
                />
              )}
            </>
          ),
        }
      case 'them':
        return { nextLabel: 'Next', body: <>{heading(themLine(kind, session.who))}{sub(talk.them.listen)}</> }
      case 'kindness': {
        const prompt = pick(KINDNESS, session.run)
        return { nextLabel: 'Next', body: <>{heading(prompt.line)}{sub(prompt.sub)}</> }
      }
      case 'carry':
        if (distressed) {
          return {
            nextLabel: null,
            body: (
              <>
                {heading('You come first')}
                {support}
                {sub('The talk can wait. Go back to change what you wrote, or start over whenever you like.')}
              </>
            ),
          }
        }
        return {
          nextLabel: null,
          body: (
            <>
              {heading('One line to carry in')}
              {notes.ownWords && sub('In your own words.')}
              {/* The only pocket card: what to say first, the line, and the door. Save draws the same card as a picture. */}
              <figure className={styles.pocket}>
                {notes.begin ? (
                  <div className={styles.begin}>
                    <p className={styles.beginLabel}>Begin with</p>
                    <p className={styles.beginLine}><Quote>{notes.begin}</Quote></p>
                  </div>
                ) : null}
                <div aria-hidden="true" className={styles.band} />
                <blockquote className={styles.line}>{notes.line}</blockquote>
                <div className={styles.pocketArt}>
                  <ThresholdArt progress={1} reducedMotion={reducedMotion} />
                </div>
              </figure>
              <div className={cn(styles.actions, styles['actions--row'])}>
                {keepOnScreenButton}
                <Stamp onClick={stepOut}>I’m going in</Stamp>
              </div>
              <KeepsakeSave plan={pocketCard} saveLabel="Save the card as a picture" />
            </>
          ),
        }
    }
  }

  function renderStepOut() {
    return (
      <div className={styles.step}>
        <StepOutArt reducedMotion={reducedMotion} />
        {heading('Go in when you’re ready.')}
        {sub('One more slow breath first, if you like. If you come back afterwards, there’s a quiet place to say how it went.')}
        <div className={cn(styles.actions, styles['actions--row'])}>
          {keepOnScreenButton}
          <Stamp onClick={() => goTo('carry')}>Back to my line</Stamp>
        </div>
      </div>
    )
  }

  function renderOffer() {
    return (
      <div className={styles.step}>
        {heading('Welcome back.')}
        {sub(
          session.kind
            ? `You were part-way through getting set for a talk: ${TALKS[session.kind].label.toLowerCase()}. Carry on, or begin fresh for a different one.`
            : 'You were part-way through getting set for a talk. Carry on, or begin fresh for a different one.',
        )}
        <div className={cn(styles.actions, styles['actions--row'])}>
          <Go onClick={() => goTo(session.step)}>Carry on where I was</Go>
          <Stamp onClick={startOver}>Start fresh</Stamp>
        </div>
      </div>
    )
  }

  function renderCheckIn() {
    const answer = CHECK_INS.find((c) => c.id === session.checkIn)
    const setCheckIn = (id: CheckInId) => {
      revealResponse.current = true
      update((s) => ({ ...s, checkIn: id }))
    }
    return (
      <div className={styles.step}>
        {heading('Welcome back. How did it go?')}
        {distressed ? (
          support
        ) : (
          <>
            {sub('Only if you’d like to say. Your line was:')}
            <p><strong>{carryNotes(session).line}</strong></p>
          </>
        )}
        <fieldset className={styles.picks}>
          <legend className="sr-only">How the talk went</legend>
          {CHECK_INS.map((c) => (
            <label key={c.id} className="sp-choice sp-choice--card">
              <input
                type="radio"
                name="hard-talk-check-in"
                checked={session.checkIn === c.id}
                onChange={() => setCheckIn(c.id)}
              />
              <ChoiceFace selected={session.checkIn === c.id}>{c.label}</ChoiceFace>
            </label>
          ))}
        </fieldset>
        <div ref={responseRef} aria-live="polite" className={styles.response}>
          {answer && <Note>{answer.response}</Note>}
        </div>
        <div className={cn(styles.actions, styles['actions--row'])}>
          <Go onClick={startOver}>Start a new talk</Go>
          <Stamp onClick={() => goTo('carry')}>See my notes again</Stamp>
        </div>
      </div>
    )
  }

  const startOverPanel = (
    <InlineConfirm
      question="Start over?"
      why="Anything you’ve written will be cleared."
      keepLabel="Keep going"
      confirmLabel="Yes, start over"
      onKeep={() => { setFocusRequest((n) => n + 1); setConfirmingStartOver(null) }}
      onConfirm={startOver}
    />
  )

  const step = view === 'steps' ? renderStep() : null
  const hasBack = view === 'steps' && previousStep(session.kind, session.step) !== null

  return (
    <section aria-label="Before the talk" className={styles.card}>
      <div className={styles.head}>
        {view === 'steps' ? (
          <PlaceStamps places={STAGES} here={session.step === 'carry' ? STAGES.length : stage - 1} label="Where you are" />
        ) : <span />}
        {canStartOver && session.step !== 'carry' && !confirmingStartOver && (
          <QuietButton onClick={() => setConfirmingStartOver('top')}>Start over</QuietButton>
        )}
      </div>
      {view === 'steps' && session.step === 'carry' && (
        <p className="sp-soft">{distressed ? 'Before the talk' : 'Here’s your line'}</p>
      )}

      {confirmingStartOver === 'top' && startOverPanel}

      {view !== 'step-out' && !(view === 'steps' && (session.step === 'breath' || session.step === 'carry')) && (
        <div className={styles.art}><ThresholdArt progress={progress} reducedMotion={reducedMotion} /></div>
      )}

      <StatusLine>{welcomeBack ? 'Welcome back. You were here.' : null}</StatusLine>
      {!storageWorks && (
        <Note>This browser isn’t keeping anything, so this will last only while the page is open.</Note>
      )}

      {/* Support leads every later step too, once words have called for it */}
      {distressed && view === 'steps' && session.step !== 'carry' && support}

      <div key={view === 'steps' ? session.step : view} className={view === 'steps' ? styles.step : undefined}>
        {view === 'offer' && renderOffer()}
        {view === 'check-in' && renderCheckIn()}
        {view === 'step-out' && renderStepOut()}
        {step?.body}
      </div>

      {view === 'steps' && (
        <StickyTray pinned={Boolean(step?.nextLabel)} className="flex flex-wrap items-center gap-3">
          {hasBack && <QuietButton onClick={back}>Back</QuietButton>}
          {step?.nextLabel === 'Next' && <Go onClick={next}>Next</Go>}
          {step?.nextLabel === 'Skip' && <Stamp onClick={next}>Skip</Stamp>}
          {session.step === 'carry' && !confirmingStartOver && (
            <QuietButton onClick={() => setConfirmingStartOver('bottom')}>Start over</QuietButton>
          )}
        </StickyTray>
      )}
      {confirmingStartOver === 'bottom' && startOverPanel}
      {onScreen && !distressed && (
        <CarryScreen
          line={notes.line}
          begin={notes.begin}
          onClose={() => {
            setOnScreen(false)
            keepOnScreenRef.current?.focus()
          }}
        />
      )}
    </section>
  )
}
