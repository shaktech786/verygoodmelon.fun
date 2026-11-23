'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { buzz, playTones, useCanBuzz, useSoundChosen, wakeTones, type Tone } from '@/components/games/gentleCues'
import { hushAmbient } from '@/lib/audio/ambient-hush'
import { Keepsake } from '@/components/games/Keepsake'
import { patientOneKeepsake } from '@/lib/keepsake/patient-one'
import {
  BODY_WORDS,
  HEARD,
  LOOKED_AT_MAX_LENGTH,
  MIND_WORDS,
  MOMENT_TITLES,
  THING_MAX_LENGTH,
  TODAY_STRIP_KEY,
  joinNaturally,
  momentGist,
  newestFirst,
  readTodayStrip,
  withMoment,
  writeTodayStrip,
  type Heard,
  type MomentId,
  type MomentRecord,
} from '@/lib/games/patient-one/today'

interface Moment {
  id: MomentId
  title: string
  description: string
  duration: number // seconds
  durationLabel: string
  guidance: string[] // shown in turn as the moment unfolds
}

const MOMENTS: Moment[] = [
  {
    id: 'watch',
    title: MOMENT_TITLES.watch,
    description: 'They settle only while you stay still.',
    duration: 40,
    durationLabel: '40 still seconds',
    guidance: [
      'Let your eyes soften...',
      'Follow one seed down...',
      'No need to help them...',
      'Nearly all of them now...',
    ],
  },
  {
    id: 'listen',
    title: MOMENT_TITLES.listen,
    description: 'Listen to what is already here.',
    duration: 60,
    durationLabel: '60 seconds',
    guidance: [
      'Let the sounds come to you...',
      'What is the farthest sound?',
      'And the nearest one?',
      'Is there a sound under the others?',
    ],
  },
  {
    id: 'look',
    title: MOMENT_TITLES.look,
    description: 'Give one thing near you a whole minute.',
    duration: 60,
    durationLabel: '60 seconds',
    guidance: [
      'Its colours, then its shadow...',
      'Where is it worn, or smooth?',
      'How does the light sit on it?',
      'What would a glance have missed?',
    ],
  },
  {
    id: 'reflect',
    title: MOMENT_TITLES.reflect,
    description: 'How are you, right now?',
    duration: 45,
    durationLabel: '45 seconds',
    guidance: [
      'Start with your shoulders...',
      'Then your hands and your jaw...',
      'Then the weather of your thoughts...',
      'Whatever is here is allowed.',
    ],
  },
  {
    id: 'appreciate',
    title: MOMENT_TITLES.appreciate,
    description: 'Three things you appreciate today.',
    duration: 50,
    durationLabel: '50 seconds',
    guidance: [
      'Think of something small...',
      'Something you overlooked...',
      'Someone who matters...',
      'A moment of grace...',
    ],
  },
]

const TICK_MS = 200

// The writing moments never end under a moving pen: the clock rests while the player is
// typing, and when the time is up with words on the page, the player says when they are done.
const WRITING_MOMENTS: MomentId[] = ['look', 'appreciate']
const TYPING_PAUSE_MS = 5000

// Watch the Seeds counts only still time. A little movement right after the tap that
// began it is just the hand leaving the button, so it does not stir anything.
const SEED_COUNT = 8
const STIR_GRACE_MS = 1500
const MIN_POINTER_TRAVEL_PX = 3

// Negative delays start each seed part-way through its 8s drift, so the field is never empty.
const FLOATING_SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => {
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280
    return x - Math.floor(x)
  }
  return {
    id: i,
    x: seededRandom(i * 2) * 80 + 10,
    delay: -(i + seededRandom(i * 2 + 1)),
    restingTop: seededRandom(i * 2 + 7) * 55 + 5,
    bedX: 12 + i * 10.5 + seededRandom(i * 2 + 3) * 4,
    bedLift: seededRandom(i * 2 + 5) * 10,
  }
})

const CHIME: Tone[] = [
  { hz: 523.25, seconds: 2.6 },
  { hz: 659.25, at: 0.35, seconds: 2.6 },
  { hz: 783.99, at: 0.7, seconds: 3 },
]
const CHIME_LOUDNESS = 0.06

