'use client'

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react'
import { Press_Start_2P } from 'next/font/google'
import { Pause } from 'lucide-react'
import type { DiscoveryEvent, GameState, MutationResult, MutationRecord, PathPoint, PlayStyle } from './engine/types'
import { MECHANIC_CATEGORIES, DEFAULT_PARAMS, GAME_W, GAME_H, ENDING } from './engine/types'
import { getProfileSummary, plantSeed } from './engine/engine'
import { fallbackName, fallbackTagline, reflection } from './engine/naming'
import { planRun, planOrder, type PlanStep } from './engine/plan'
import { fallbackRule, discovery, hintFor } from './engine/rules'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { KeyHints } from '@/components/ui/KeyHints'
import GameCanvas from './components/GameCanvas'
import TitleScreen from './components/TitleScreen'
import FinaleScreen from './components/FinaleScreen'
import { isControlTarget } from './components/controls'
import { MechanicIcon } from './components/MechanicIcon'

const retroFont = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

type GamePhase = 'title' | 'playing' | 'paused' | 'finale'

type ActiveMechanic = { id: string; params: Record<string, number> }

interface Finale {
  closingLine: string
  path: PathPoint[]
  field: { w: number; h: number }
}

interface Named extends MutationRecord {
  hint: string
}

const MUTATE_URL = '/api/cascade/mutate'
const REQUEST_TIMEOUT_MS = 8000
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
const LAST_PLAN_KEY = 'shapeshifter_lastPlan'
// A phone gets a tall field so the game fills the screen instead of a third of it
const PORTRAIT_W = 480
const PORTRAIT_H = 720
// A rule's name stays on the field long enough to read, then the field is left to the player
const NAMED_MS = 9000

function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null
}

const RULE_COUNT = MECHANIC_CATEGORIES.length
const TOUCH_QUERY = '(pointer: coarse)'
const NARROW_QUERY = '(max-width: 639px)'

function subscribeQuery(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }
}
const subscribeTouch = subscribeQuery(TOUCH_QUERY)
const subscribeNarrow = subscribeQuery(NARROW_QUERY)

function textOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function toMutation(mechanicId: string, data: Record<string, unknown>, active: readonly string[]): MutationResult {
  const fallback = fallbackRule(mechanicId, active)
  return {
    mechanicId,
    params: { ...DEFAULT_PARAMS[mechanicId] },
    title: textOr(data.title, fallback.title),
    description: textOr(data.description, fallback.description),
    flavorText: textOr(data.flavorText, fallback.flavorText),
  }
}

function readLastPlan(): string | undefined {
  try {
    return localStorage.getItem(LAST_PLAN_KEY) ?? undefined
  } catch {
    return undefined
  }
}

function rememberPlan(order: string) {
  try {
    localStorage.setItem(LAST_PLAN_KEY, order)
  } catch {
    // Without storage the in-memory order still keeps this visit's replays different
  }
}

/** What a screen reader hears when a clue appears: where it is and what it looks like, never the rule's name. */
function plantedWords(id: string, place: string, firstClue: boolean): string {
  if (id === ENDING) {
    return `A small circle of light has appeared ${place}. When you are ready, go to it, or rest, and your game will finish.`
  }
  const how = firstClue ? 'Pulse the orb, or rest' : 'Go to it, gather light, or rest'
  return `Something new is growing ${place}: ${discovery(id).clue}. ${how}, and it will open.`
}

