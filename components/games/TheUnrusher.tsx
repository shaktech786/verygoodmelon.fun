'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Go } from '@/components/seedpress/Go'
import { Icon } from '@/components/seedpress/icons/Icon'
import { QuietButton } from '@/components/seedpress/QuietButton'
import { Stamp } from '@/components/seedpress/Stamp'
import { cn } from '@/lib/utils/cn'
import { useSense } from '@/lib/design/sense'
import { buzz, playTones, useCanBuzz, useSoundChosen, wakeTones, type Tone } from '@/components/games/gentleCues'
import { hushAmbient } from '@/lib/audio/ambient-hush'
import { Keepsake } from '@/components/games/Keepsake'
import { patientOneKeepsake } from '@/lib/keepsake/patient-one'
import styles from './TheUnrusher.module.css'
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
    durationLabel: 'A short, still sit',
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
    durationLabel: 'A longer sit',
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
    durationLabel: 'A longer sit',
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
    durationLabel: 'A short sit',
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
    durationLabel: 'A little while',
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
          <path d="M3 12 A13 13 0 0 0 29 12 Z" className="fill-rind" />
          <path d="M5.5 12 A10.5 10.5 0 0 0 26.5 12 Z" className="fill-rind-wash" />
          <path d="M7 12 A9 9 0 0 0 25 12 Z" className="fill-moss" />
          <ellipse cx="12" cy="16" rx="1" ry="1.6" className="fill-seed" />
          <ellipse cx="16" cy="18.5" rx="1" ry="1.6" className="fill-seed" />
          <ellipse cx="20" cy="16" rx="1" ry="1.6" className="fill-seed" />
        </>
      )}
      {id === 'listen' && (
        <>
          <circle cx="9" cy="16" r="3" className="fill-moss" />
          <path d="M15 10 A8 8 0 0 1 15 22" className="fill-none stroke-moss" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 6 A13 13 0 0 1 20 26" className="fill-none stroke-moss/60" strokeWidth="2" strokeLinecap="round" />
          <path d="M25 3 A17 17 0 0 1 25 29" className="fill-none stroke-moss/30" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {id === 'look' && (
        <>
          <circle cx="16" cy="16" r="13.5" className="fill-none stroke-clay" strokeWidth="1.5" strokeDasharray="2.5 3.5" strokeLinecap="round" />
          <ellipse cx="16" cy="18" rx="8.5" ry="6.5" className="fill-moss" />
          <ellipse cx="13" cy="15.5" rx="3" ry="1.5" className="fill-rind-wash" />
        </>
      )}
      {id === 'reflect' && (
        <>
          <path d="M3 16 Q16 4 29 16 Q16 28 3 16 Z" className="fill-none stroke-moss" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="16" cy="16" r="5" className="fill-rind-wash stroke-moss" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="2" className="fill-moss" />
        </>
      )}
      {id === 'appreciate' && (
        <>
          <ellipse cx="8" cy="20" rx="3.2" ry="5" transform="rotate(-20 8 20)" className="fill-seed" />
          <ellipse cx="16" cy="12" rx="3.2" ry="5" className="fill-clay" />
          <ellipse cx="24" cy="20" rx="3.2" ry="5" transform="rotate(20 24 20)" className="fill-moss" />
        </>
      )}
    </svg>
  )
}

interface SeedFieldProps {
  settled: number
  /** Seeds from this index on fade in as they settle; earlier ones are already resting. */
  fadeFrom: number
  /** Nothing moves: Quiet, or the visitor asked for less motion. */
  still: boolean
  /** Every seed is at rest, so ink B slides the last pixel home (once). */
  registered?: boolean
  className: string
}

/** How the seeds are resting, in words, so the field never counts at the player. */
function seedsInWords(settled: number): string {
  if (settled >= SEED_COUNT) return 'Every seed has settled'
  if (settled === 0) return 'Seeds drifting, none settled yet'
  if (settled < SEED_COUNT / 2) return 'Seeds drifting, a few settled'
  return 'Seeds drifting, most settled'
}