const UNEASY_WORDS: string[] = ['Tense', 'Tired', 'Heavy', 'Restless', 'Busy', 'Worried', 'Flat']

const THING_LABELS = ['First thing', 'Second thing', 'Third thing']

type View = 'menu' | 'task' | 'reward'

// Today's cards survive a reload but not midnight; without storage they last for this visit.
function loadStrip(): MomentRecord[] {
  try {
    return readTodayStrip(localStorage.getItem(TODAY_STRIP_KEY), new Date())
  } catch {
    return []
  }
}

function saveStrip(records: MomentRecord[]) {
  try {
    localStorage.setItem(TODAY_STRIP_KEY, writeTodayStrip(records, new Date()))
  } catch {
    // The strip simply lasts for this visit.
  }
}

function timesWord(n: number): string {
  if (n === 1) return 'once'
  if (n === 2) return 'twice'
  return `${n} times`
}

/** How far along the moment is, in words rather than a number, so nothing counts down at the listener. */
function momentInWords(progress: number): string {
  if (progress >= 1) return 'The moment is whole'
  if (progress < 0.1) return 'The moment has just begun'
  if (progress < 0.4) return 'The moment is under way'
  if (progress < 0.6) return 'About halfway through the moment'
  return 'Most of the way through the moment'
}

function timeOfDay(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

function MomentKeepsake({ record, label, className }: { record: MomentRecord; label: string; className?: string }) {
  const plan = useMemo(() => patientOneKeepsake({ record }), [record])
  return <Keepsake plan={plan} label={label} className={className} />
}

function MomentIcon({ id, className }: { id: MomentId; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      {id === 'watch' && (
        <>
          <path d="M3 12 A13 13 0 0 0 29 12 Z" className="fill-melon-green" />
          <path d="M5.5 12 A10.5 10.5 0 0 0 26.5 12 Z" className="fill-success/60" />
          <path d="M7 12 A9 9 0 0 0 25 12 Z" className="fill-melon-red" />
          <ellipse cx="12" cy="16" rx="1" ry="1.6" className="fill-foreground" />
          <ellipse cx="16" cy="18.5" rx="1" ry="1.6" className="fill-foreground" />
          <ellipse cx="20" cy="16" rx="1" ry="1.6" className="fill-foreground" />
        </>
      )}
      {id === 'listen' && (
        <>
          <circle cx="9" cy="16" r="3" className="fill-accent" />
          <path d="M15 10 A8 8 0 0 1 15 22" className="fill-none stroke-accent" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 6 A13 13 0 0 1 20 26" className="fill-none stroke-accent/60" strokeWidth="2" strokeLinecap="round" />
          <path d="M25 3 A17 17 0 0 1 25 29" className="fill-none stroke-accent/30" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {id === 'look' && (
        <>
          <circle cx="16" cy="16" r="13.5" className="fill-none stroke-warm" strokeWidth="1.5" strokeDasharray="2.5 3.5" strokeLinecap="round" />
          <ellipse cx="16" cy="18" rx="8.5" ry="6.5" className="fill-melon-green" />
          <ellipse cx="13" cy="15.5" rx="3" ry="1.5" className="fill-success/70" />
        </>
      )}
      {id === 'reflect' && (
        <>
          <path d="M3 16 Q16 4 29 16 Q16 28 3 16 Z" className="fill-none stroke-melon-green" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="16" cy="16" r="5" className="fill-success/40 stroke-melon-green" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="2" className="fill-melon-green" />
        </>
      )}
      {id === 'appreciate' && (
        <>
          <ellipse cx="8" cy="20" rx="3.2" ry="5" transform="rotate(-20 8 20)" className="fill-melon-red" />
          <ellipse cx="16" cy="12" rx="3.2" ry="5" className="fill-warm" />
          <ellipse cx="24" cy="20" rx="3.2" ry="5" transform="rotate(20 24 20)" className="fill-success" />
        </>
      )}
    </svg>
  )
}

interface SeedFieldProps {
  settled: number
  /** Seeds from this index on fade in as they settle; earlier ones are already resting. */
  fadeFrom: number
  reducedMotion: boolean
  className: string
}

function SeedField({ settled: settledSeeds, fadeFrom, reducedMotion, className }: SeedFieldProps) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-xl bg-gradient-to-b from-transparent to-accent/10', className)}
      role="img"
      aria-label={`${settledSeeds} of ${SEED_COUNT} seeds settled`}
    >
      {FLOATING_SEEDS.map((seed) => {
        const settled = seed.id < settledSeeds
        return (
          <div
            key={seed.id}
            data-settled={settled}
            className={cn(
              'absolute w-3 h-5 bg-foreground/70 rounded-full shadow-lg',
              settled ? !reducedMotion && seed.id >= fadeFrom && 'animate-fade' : !reducedMotion && 'animate-float-seed',
            )}
            style={
              settled
                ? { left: `${seed.bedX}%`, bottom: `${8 + seed.bedLift}px`, rotate: `${seed.bedLift * 6 - 30}deg` }
                : { left: `${seed.x}%`, animationDelay: `${seed.delay}s`, top: reducedMotion ? `${seed.restingTop}%` : '-20px' }
            }
          />
        )
      })}
    </div>
  )
}

function WordChip({ label, pressed, onToggle }: { label: string; pressed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm border transition-colors duration-75',
        'focus:outline-none focus:ring-2 focus:ring-focus-ring',
        pressed ? 'border-chosen-line bg-chosen text-foreground' : 'border-card-border text-foreground/75 hover:border-accent/50',
      )}
    >
      {label}
    </button>
  )
}

