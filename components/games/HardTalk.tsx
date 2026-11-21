'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { BreathMelon, ThresholdArt } from '@/components/games/hard-talk/ThresholdArt'
import { cn } from '@/lib/utils/cn'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
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
import { nextStep, previousStep, stepPosition, type StepId } from '@/lib/games/hard-talk/flow'
import {
  carryNotes,
  chooseKind,
  decideReturn,
  newSession,
  readSaved,
  writeSaved,
  type Session,
} from '@/lib/games/hard-talk/session'

type View = 'steps' | 'offer' | 'check-in'

const BREATHS_OFFERED = 3
const NEAR_LIMIT = 40

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const fieldClass =
  'w-full rounded-lg border border-card-border bg-background px-4 py-3 text-base text-foreground [overflow-wrap:anywhere] focus:outline-none focus-visible:border-accent'

const optionClass = (selected: boolean) =>
  cn(
    'flex w-full cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 text-left text-foreground transition-colors duration-75',
    'hover:bg-hover-bg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card-bg',
    selected ? 'border-accent bg-accent-soft' : 'border-card-border bg-card-bg',
  )

/** A shape, not only a colour, shows which option is chosen. */
function ChoiceMark({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-foreground/60">
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-foreground" />}
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

function CharactersLeft({ value, max }: { value: string; max: number }) {
  const left = max - value.length
  if (left > NEAR_LIMIT) return null
  return (
    <p className="mt-1 text-right text-sm text-foreground/70" aria-live="polite">
      {left === 0 ? 'That’s the most this box holds.' : `${left} characters left`}
    </p>
  )
}

function Quote({ children }: { children: ReactNode }) {
  return <span className="whitespace-pre-line [overflow-wrap:anywhere]">“{children}”</span>
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
    welcomeBack: plan.type === 'resume' && plan.session.step !== 'kind',
    replacesSaved: false,
  }
}

const subscribeToNothing = () => () => {}
const clock = () => Date.now()
const stamped = (session: Session): Session => ({ ...session, updatedAt: clock() })

export default function HardTalk() {
  // Saved progress lives only in this browser, so the game is drawn once the page has hydrated.
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false)
  return (
    <div id="hard-talk" className="mx-auto max-w-xl">
      {hydrated ? (
        <HardTalkGame />
      ) : (
        <section aria-label="Before the talk" aria-busy="true" className={cn(cardClass, 'min-h-[32rem]')} />
      )}
      <p className="mt-4 text-center text-sm text-foreground/75">
        What you write stays in this browser and is never sent anywhere. Starting over clears it.
      </p>
      <aside
        aria-label="Support"
        className="mt-3 rounded-lg border border-card-border bg-card-bg px-4 py-3 text-center text-sm leading-relaxed text-foreground/80"
      >
        This is a moment to steady yourself, not a substitute for support. If a conversation could put your safety at
        risk, you deserve help with it:{' '}
        <a
          href="https://findahelpline.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-4 rounded"
        >
          findahelpline.com
        </a>{' '}
        lists free, confidential support.
      </aside>
    </div>
  )
}

const cardClass = 'rounded-2xl border border-card-border bg-card-bg px-5 py-6 sm:px-10 sm:py-8 soft-shadow'