function SeedField({ settled: settledSeeds, fadeFrom, still, registered = false, className }: SeedFieldProps) {
  return (
    <div
      className={cn(styles.field, registered && styles.registered, className)}
      role="img"
      aria-label={seedsInWords(settledSeeds)}
      data-registered={registered || undefined}
    >
      {FLOATING_SEEDS.map((seed) => {
        const settled = seed.id < settledSeeds
        const arriving = settled && !still && seed.id >= fadeFrom
        return (
          <div
            key={seed.id}
            data-settled={settled}
            data-arriving={arriving || undefined}
            className={cn(styles.seed, arriving && styles.arriving, !settled && !still && styles.drift)}
            style={
              settled
                ? { left: `${seed.bedX}%`, bottom: `${8 + seed.bedLift}px`, rotate: `${seed.bedLift * 6 - 30}deg` }
                : { left: `${seed.x}%`, animationDelay: `${seed.delay}s`, top: still ? `${seed.restingTop}%` : '-20px' }
            }
          />
        )
      })}
    </div>
  )
}

/** A word that fits: a toggle stamp, chosen when pressed (rind, never flesh). */
function WordChip({ label, pressed, onToggle }: { label: string; pressed: boolean; onToggle: () => void }) {
  return (
    <Stamp aria-pressed={pressed} onClick={onToggle}>
      {label}
    </Stamp>
  )
}

function toggleIn<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

const PETAL_ANGLES = [0, 60, 120, 180, 240, 300]