function toggleIn<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

const RING_RADIUS = 26
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

export default function TheUnrusher() {
  const [currentTask, setCurrentTask] = useState<Moment | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [strip, setStrip] = useState<MomentRecord[]>([])
  const [rewardKey, setRewardKey] = useState<string | null>(null)
  const [openCard, setOpenCard] = useState<string | null>(null)
  const [showReward, setShowReward] = useState(false)
  const [welcomeBack, setWelcomeBack] = useState(false)
  const [stirred, setStirred] = useState(false)
  const [stirCount, setStirCount] = useState(0)
  const [things, setThings] = useState(['', '', ''])
  const [lookedAt, setLookedAt] = useState('')
  const [feelings, setFeelings] = useState<string[]>([])
  const [heard, setHeard] = useState<Heard[]>([])
  const [buzzAtEnd, setBuzzAtEnd] = useState(false)
  const [writingPaused, setWritingPaused] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const countedMsRef = useRef(0)
  const startedAtRef = useRef(0)
  const ownScrollPendingRef = useRef(false)
  const lastTickRef = useRef(0)
  const lastStirRef = useRef(0)
  const stirsRef = useRef(0)
  const buzzAtEndRef = useRef(false)
  const writingFocusedRef = useRef(false)
  const lastTypedAtRef = useRef(0)
  const hasWritingRef = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const previousViewRef = useRef<View>('menu')
  const reducedMotion = useReducedMotion()
  const soundOn = useSoundChosen()
  const canBuzz = useCanBuzz()

  useEffect(() => {
    setStrip(loadStrip())
  }, [])

  useEffect(() => {
    buzzAtEndRef.current = buzzAtEnd
  }, [buzzAtEnd])

  // What the player has noted so far, read when the moment ends without restarting its clock.
  const notedRef = useRef({ things, lookedAt, feelings })
  useEffect(() => {
    notedRef.current = { things, lookedAt, feelings }
  }, [things, lookedAt, feelings])

  const keepInStrip = useCallback((record: MomentRecord) => {
    setStrip((prev) => {
      const next = withMoment(prev, record, new Date())
      saveStrip(next)
      return next
    })
  }, [])

  const view: View = currentTask ? (showReward ? 'reward' : 'task') : 'menu'

  const finishMoment = useCallback((task: Moment) => {
    setIsActive(false)
    setTimeUp(false)
    setShowReward(true)
    setStirCount(stirsRef.current)
    const at = new Date().toISOString()
    const noted = notedRef.current
    keepInStrip({
      key: at,
      id: task.id,
      at,
      things: noted.things.map((t) => t.trim()).filter(Boolean),
      heard: [],
      lookedAt: noted.lookedAt.trim(),
      feelings: noted.feelings,
    })
    setRewardKey(at)
    if (task.id === 'listen') {
      playTones(CHIME, CHIME_LOUDNESS)
      if (buzzAtEndRef.current) buzz([80, 120, 80])
    }
  }, [keepInStrip])

  // Time is counted in small slices of wall-clock time, and a slice only counts while
  // the moment is on screen (and, for the seeds, while nothing has moved). Everything
  // on screen derives from that one count, so the ring, the clock and the guidance agree.
  useEffect(() => {
    if (!isActive || !currentTask) return
    const needsStillness = currentTask.id === 'watch'
    const isWriting = WRITING_MOMENTS.includes(currentTask.id)

    let hidden = document.visibilityState === 'hidden'
    lastTickRef.current = Date.now()

    const stop = () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    const tick = () => {
      const now = Date.now()
      if (hidden) {
        lastTickRef.current = now
        return
      }
      const typing = isWriting && writingFocusedRef.current && now - lastTypedAtRef.current < TYPING_PAUSE_MS
      const countFrom = typing
        ? now
        : needsStillness ? Math.max(lastTickRef.current, lastStirRef.current + STIR_GRACE_MS) : lastTickRef.current
      countedMsRef.current += Math.max(0, now - countFrom)
      lastTickRef.current = now
      if (needsStillness) setStirred(now < lastStirRef.current + STIR_GRACE_MS)
      if (isWriting) setWritingPaused(typing)

      if (countedMsRef.current >= currentTask.duration * 1000) {
        stop()
        if (isWriting && (hasWritingRef.current || writingFocusedRef.current)) {
          setElapsedMs(currentTask.duration * 1000)
          setWritingPaused(false)
          setTimeUp(true)
          return
        }
        finishMoment(currentTask)
        return
      }
      setElapsedMs(countedMsRef.current)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hidden = true
        return
      }
      if (hidden) {
        hidden = false
        lastTickRef.current = Date.now()
        setWelcomeBack(true)
      }
      tick()
    }

    const interval = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return stop
  }, [isActive, currentTask, finishMoment])

  // Any touch, scroll, key or real pointer movement stirs the seeds. Stirring never
  // undoes anything: the seeds simply wait until the player is still again.
  useEffect(() => {
    if (!isActive || currentTask?.id !== 'watch') return
    const stir = (event: Event) => {
      // The page's own scroll that brings the moment into view is not the player moving.
      if (event.type === 'scroll' && ownScrollPendingRef.current) {
        ownScrollPendingRef.current = false
        return
      }
      const now = Date.now()
      if (now < startedAtRef.current + STIR_GRACE_MS) return
      if (now >= lastStirRef.current + STIR_GRACE_MS) stirsRef.current += 1
      lastStirRef.current = now
      setStirred(true)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (Math.hypot(e.movementX, e.movementY) >= MIN_POINTER_TRAVEL_PX) stir(e)
    }
    const events = ['pointerdown', 'wheel', 'scroll', 'keydown', 'touchstart'] as const
    for (const name of events) window.addEventListener(name, stir, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      for (const name of events) window.removeEventListener(name, stir)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [isActive, currentTask])

  // Someone listening with their eyes closed should not come back to a locked
  // phone and a paused moment, so the screen stays awake while a moment runs.
  useEffect(() => {
    if (!isActive || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let released = false
    const acquire = () => {
      navigator.wakeLock.request('screen').then((sentinel) => {
        if (released) sentinel.release().catch(() => {})
        else lock = sentinel
      }).catch(() => {
        // Battery saver or an unsupported browser: the moment simply pauses if the screen sleeps.
      })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      lock?.release().catch(() => {})
    }
  }, [isActive])

  // While the room is being listened to, the page's own rain and hum fall away.
  useEffect(() => {
    if (!isActive || currentTask?.id !== 'listen') return
    return hushAmbient('all')
  }, [isActive, currentTask])

  useEffect(() => {
    if (previousViewRef.current === view) return
    previousViewRef.current = view
    headingRef.current?.focus()
    // Bring the whole moment on screen now, inside the stillness grace period, so the
    // player never has to scroll (which would stir the seeds) to reach the time or Stop.
    const card = cardRef.current
    if (view === 'task' && card) {
      const { top, bottom } = card.getBoundingClientRect()
      if (top < 0 || bottom > window.innerHeight) {
        ownScrollPendingRef.current = true
        card.scrollIntoView({ block: bottom - top <= window.innerHeight ? 'end' : 'start', behavior: 'instant' })
      }
    }
  }, [view])

  const startTask = (task: Moment) => {
    const now = Date.now()
    startedAtRef.current = now
    countedMsRef.current = 0
    lastStirRef.current = now - STIR_GRACE_MS
    stirsRef.current = 0
    writingFocusedRef.current = false
    lastTypedAtRef.current = 0
    hasWritingRef.current = false
    wakeTones()
    setCurrentTask(task)
    setElapsedMs(0)
    setIsActive(true)
    setShowReward(false)
    setWelcomeBack(false)
    setWritingPaused(false)
    setTimeUp(false)
    setStirred(false)
    setStirCount(0)
    setThings(['', '', ''])
    setLookedAt('')
    setFeelings([])
    setHeard([])
  }

  const rewardRecord = strip.find((r) => r.key === rewardKey) ?? null

  const noteHeard = (sound: Heard) => {
    const next = sound === 'Almost nothing'
      ? (heard.includes(sound) ? [] : [sound])
      : toggleIn(heard.filter((s) => s !== 'Almost nothing'), sound)
    setHeard(next)
    if (rewardRecord) keepInStrip({ ...rewardRecord, heard: next })
  }

  const resetTask = () => {
    setCurrentTask(null)
    setElapsedMs(0)
    setIsActive(false)
    setShowReward(false)
    setWelcomeBack(false)
    setTimeUp(false)
  }

  const writingHandlers = {
    onFocus: () => { writingFocusedRef.current = true },
    onBlur: () => { writingFocusedRef.current = false },
  }
  const noteTyping = (allText: string[]) => {
    lastTypedAtRef.current = Date.now()
    hasWritingRef.current = allText.some((t) => t.trim() !== '')
  }

  if (currentTask) {
    const progress = Math.min(1, elapsedMs / (currentTask.duration * 1000))
    const guidanceIndex = Math.min(currentTask.guidance.length - 1, Math.floor(progress * currentTask.guidance.length))
    const settledSeeds = Math.min(SEED_COUNT, Math.floor(progress * SEED_COUNT))
    const notedThings = things.map((t) => t.trim()).filter(Boolean)
    const lookedAtName = lookedAt.trim()

    const compact = currentTask.id === 'watch'
    const listenInstruction = soundOn
      ? 'Close your eyes if you like. The page’s own sound fades away for this minute, and a soft chime will mark the end.'
      : buzzAtEnd
        ? 'Close your eyes if you like. A gentle buzz will mark the end.'
        : 'Soften your gaze and let it rest low. The screen will change when the minute is over.'

    return (
      <div className="max-w-2xl mx-auto">
        <div
          ref={cardRef}
          className={cn(
            'bg-card-bg border border-card-border rounded-lg px-6 sm:p-12 text-center flex flex-col justify-center',
            compact && !showReward ? 'py-6' : 'py-10 min-h-[480px]',
          )}
        >
          {!showReward ? (
            <>
              {(currentTask.id === 'reflect' || currentTask.id === 'appreciate' || currentTask.id === 'look') && (
                <MomentIcon
                  id={currentTask.id}
                  className={cn('w-20 h-20 mx-auto mb-6', !reducedMotion && 'animate-pulse-slow')}
                />
              )}

              <h2 ref={headingRef} tabIndex={-1} className="text-2xl sm:text-3xl font-semibold mb-3 text-foreground focus:outline-none">
                {currentTask.title}
              </h2>

              {currentTask.id === 'listen' && (
                <p className="text-base text-foreground/80 mb-3 max-w-md mx-auto">{listenInstruction}</p>
              )}
              {currentTask.id === 'watch' && (
                <p className="text-base text-foreground/80 mb-3 max-w-md mx-auto">
                  The seeds settle only while you stay still. Moving never undoes anything; they just wait.
                </p>
              )}

              <p className={cn('text-lg text-foreground/80 min-h-8', compact ? 'mb-3' : 'mb-6')} aria-live="polite">
                {currentTask.guidance[guidanceIndex]}
              </p>

              {currentTask.id === 'watch' && (
                <>
                  <SeedField settled={settledSeeds} fadeFrom={0} reducedMotion={reducedMotion} className="h-40 sm:h-56 mb-2" />
                  <p className="text-sm text-foreground/70 mb-3 min-h-5">
                    {stirred ? 'The seeds wait while you move.' : ''}
                  </p>
                </>
              )}

              {currentTask.id === 'listen' && (
                <div className="relative h-40 mb-6 flex items-center justify-center" role="img" aria-label="Quiet sound ripples">
                  {!reducedMotion && (
                    <>
                      <div className="absolute w-16 h-16 rounded-full bg-accent/10 animate-ping" style={{ animationDuration: '4s' }} />
                      <div className="absolute w-24 h-24 rounded-full bg-accent/5 animate-ping" style={{ animationDuration: '5s', animationDelay: '0.8s' }} />
                    </>
                  )}
                  <div className="absolute w-32 h-32 rounded-full border border-accent/20" />
                  <MomentIcon id="listen" className="relative w-12 h-12" />
                </div>
              )}

              {currentTask.id === 'listen' && canBuzz && !soundOn && (
                <div className="mb-6">
                  <WordChip label="Buzz when it ends" pressed={buzzAtEnd} onToggle={() => setBuzzAtEnd((on) => !on)} />
                </div>
              )}

              {currentTask.id === 'look' && (
                <label className="mb-6 mx-auto w-full max-w-sm block text-left">
                  <span className="block text-sm text-foreground/75 text-center mb-2">
                    What are you looking at? Naming it is optional.
                  </span>
                  <input
                    type="text"
                    value={lookedAt}
                    maxLength={LOOKED_AT_MAX_LENGTH}
                    onChange={(e) => {
                      noteTyping([e.target.value])
                      setLookedAt(e.target.value)
                    }}
                    {...writingHandlers}
                    className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
                  />
                </label>
              )}

              {currentTask.id === 'reflect' && (
                <div className="mb-6 space-y-3">
                  <p className="text-sm text-foreground/75">Tap any words that fit. None is fine too.</p>
                  {[
                    { label: 'In your body', words: BODY_WORDS },
                    { label: 'In your mind', words: MIND_WORDS },
                  ].map((group) => (
                    <div key={group.label} role="group" aria-label={group.label} className="flex flex-wrap justify-center gap-2">
                      {group.words.map((word) => (
                        <WordChip
                          key={word}
                          label={word}
                          pressed={feelings.includes(word)}
                          onToggle={() => setFeelings((prev) => toggleIn(prev, word))}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {currentTask.id === 'appreciate' && (
                <div className="mb-6 mx-auto w-full max-w-sm space-y-2 text-left">
                  <p className="text-sm text-foreground/75 text-center mb-3">
                    Write them down if you like. They stay on this device, and only until midnight.
                  </p>
                  {THING_LABELS.map((label, i) => (
                    <label key={label} className="flex items-center gap-3">
                      <span className="sr-only">{label}</span>
                      <span aria-hidden="true" className="w-5 text-right text-sm text-foreground/70 tabular-nums">{i + 1}.</span>
                      <input
                        type="text"
                        value={things[i]}
                        maxLength={THING_MAX_LENGTH}
                        onChange={(e) => {
                          const next = things.map((t, j) => (j === i ? e.target.value : t))
                          noteTyping(next)
                          setThings(next)
                        }}
                        {...writingHandlers}
                        className="flex-1 min-w-0 rounded-lg border border-card-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
                      />
                    </label>
                  ))}
                </div>
              )}

              {welcomeBack && (
                <p className="text-sm text-foreground/70 mb-4" role="status">
                  Welcome back. The moment waited for you.
                </p>
              )}

              {/* Progress is a slow ripening ring with no numbers; a screen reader can ask how far along it is, and is never told. */}
              <div className={cn('flex flex-wrap items-center justify-center gap-3', !compact && 'mb-2')}>
                <svg viewBox="0 0 60 60" className="w-12 h-12 -rotate-90" role="img" aria-label={momentInWords(progress)} data-testid="moment-ring" data-progress={(Math.floor(progress * 100) / 100).toFixed(2)}>
                  <circle cx="30" cy="30" r={RING_RADIUS} className="fill-none stroke-foreground/10" strokeWidth="5" />
                  <circle
                    cx="30"
                    cy="30"
                    r={RING_RADIUS}
                    className="fill-none stroke-melon-green"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={RING_LENGTH}
                    strokeDashoffset={RING_LENGTH * (1 - progress)}
                  />
                </svg>
                {compact && (
                  timeUp ? (
                    <Button variant="ghost" onClick={() => finishMoment(currentTask)}>
                      Done
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={resetTask}>
                      Leave early
                    </Button>
                  )
                )}
              </div>

              {!compact && (
                timeUp ? (
                  <>
                    <p className="text-sm text-foreground/80" role="status">
                      That was the whole time. Finish your thought, then press Done.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button variant="primary" onClick={() => finishMoment(currentTask)} className="w-full sm:w-auto">
                        Done
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground/70 min-h-5">
                      {writingPaused ? 'The time waits while you write.' : 'No rush. Just be here.'}
                    </p>
                    <div className="mt-6">
                      <Button variant="ghost" onClick={resetTask}>
                        Leave early
                      </Button>
                    </div>
                  </>
                )
              )}
            </>
          ) : (
            <div className={cn(currentTask.id !== 'watch' && 'animate-fade')}>
              {currentTask.id === 'watch' ? (
                <SeedField settled={SEED_COUNT} fadeFrom={SEED_COUNT - 1} reducedMotion={reducedMotion} className="h-28 max-w-xs w-full mx-auto mb-6" />
              ) : (
                <MomentIcon id={currentTask.id} className="w-16 h-16 mx-auto mb-6" />
              )}
              <h2 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold mb-4 text-foreground focus:outline-none">
                Moment savored
              </h2>

              {currentTask.id === 'watch' && (
                <p className="text-lg text-foreground/80 mb-6 max-w-md mx-auto">
                  {stirCount === 0
                    ? 'All eight seeds settled, and you did not move once.'
                    : `All eight seeds settled. You stirred them ${timesWord(stirCount)}, and ${stirCount === 1 ? 'they' : 'each time they'} waited for you.`}
                </p>
              )}

              {currentTask.id === 'listen' && (
                <div className="mb-6">
                  <div role="group" aria-label="What did you hear?" className="max-w-md mx-auto">
                    <p className="text-base text-foreground mb-3" aria-hidden="true">What did you hear?</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {HEARD.map((sound) => (
                        <WordChip
                          key={sound}
                          label={sound}
                          pressed={heard.includes(sound)}
                          onToggle={() => noteHeard(sound)}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 min-h-14 text-lg text-foreground/80 max-w-md mx-auto" aria-live="polite">
                    {heard.length === 0
                      ? ''
                      : heard[0] === 'Almost nothing'
                        ? 'Almost nothing. That kind of quiet is rarer than it sounds.'
                        : `You heard ${joinNaturally(heard.map((s) => (s === 'My own breath' ? 'your own breath' : s.toLowerCase())))}. Most of the day, they go unheard.`}
                  </p>
                </div>
              )}

              {currentTask.id === 'look' && (
                <p className="text-lg text-foreground/80 mb-6 max-w-md mx-auto">
                  {lookedAtName ? (
                    <>You gave <strong className="font-semibold text-foreground">{lookedAtName}</strong> a whole minute. Most things get a glance.</>
                  ) : (
                    'You gave one thing a whole minute. Most things get a glance.'
                  )}
                </p>
              )}

              {currentTask.id === 'reflect' && (
                <p className="text-lg text-foreground/80 mb-6 max-w-md mx-auto">
                  {feelings.length === 0
                    ? 'You stayed with this moment for 45 seconds without needing to name it. That counts.'
                    : `Right now: ${joinNaturally(feelings.map((w) => w.toLowerCase()))}. ${
                      feelings.some((w) => UNEASY_WORDS.includes(w))
                        ? 'Naming a feeling often loosens it a little.'
                        : 'Good to know this is here too.'
                    }`}
                </p>
              )}

              {currentTask.id === 'appreciate' && (
                notedThings.length > 0 ? (
                  <div className="mb-6">
                    <p className="text-sm text-foreground/70 mb-2">Today you noticed</p>
                    <ul className="space-y-1 text-lg text-foreground">
                      {notedThings.map((thing, i) => (
                        <li key={i}>{thing}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-lg text-foreground/80 mb-6 max-w-md mx-auto">
                    You gave fifty seconds to what is good today, written down or not.
                  </p>
                )
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button variant="primary" onClick={resetTask} className="w-full sm:w-auto">
                  Continue slowing down
                </Button>
                <Button variant="secondary" onClick={() => startTask(currentTask)} className="w-full sm:w-auto">
                  Stay a little longer
                </Button>
              </div>
              {rewardRecord && <MomentKeepsake record={rewardRecord} label="Keep this moment" className="mt-10 pt-8 border-t border-card-border" />}
            </div>
          )}
        </div>
      </div>
    )
  }

  const savoredIds = new Set(strip.map((r) => r.id))
  const opened = strip.find((r) => r.key === openCard) ?? null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl sm:text-2xl font-semibold mb-2 text-foreground focus:outline-none">
          Choose a moment to savor
        </h2>
        <p className="text-sm sm:text-base text-foreground/70 max-w-xl mx-auto">
          An anti-game about noticing: nothing to win, nothing to hurry. Pick one small thing and give it your full attention.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {MOMENTS.map((task) => {
          const isCompleted = savoredIds.has(task.id)
          return (
            <button
              key={task.id}
              onClick={() => startTask(task)}
              className={cn(
                'bg-card-bg border border-card-border rounded-lg p-5 text-left transition-all duration-75',
                'hover:border-accent hover:shadow-md focus:outline-none focus:ring-2 focus:ring-focus-ring',
              )}
              aria-label={`${task.title}: ${task.description} ${task.durationLabel}.${isCompleted ? ' Savored today.' : ''}`}
            >
              <div className="flex items-start gap-4">
                <MomentIcon id={task.id} className="w-10 h-10 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1 text-foreground">{task.title}</h3>
                  <p className="text-sm text-foreground/75 mb-2">{task.description}</p>
                  <div className="text-xs text-foreground/70">
                    {task.durationLabel}
                    {isCompleted && <span> · savored today</span>}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {strip.length > 0 && (
        <section aria-labelledby="today-strip-heading" className="bg-card-bg border border-card-border rounded-lg p-4 sm:p-5">
          <h3 id="today-strip-heading" className="text-base font-semibold text-foreground">Today</h3>
          <p className="text-sm text-foreground/70 mb-3">
            Each moment you finish rests here until midnight. Open one to keep it.
          </p>
          <ul className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-1 px-1 pt-1" aria-label="Moments from today">
            {newestFirst(strip).map((record) => {
              const isOpen = record.key === openCard
              return (
                <li key={record.key} className="snap-start shrink-0 flex">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls="today-moment"
                    onClick={() => setOpenCard(isOpen ? null : record.key)}
                    className={cn(
                      // Narrow enough on a phone that the next card peeks in, so the row reads as one to scroll
                      'w-36 sm:w-40 text-left rounded-lg border px-3 py-3 transition-colors duration-75',
                      'focus:outline-none focus:ring-2 focus:ring-focus-ring',
                      isOpen ? 'border-chosen-line bg-chosen' : 'border-card-border bg-background hover:border-melon-green/50',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2 mb-2">
                      <MomentIcon id={record.id} className="w-7 h-7" />
                      <span className="text-xs text-foreground/70 tabular-nums">{timeOfDay(record.at)}</span>
                    </span>
                    <span className="block text-sm font-semibold text-foreground">{MOMENT_TITLES[record.id]}</span>
                    <span className="mt-1 font-serif italic text-sm text-foreground/80 line-clamp-2 break-words">
                      {momentGist(record)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div id="today-moment">
            {opened && (
              <MomentKeepsake
                key={opened.key}
                record={opened}
                label={`${MOMENT_TITLES[opened.id]}, at ${timeOfDay(opened.at)}`}
                className="mt-4 pt-5 border-t border-card-border"
              />
            )}
          </div>
        </section>
      )}
    </div>
  )
}