export default function CascadeGame() {
  const [phase, setPhase] = useState<GamePhase>('title')
  const [runId, setRunId] = useState(0)
  const [currentWave, setCurrentWave] = useState(0)
  const [allMutations, setAllMutations] = useState<MutationRecord[]>([])
  const [activeMechanics, setActiveMechanics] = useState<ActiveMechanic[]>([])
  const [seedId, setSeedId] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [named, setNamed] = useState<Named | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [gameName, setGameName] = useState('')
  const [tagline, setTagline] = useState('')
  const [finale, setFinale] = useState<Finale>({ closingLine: '', path: [], field: { w: GAME_W, h: GAME_H } })
  const [lockedPortrait, setLockedPortrait] = useState<boolean | null>(null)
  const reducedMotion = useReducedMotion()
  // Arrow keys cannot be pressed on a phone, so touch players always get the follow control
  const isTouch = useSyncExternalStore(subscribeTouch, () => window.matchMedia(TOUCH_QUERY).matches, () => false)
  const isNarrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW_QUERY).matches, () => false)
  // The field's shape is fixed once a run starts, so turning the phone never resets a game
  const portrait = lockedPortrait ?? isNarrow
  const [fieldW, fieldH] = portrait ? [PORTRAIT_W, PORTRAIT_H] : [GAME_W, GAME_H]
  const gameStateRef = useRef<GameState | null>(null)
  const prefetchRef = useRef<{ wave: number; promise: Promise<MutationResult> } | null>(null)
  // The words for the clue now growing in the field, kept until it opens
  const seedRuleRef = useRef<MutationResult | null>(null)
  // Events arrive from the game loop between renders, so the run's rules are also kept outside state
  const mechanicsRef = useRef<ActiveMechanic[]>([])
  const mutationsRef = useRef<MutationRecord[]>([])
  const runRef = useRef(0)
  const planRef = useRef<PlanStep[]>([])
  const lastPlanRef = useRef<string | undefined>(undefined)
  const boxRef = useRef<HTMLDivElement>(null)

  const fetchMutation = useCallback(async (
    wave: number,
    mechanics: ActiveMechanic[],
    mutations: MutationRecord[],
  ): Promise<MutationResult> => {
    const { category, options } = planRef.current[wave]
    const s = gameStateRef.current
    const active = mechanics.map(m => m.id)

    try {
      const res = await fetch(MUTATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wave,
          category,
          options,
          profile: s ? getProfileSummary(s) : null,
          activeMechanics: active,
          mutations,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) throw new Error(`mutate ${res.status}`)
      const data = await res.json()
      if (!options.includes(data.mechanicId)) throw new Error('unknown mechanic')
      return toMutation(data.mechanicId, data, active)
    } catch {
      // The run already leans toward one rule per step, so the game varies even with no reply
      return toMutation(options[0], {}, active)
    }
  }, [])

  const prefetch = useCallback((wave: number, mechanics: ActiveMechanic[], mutations: MutationRecord[]) => {
    prefetchRef.current = wave < RULE_COUNT
      ? { wave, promise: fetchMutation(wave, mechanics, mutations) }
      : null
  }, [fetchMutation])

  const handleStart = useCallback(() => {
    const avoid = lastPlanRef.current ?? readLastPlan()
    const plan = planRun(Math.random, isTouch, avoid)
    const order = planOrder(plan)
    planRef.current = plan
    lastPlanRef.current = order
    rememberPlan(order)
    setLockedPortrait(isNarrow)
    setPhase('playing')
    prefetch(0, [], [])
  }, [prefetch, isTouch, isNarrow])

  const handleDiscovery = useCallback((event: DiscoveryEvent) => {
    const s = gameStateRef.current
    if (!s) return

    if (event.type === 'clue-wanted') {
      const run = runRef.current
      const wave = mechanicsRef.current.length
      const pending = prefetchRef.current?.wave === wave
        ? prefetchRef.current.promise
        : fetchMutation(wave, mechanicsRef.current, mutationsRef.current)
      prefetchRef.current = null
      void pending.then((mutation) => {
        if (runRef.current !== run || gameStateRef.current !== s) return
        seedRuleRef.current = mutation
        plantSeed(s, mutation.mechanicId)
      })
      return
    }

    if (event.type === 'planted') {
      setSeedId(event.id)
      setHint(null)
      setAnnouncement(plantedWords(event.id, event.place, mechanicsRef.current.length === 0))
      return
    }

    if (event.type === 'opened') {
      const ids = mechanicsRef.current.map(m => m.id)
      const pending = seedRuleRef.current
      const mutation = pending?.mechanicId === event.id ? pending : toMutation(event.id, {}, ids)
      seedRuleRef.current = null
      const mechanics = [...mechanicsRef.current, { id: mutation.mechanicId, params: mutation.params }]
      const mutations = [
        ...mutationsRef.current,
        { id: mutation.mechanicId, title: mutation.title, description: mutation.description, flavorText: mutation.flavorText },
      ]
      mechanicsRef.current = mechanics
      mutationsRef.current = mutations
      setActiveMechanics(mechanics)
      setAllMutations(mutations)
      setCurrentWave(mechanics.length)
      setSeedId(null)
      setHint(null)
      setNamed(null)
      // Says what changed in plain words; the rule's name waits until the player has felt it
      setAnnouncement(`It opened. ${discovery(event.id).change}`)
      prefetch(mechanics.length, mechanics, mutations)
      return
    }

    const words = hintFor(event.id, isTouch)
    if (event.type === 'hint') {
      setHint(words)
      setAnnouncement(words)
      return
    }

    const rule = mutationsRef.current.find(m => m.id === event.id)
    if (!rule) return
    setHint(null)
    setNamed({ ...rule, hint: words })
    setAnnouncement(`${rule.title}. ${rule.description} ${words}`)
  }, [fetchMutation, prefetch, isTouch])

  useEffect(() => {
    if (!named) return
    const t = setTimeout(() => setNamed(null), NAMED_MS)
    return () => clearTimeout(t)
  }, [named])

  const handleGameComplete = useCallback(async () => {
    const s = gameStateRef.current
    const finalScore = s ? Math.floor(s.score) : 0
    const run = runRef.current
    const style: PlayStyle = s ? getProfileSummary(s).playStyle : 'gentle'
    setFinale({
      path: s ? [...s.path] : [],
      field: { w: s?.w ?? GAME_W, h: s?.h ?? GAME_H },
      closingLine: reflection({
        transformed: s?.transformed ?? 0,
        bumps: s?.bumps ?? 0,
        carries: s?.carries ?? 0,
        foundBy: s ? [...s.foundBy] : [],
      }),
    })
    setGameName('')
    setTagline('')
    setPhase('finale')

    let name = fallbackName(allMutations.map(m => m.id), style)
    let line = fallbackTagline({
      mechanicIds: allMutations.map(m => m.id),
      style,
      transformed: s?.transformed ?? 0,
    })
    try {
      const res = await fetch(MUTATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isNaming: true,
          mutations: allMutations,
          score: finalScore,
          profile: s ? getProfileSummary(s) : null,
          transformed: s?.transformed ?? 0,
          bumps: s?.bumps ?? 0,
          carries: s?.carries ?? 0,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.gameName === 'string' && data.gameName) name = data.gameName
        if (typeof data.tagline === 'string' && data.tagline) line = data.tagline
      }
    } catch {
      // The play-style name above is the fallback
    }
    if (runRef.current !== run) return
    setGameName(name)
    setTagline(line)
  }, [allMutations])

  const handlePlayAgain = useCallback(() => {
    runRef.current += 1
    setRunId(runRef.current)
    setPhase('title')
    setCurrentWave(0)
    setAllMutations([])
    setActiveMechanics([])
    setSeedId(null)
    setHint(null)
    setNamed(null)
    setAnnouncement('')
    mechanicsRef.current = []
    mutationsRef.current = []
    seedRuleRef.current = null
    setGameName('')
    setTagline('')
    setLockedPortrait(null)
    prefetchRef.current = null
  }, [])

  const pause = useCallback(() => setPhase(p => (p === 'playing' ? 'paused' : p)), [])
  const resume = useCallback(() => setPhase(p => (p === 'paused' ? 'playing' : p)), [])

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'paused') return
    // Buttons are fine (the pause card focuses RESUME); only typing in a field is left alone
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || isTextEntry(e.target)) return
      const key = e.key.toLowerCase()
      if (key !== 'escape' && key !== 'p') return
      if (phase === 'playing') pause()
      else resume()
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') pause()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [phase, pause, resume])

  // The finale is taller than a short laptop screen allows only if the box is half scrolled away
  useEffect(() => {
    if (phase !== 'finale') return
    boxRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [phase, reducedMotion])

  // While the game has focus, the arrow keys and Space belong to it, never to the page's scrollbar
  const keepKeysInGame = (e: React.KeyboardEvent) => {
    if (ARROW_KEYS.has(e.key) || (e.key === ' ' && !isControlTarget(e.target))) e.preventDefault()
  }

  const showHud = phase === 'playing' || phase === 'paused'
  const blooming = activeMechanics.some(m => m.id === 'score_rush')
  const fade = reducedMotion ? '' : 'animate-fade'
  const caption = seedId === ENDING
    ? 'When you are ready, go to the circle, or rest.'
    : seedId && currentWave === 0
      ? `Something is growing. ${isTouch ? 'Tap the orb' : 'Press Space'}, or just rest.`
      : seedId
        ? 'Something is growing. Go to it, or rest.'
        : hint ?? (currentWave === 0 ? (isTouch ? 'Tap the orb.' : 'Click the orb, or press Space.') : blooming ? 'the bloom' : null)

  return (
    // The finished game takes the page's width, so its map and legend are drawn large enough to read
    <div className={`w-full mx-auto ${phase === 'finale' ? 'max-w-3xl' : 'max-w-[640px]'}`} onKeyDown={keepKeysInGame}>
      <h1 className="sr-only">The Shapeshifter</h1>
      {/* Overlays share the canvas's grid cell so a tall screen grows the box instead of being clipped */}
      <div ref={boxRef} className="grid rounded-xl overflow-hidden border border-card-border bg-card-bg scroll-mt-20">
        {/* Hidden under the finale, so the box takes the finale's height rather than the field's */}
        <div className={`col-start-1 row-start-1 ${phase === 'finale' ? 'hidden' : ''}`}>
          <GameCanvas
            key={`${runId}-${fieldW}`}
            width={fieldW}
            height={fieldH}
            isPlaying={phase === 'playing'}
            activeMechanics={activeMechanics}
            onDiscovery={handleDiscovery}
            onGameComplete={handleGameComplete}
            gameStateRef={gameStateRef}
            reducedMotion={reducedMotion}
          />
        </div>

        {showHud && (
          <div
            className="col-start-1 row-start-1 self-start relative w-full pointer-events-none z-10"
            style={{ aspectRatio: `${fieldW} / ${fieldH}` }}
          >
            {/* The name comes last: the rule has already been seen and used by the time it appears */}
            {named && (
              <div className="absolute top-8 inset-x-3 flex justify-center" data-testid="rule-named">
                <div className={`max-w-sm text-center rounded-lg border border-card-border bg-card-bg/90 px-4 py-2.5 ${fade}`}>
                  <p className={`flex items-center justify-center gap-2 text-[11px] sm:text-sm leading-relaxed text-melon-green break-words ${retroFont.className}`}>
                    <MechanicIcon id={named.id} size={16} />
                    {named.title}
                  </p>
                  <p className="text-sm text-foreground mt-1 break-words">{named.description}</p>
                  {named.flavorText && <p className="text-xs italic text-foreground/75 mt-1 break-words">{named.flavorText}</p>}
                  <p className="text-xs text-foreground/80 mt-1">{named.hint}</p>
                </div>
              </div>
            )}

            {phase === 'playing' && caption && (
              <p className="absolute bottom-6 sm:bottom-8 inset-x-3 text-center text-sm text-foreground/80">
                <span className="rounded bg-card-bg/80 px-2 py-0.5">{caption}</span>
              </p>
            )}
          </div>
        )}

        {phase === 'paused' && (
          <div
            className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center gap-4 px-4 py-8 bg-card-bg/95"
            role="dialog"
            aria-label="Paused"
          >
            <p className={`text-base tracking-[0.3em] text-melon-green ${retroFont.className}`}>PAUSED</p>
            <p className="text-sm text-foreground/80">Take as long as you like.</p>
            <button
              type="button"
              onClick={resume}
              autoFocus
              className={`text-xs tracking-[0.15em] px-5 py-3 rounded-lg cursor-pointer bg-melon-green text-card-bg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${retroFont.className}`}
            >
              RESUME
            </button>
            <button
              type="button"
              onClick={handlePlayAgain}
              className="text-sm underline cursor-pointer text-foreground/80 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded px-1 min-h-[44px]"
            >
              Start over
            </button>
            {!isTouch && <KeyHints>Esc or P pauses and resumes.</KeyHints>}
          </div>
        )}

        {phase === 'title' && (
          <TitleScreen onStart={handleStart} retroFont={retroFont.className} isTouch={isTouch} focusBegin={runId > 0} />
        )}

        {phase === 'finale' && (
          <FinaleScreen
            gameName={gameName}
            tagline={tagline}
            closingLine={finale.closingLine}
            mutations={allMutations}
            path={finale.path}
            field={finale.field}
            onPlayAgain={handlePlayAgain}
            retroFont={retroFont.className}
            reducedMotion={reducedMotion}
          />
        )}
      </div>

      {/* Pause sits below the field, so a thumb guiding the orb can never press it by accident */}
      <div className="flex items-center justify-between gap-3 mt-2 min-h-11">
        {phase === 'playing' && (
          <>
            <button
              type="button"
              onClick={pause}
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg border border-card-border bg-card-bg text-sm text-foreground/85 hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Pause size={16} aria-hidden="true" />
              Pause
            </button>
            {!isTouch && <KeyHints>Esc or P also pauses.</KeyHints>}
          </>
        )}
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {phase === 'playing' && announcement}
        {phase === 'paused' && 'Paused.'}
        {phase === 'finale' && 'Your game is finished.'}
      </div>
    </div>
  )
}