/** A bud that opens as the moment ripens: it only ever grows, so nothing reads as time running out. */
function MomentBloom({ progress, still }: { progress: number; still: boolean }) {
  const open = 0.3 + 0.7 * progress
  return (
    <svg
      viewBox="0 0 60 60"
      className="size-12"
      role="img"
      aria-label={momentInWords(progress)}
      data-testid="moment-bloom"
      data-progress={(Math.floor(progress * 100) / 100).toFixed(2)}
    >
      <circle cx="30" cy="30" r="27" className="fill-rind-wash" />
      <g
        style={{
          transform: `scale(${open})`,
          transformOrigin: '30px 30px',
          transition: still ? undefined : 'transform 400ms ease-out',
        }}
      >
        {PETAL_ANGLES.map((angle) => (
          <ellipse
            key={angle}
            cx="30"
            cy="15"
            rx="7"
            ry="13"
            transform={`rotate(${angle} 30 30)`}
            className="fill-moss stroke-rind"
            strokeWidth="1"
            style={{ opacity: 0.35 + 0.65 * progress }}
          />
        ))}
        <circle cx="30" cy="30" r="6" className="fill-clay" />
      </g>
    </svg>
  )
}

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
  const still = useSense().motionScale === 0
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
  // on screen derives from that one count, so the bloom and the guidance agree.
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
      <div className="mx-auto w-full max-w-[var(--w-prose)]">
        <div ref={cardRef} className={cn('grid gap-4 py-4 sm:py-6', compact && !showReward && 'gap-3 py-2 sm:gap-4 sm:py-6', !compact && !showReward && 'min-h-[420px] content-center')}>
          {!showReward ? (
            <>
              {(currentTask.id === 'reflect' || currentTask.id === 'appreciate' || currentTask.id === 'look') && (
                <MomentIcon id={currentTask.id} className={cn('mx-auto size-20', !still && styles.pulse)} />
              )}

              <h2 ref={headingRef} tabIndex={-1} className="sp-h2 focus:outline-none">
                {currentTask.title}
              </h2>

              {currentTask.id === 'listen' && <p className="text-body text-ink-soft">{listenInstruction}</p>}
              {currentTask.id === 'watch' && (
                <p className="text-small text-ink-soft sm:text-body">
                  The seeds settle only while you stay still. Moving never undoes anything; they just wait.
                </p>
              )}

              <p className="min-h-8 text-lead" aria-live="polite">
                {currentTask.guidance[guidanceIndex]}
              </p>

              {currentTask.id === 'watch' && (
                <div>
                  <SeedField settled={settledSeeds} fadeFrom={0} still={still} className="h-32 sm:h-56" />
                  <p className="mt-2 min-h-6 text-small text-ink-soft">{stirred ? 'The seeds wait while you move.' : ''}</p>
                </div>
              )}

              {currentTask.id === 'listen' && (
                <div className="relative flex h-40 items-center justify-center" role="img" aria-label="Quiet sound ripples">
                  {!still && (
                    <>
                      <div className={cn(styles.ripple, 'size-16')} style={{ animationDuration: '4s' }} />
                      <div className={cn(styles.ripple, 'size-24')} style={{ animationDuration: '5s', animationDelay: '0.8s' }} />
                    </>
                  )}
                  <div className="absolute size-32 rounded-full border-2 border-rule" />
                  <MomentIcon id="listen" className="relative size-12" />
                </div>
              )}

              {currentTask.id === 'listen' && canBuzz && !soundOn && (
                <div>
                  <WordChip label="Buzz when it ends" pressed={buzzAtEnd} onToggle={() => setBuzzAtEnd((on) => !on)} />
                </div>
              )}

              {currentTask.id === 'look' && (
                <label className="sp-field">
                  <span className="sp-field__label">What are you looking at? Naming it is optional.</span>
                  <input
                    type="text"
                    value={lookedAt}
                    maxLength={LOOKED_AT_MAX_LENGTH}
                    onChange={(e) => {
                      noteTyping([e.target.value])
                      setLookedAt(e.target.value)
                    }}
                    {...writingHandlers}
                    className="sp-field__input"
                  />
                </label>
              )}

              {currentTask.id === 'reflect' && (
                <div className="grid gap-3">
                  <p className="text-small text-ink-soft">Tap any words that fit. None is fine too.</p>
                  {[
                    { label: 'In your body', words: BODY_WORDS },
                    { label: 'In your mind', words: MIND_WORDS },
                  ].map((group) => (
                    <div key={group.label} role="group" aria-label={group.label} className="sp-stamp-row">
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
                <div className="grid gap-3">
                  <p className="text-small text-ink-soft">
                    Write them down if you like. They stay on this device, and only until midnight.
                  </p>
                  {THING_LABELS.map((label, i) => (
                    <label key={label} className="flex max-w-md items-center gap-3">
                      <span className="sr-only">{label}</span>
                      <span aria-hidden="true" className="w-5 text-right text-small text-ink-soft tabular-nums">{i + 1}.</span>
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
                        className="sp-field__input min-w-0 flex-1"
                      />
                    </label>
                  ))}
                </div>
              )}

              {welcomeBack && (
                <p className="text-small text-ink-soft" role="status">
                  Welcome back. The moment waited for you.
                </p>
              )}

              {/* Progress is a flower slowly opening, with no numbers; a screen reader can ask how far along it is, and is never told. */}
              <div className="flex flex-wrap items-center gap-3">
                <MomentBloom progress={progress} still={still} />
                {compact && (
                  timeUp ? (
                    <Go onClick={() => finishMoment(currentTask)}>Done</Go>
                  ) : (
                    <QuietButton onClick={resetTask}>Leave early</QuietButton>
                  )
                )}
              </div>

              {!compact && (
                timeUp ? (
                  <>
                    <p className="text-small text-ink-soft" role="status">
                      That was the whole time. Finish your thought, then press Done.
                    </p>
                    <div>
                      <Go onClick={() => finishMoment(currentTask)}>Done</Go>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="min-h-6 text-small text-ink-soft">
                      {writingPaused ? 'The time waits while you write.' : 'No rush. Just be here.'}
                    </p>
                    <div>
                      <QuietButton onClick={resetTask}>Leave early</QuietButton>
                    </div>
                  </>
                )
              )}
            </>
          ) : (
            <>
              {currentTask.id === 'watch' ? (
                <SeedField settled={SEED_COUNT} fadeFrom={SEED_COUNT - 1} still={still} registered className="h-28 w-full max-w-xs" />
              ) : (
                <MomentIcon id={currentTask.id} className="size-16" />
              )}
              <h2 ref={headingRef} tabIndex={-1} className="sp-h2 focus:outline-none">
                Moment savored
              </h2>

              {currentTask.id === 'watch' && (
                <p className="text-body">
                  {stirCount === 0
                    ? 'All eight seeds settled, and you did not move once.'
                    : 'All eight seeds settled. When you stirred them, they waited for you.'}
                </p>
              )}

              {currentTask.id === 'listen' && (
                <div className="grid gap-3">
                  <div role="group" aria-label="What did you hear?" className="grid gap-3">
                    <p className="font-bold" aria-hidden="true">What did you hear?</p>
                    <div className="sp-stamp-row">
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
                  <p className="min-h-14 text-body" aria-live="polite">
                    {heard.length === 0
                      ? ''
                      : heard[0] === 'Almost nothing'
                        ? 'Almost nothing. That kind of quiet is rarer than it sounds.'
                        : `You heard ${joinNaturally(heard.map((s) => (s === 'My own breath' ? 'your own breath' : s.toLowerCase())))}. Most of the day, they go unheard.`}
                  </p>
                </div>
              )}

              {currentTask.id === 'look' && (
                <p className="text-body">
                  {lookedAtName ? (
                    <>You gave <strong className="font-bold">{lookedAtName}</strong> a whole minute. Most things get a glance.</>
                  ) : (
                    'You gave one thing a whole minute. Most things get a glance.'
                  )}
                </p>
              )}

              {currentTask.id === 'reflect' && (
                <p className="text-body">
                  {feelings.length === 0
                    ? 'You stayed with this moment without needing to name it. That counts.'
                    : `Right now: ${joinNaturally(feelings.map((w) => w.toLowerCase()))}. ${
                      feelings.some((w) => UNEASY_WORDS.includes(w))
                        ? 'Naming a feeling often loosens it a little.'
                        : 'Good to know this is here too.'
                    }`}
                </p>
              )}

              {currentTask.id === 'appreciate' && (
                notedThings.length > 0 ? (
                  <div>
                    <p className="mb-2 text-small text-ink-soft">Today you noticed</p>
                    <ul className="grid gap-1 text-body">
                      {notedThings.map((thing, i) => (
                        <li key={i}>{thing}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-body">You gave a little while to what is good today, written down or not.</p>
                )
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Go onClick={resetTask}>Continue slowing down</Go>
                <Stamp onClick={() => startTask(currentTask)}>Stay a little longer</Stamp>
              </div>
              {rewardRecord && <MomentKeepsake record={rewardRecord} label="Keep this moment" className="mt-6 border-t border-rule pt-6" />}
            </>
          )}
        </div>
      </div>
    )
  }

  const savoredIds = new Set(strip.map((r) => r.id))
  const opened = strip.find((r) => r.key === openCard) ?? null

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 grid max-w-[var(--w-prose)] gap-2">
        <h2 ref={headingRef} tabIndex={-1} className="sp-h2 focus:outline-none">
          Choose a moment to savor
        </h2>
        <p className="text-body text-ink-soft">
          An anti-game about noticing: nothing to win, nothing to hurry. Pick one small thing and give it your full attention.
        </p>
      </div>

      <ul className={cn(styles.cards, 'mb-8')}>
        {MOMENTS.map((task) => {
          const isCompleted = savoredIds.has(task.id)
          return (
            <li key={task.id} className="flex">
              <button
                type="button"
                onClick={() => startTask(task)}
                className={styles.card}
                aria-label={`${task.title}: ${task.description} ${task.durationLabel}.${isCompleted ? ' Savored today.' : ''}`}
              >
                <MomentIcon id={task.id} className="size-10 shrink-0" />
                <span className="grid gap-1">
                  <span className="text-body font-bold">{task.title}</span>
                  <span className="text-small text-ink-soft">{task.description}</span>
                  <span className="text-meta text-ink-soft">
                    {task.durationLabel}
                    {isCompleted && (
                      <>
                        {' · '}
                        <span className={styles.savored}>
                          <Icon name="done" size={12} />
                          savored today
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {strip.length > 0 && (
        <section aria-labelledby="today-strip-heading" className="grid gap-2 border-t border-rule pt-6">
          <h3 id="today-strip-heading" className="sp-h3">Today</h3>
          <p className="text-small text-ink-soft">
            Each moment you finish rests here until midnight. Open one to keep it.
          </p>
          <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3 pt-1" aria-label="Moments from today">
            {newestFirst(strip).map((record) => {
              const isOpen = record.key === openCard
              return (
                <li key={record.key} className="flex shrink-0 snap-start">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls="today-moment"
                    onClick={() => setOpenCard(isOpen ? null : record.key)}
                    className={cn(styles.card, styles.todayCard)}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <MomentIcon id={record.id} className="size-7" />
                      <span className="text-meta text-ink-soft tabular-nums">{timeOfDay(record.at)}</span>
                    </span>
                    <span className="block text-small font-bold">{MOMENT_TITLES[record.id]}</span>
                    <span className="line-clamp-2 break-words text-small text-ink-soft">{momentGist(record)}</span>
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
                className="mt-2 border-t border-rule pt-5"
              />
            )}
          </div>
        </section>
      )}
    </div>
  )
}