function HardTalkGame() {
  const reducedMotion = useReducedMotion()
  const [opening] = useState(openGame)
  const [view, setView] = useState<View>(opening.view)
  const [session, setSession] = useState<Session>(opening.session)
  const [storageWorks, setStorageWorks] = useState(opening.storageWorks)
  const [welcomeBack, setWelcomeBack] = useState(opening.welcomeBack)
  const [confirmingStartOver, setConfirmingStartOver] = useState<'top' | 'bottom' | null>(null)
  const [breathingIn, setBreathingIn] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (opening.replacesSaved) writeSaved(browserStorage(), opening.session)
  }, [opening])

  useEffect(() => {
    if (focusRequest > 0) headingRef.current?.focus()
  }, [focusRequest])

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
  const talk = TALKS[kind]
  const { index, total } = stepPosition(session.kind, session.step)
  const progress = view === 'check-in' ? 1 : (index - 1) / (total - 1)
  const hasWritten = Boolean(session.who || session.understand || session.ownOpening)
  const canStartOver = view === 'steps' && (session.step !== 'kind' || hasWritten || session.kind !== null)

  const heading = (text: string) => (
    <h2
      ref={headingRef}
      tabIndex={-1}
      className="text-2xl sm:text-3xl font-semibold leading-snug text-foreground focus:outline-none [overflow-wrap:anywhere]"
    >
      {text}
    </h2>
  )
  const sub = (text: string) => <p className="mt-3 text-base sm:text-lg text-foreground/75 leading-relaxed">{text}</p>

  const optional = (filled: boolean) => (filled ? 'Next' : 'Skip')

  function renderStep(): { body: ReactNode; nextLabel: string | null } {
    switch (session.step) {
      case 'kind':
        return {
          nextLabel: session.kind ? 'Next' : 'Skip',
          body: (
            <>
              {heading('What kind of talk is coming up?')}
              {sub('Pick the closest one. You can change it later.')}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TALK_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pickKind(k)}
                    aria-pressed={session.kind === k}
                    className={optionClass(session.kind === k)}
                  >
                    <ChoiceMark selected={session.kind === k} />
                    <span>
                      <span className="block font-semibold">{TALKS[k].label}</span>
                      <span className="block text-sm text-foreground/75">{TALKS[k].detail}</span>
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
              <label htmlFor="hard-talk-who" className="sr-only">Who the talk is with</label>
              <input
                id="hard-talk-who"
                type="text"
                autoComplete="off"
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
                className={cn(fieldClass, 'mt-6')}
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
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-2" aria-hidden="true">
                  {Array.from({ length: BREATHS_OFFERED }, (_, i) => (
                    <span
                      key={i}
                      className={cn('h-4 w-2.5 rounded-full border-2 border-foreground/60', i < counted && 'bg-foreground/70')}
                    />
                  ))}
                </div>
                <Button variant="secondary" size="lg" onClick={breathe} className="min-w-56">
                  {breathingIn ? 'I’m breathing out' : 'I’m breathing in'}
                </Button>
                <p className="min-h-6 text-base text-foreground/75" aria-live="polite">
                  {breathingIn
                    ? 'In… and tap again as you let it go, slowly.'
                    : done
                      ? 'That’s three. Carry on whenever you like.'
                      : counted > 0
                        ? `${counted} of ${BREATHS_OFFERED}`
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
              <p id="hard-talk-example" className="mt-4 text-sm text-foreground/70">For example: {talk.understand.example}</p>
              <label htmlFor="hard-talk-understand" className="sr-only">{talk.understand.heading}</label>
              <textarea
                id="hard-talk-understand"
                rows={3}
                maxLength={TEXT_MAX}
                value={session.understand}
                aria-describedby="hard-talk-example"
                onChange={(e) => update((s) => ({ ...s, understand: e.target.value.slice(0, TEXT_MAX) }))}
                onFocus={(e) => keepInView(e.currentTarget, !reducedMotion)}
                className={cn(fieldClass, 'mt-2 resize-none')}
              />
              <CharactersLeft value={session.understand} max={TEXT_MAX} />
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
              <fieldset className="mt-6">
                <legend className="sr-only">The moment that worries you most</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {worries.map((w) => (
                    <label key={w.id} className={optionClass(session.worry === w.id)}>
                      <input
                        type="radio"
                        name="hard-talk-worry"
                        value={w.id}
                        checked={session.worry === w.id}
                        onChange={() => update((s) => ({ ...s, worry: w.id }))}
                        className="sr-only"
                      />
                      <ChoiceMark selected={session.worry === w.id} />
                      <span className="font-medium">{w.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div aria-live="polite" className="mt-5 min-h-6">
                {chosen && (
                  <p className="rounded-lg border-l-4 border-l-[var(--melon-green)] bg-background px-4 py-3 text-base sm:text-lg leading-relaxed text-foreground">
                    {chosen.response}
                  </p>
                )}
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
              <fieldset className="mt-6">
                <legend className="sr-only">Your first sentence</legend>
                <div className="flex flex-col gap-3">
                  {talk.openings.map((line, i) => (
                    <label key={line} className={optionClass(session.openingPick === i)}>
                      <input
                        type="radio"
                        name="hard-talk-opening"
                        checked={session.openingPick === i}
                        onChange={() => update((s) => ({ ...s, openingPick: i }))}
                        className="sr-only"
                      />
                      <ChoiceMark selected={session.openingPick === i} />
                      <span>{line}</span>
                    </label>
                  ))}
                  <label className={optionClass(session.openingPick === 'own')}>
                    <input
                      type="radio"
                      name="hard-talk-opening"
                      checked={session.openingPick === 'own'}
                      onChange={() => update((s) => ({ ...s, openingPick: 'own' }))}
                      className="sr-only"
                    />
                    <ChoiceMark selected={session.openingPick === 'own'} />
                    <span className="font-medium">In my own words</span>
                  </label>
                </div>
              </fieldset>
              {session.openingPick === 'own' && (
                <div className="mt-3">
                  <label htmlFor="hard-talk-own" className="sr-only">Your first sentence, in your own words</label>
                  <textarea
                    id="hard-talk-own"
                    rows={2}
                    maxLength={TEXT_MAX}
                    value={session.ownOpening}
                    onChange={(e) => update((s) => ({ ...s, ownOpening: e.target.value.slice(0, TEXT_MAX) }))}
                    onFocus={(e) => keepInView(e.currentTarget, !reducedMotion)}
                    className={cn(fieldClass, 'resize-none')}
                  />
                  <CharactersLeft value={session.ownOpening} max={TEXT_MAX} />
                </div>
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
      case 'carry': {
        const notes = carryNotes(session)
        return {
          nextLabel: null,
          body: (
            <>
              {heading('One line to carry in')}
              <figure className="mt-6 overflow-hidden rounded-lg border-2 border-card-border bg-background text-center soft-shadow">
                <div aria-hidden="true" className="h-2 bg-melon-green" />
                <div aria-hidden="true" className="h-1.5 bg-success" />
                <blockquote className="px-5 py-6 text-2xl sm:text-3xl font-semibold leading-snug text-foreground">{notes.line}</blockquote>
              </figure>
              {(notes.understand || notes.opening) && (
                <dl className="mt-6 space-y-4 text-left">
                  {notes.understand && (
                    <div>
                      <dt className="text-sm font-medium text-foreground/75">What you want them to understand</dt>
                      <dd className="mt-1 text-lg text-foreground"><Quote>{notes.understand}</Quote></dd>
                    </div>
                  )}
                  {notes.opening && (
                    <div>
                      <dt className="text-sm font-medium text-foreground/75">Your first sentence</dt>
                      <dd className="mt-1 text-lg text-foreground"><Quote>{notes.opening}</Quote></dd>
                    </div>
                  )}
                </dl>
              )}
              <p className="mt-6 text-base text-foreground/75">
                Take one more slow breath, and go in when you choose. If you come back afterwards, there’s a quiet place to say how it went.
              </p>
            </>
          ),
        }
      }
    }
  }

  function renderOffer() {
    return (
      <>
        {heading('Welcome back.')}
        {sub(
          session.kind
            ? `You were part-way through getting set for a talk: ${TALKS[session.kind].label.toLowerCase()}. Carry on, or begin fresh for a different one.`
            : 'You were part-way through getting set for a talk. Carry on, or begin fresh for a different one.',
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button size="lg" onClick={() => goTo(session.step)} className="w-full sm:w-auto">Carry on where I was</Button>
          <Button size="lg" variant="secondary" onClick={startOver} className="w-full sm:w-auto">Start fresh</Button>
        </div>
      </>
    )
  }

  function renderCheckIn() {
    const answer = CHECK_INS.find((c) => c.id === session.checkIn)
    const setCheckIn = (id: CheckInId) => update((s) => ({ ...s, checkIn: id }))
    return (
      <>
        {heading('Welcome back. How did it go?')}
        {sub('Only if you’d like to say. Your line was:')}
        <p className="mt-2 text-lg font-semibold text-foreground">{carryNotes(session).line}</p>
        <fieldset className="mt-6">
          <legend className="sr-only">How the talk went</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHECK_INS.map((c) => (
              <label key={c.id} className={optionClass(session.checkIn === c.id)}>
                <input
                  type="radio"
                  name="hard-talk-check-in"
                  checked={session.checkIn === c.id}
                  onChange={() => setCheckIn(c.id)}
                  className="sr-only"
                />
                <ChoiceMark selected={session.checkIn === c.id} />
                <span className="font-medium">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div aria-live="polite" className="mt-5 min-h-6">
          {answer && (
            <p className="rounded-lg border-l-4 border-l-[var(--melon-green)] bg-background px-4 py-3 text-base sm:text-lg leading-relaxed text-foreground">
              {answer.response}
            </p>
          )}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button size="lg" variant="secondary" onClick={() => goTo('carry')} className="w-full sm:w-auto">See my notes again</Button>
          <Button size="lg" onClick={startOver} className="w-full sm:w-auto">Start a new talk</Button>
        </div>
      </>
    )
  }

  const startOverPanel = (
    <div role="alertdialog" aria-labelledby="hard-talk-start-over" className="mt-4 rounded-lg border border-card-border bg-background p-4">
      <p id="hard-talk-start-over" className="text-foreground">Start over? Anything you’ve written will be cleared.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button onClick={startOver}>Yes, start over</Button>
        <Button variant="secondary" onClick={() => { setFocusRequest((n) => n + 1); setConfirmingStartOver(null) }} autoFocus>Keep going</Button>
      </div>
    </div>
  )

  const step = view === 'steps' ? renderStep() : null
  const hasBack = view === 'steps' && previousStep(session.kind, session.step) !== null

  return (
    <section aria-label="Before the talk" className={cardClass}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        {view === 'steps' ? (
          <div role="img" className="flex items-center gap-1.5" aria-label={`Step ${index} of ${total}`}>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={cn('h-2.5 w-1.5 rounded-full', i < index ? 'bg-foreground/70' : 'border border-foreground/40')}
              />
            ))}
          </div>
        ) : <span />}
        {canStartOver && session.step !== 'carry' && !confirmingStartOver && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmingStartOver('top')}>Start over</Button>
        )}
      </div>

      {confirmingStartOver === 'top' && startOverPanel}

      {!(view === 'steps' && session.step === 'breath') && (
        <div className="mt-2 mb-4"><ThresholdArt progress={progress} reducedMotion={reducedMotion} /></div>
      )}

      {welcomeBack && (
        <p role="status" className="mb-3 text-sm text-foreground/75">Welcome back. You were here.</p>
      )}
      {!storageWorks && (
        <p className="mb-3 text-sm text-foreground/75">
          This browser isn’t keeping anything, so this will last only while the page is open.
        </p>
      )}

      <div key={view === 'steps' ? session.step : view} className={cn(!reducedMotion && 'animate-fade')}>
        {view === 'offer' && renderOffer()}
        {view === 'check-in' && renderCheckIn()}
        {step?.body}
      </div>

      {view === 'steps' && (
        <div className="mt-8 flex items-center gap-3">
          {hasBack && <Button variant="secondary" size="lg" onClick={back}>Back</Button>}
          {step?.nextLabel && <Button size="lg" onClick={next} className="flex-1">{step.nextLabel}</Button>}
          {session.step === 'carry' && !confirmingStartOver && (
            <Button variant="secondary" size="lg" onClick={() => setConfirmingStartOver('bottom')} className="flex-1">Start over</Button>
          )}
        </div>
      )}
      {confirmingStartOver === 'bottom' && startOverPanel}
    </section>
  )
}
