'use client'

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react'
import { Press_Start_2P } from 'next/font/google'
import { Pause } from 'lucide-react'
import type { GameState, MutationResult, MutationRecord, PlayStyle } from './engine/types'
import { MECHANIC_CATEGORIES, DEFAULT_PARAMS, GAME_W, GAME_H } from './engine/types'
import { getProfileSummary } from './engine/engine'
import { fallbackName, fallbackTagline, reflection } from './engine/naming'
import { planRun, planOrder, type PlanStep } from './engine/plan'
import { fallbackRule } from './engine/rules'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import GameCanvas from './components/GameCanvas'
import TitleScreen from './components/TitleScreen'
import MutationScreen from './components/MutationScreen'
import FinaleScreen from './components/FinaleScreen'
import { isControlTarget } from './components/controls'

const retroFont = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

type GamePhase = 'title' | 'playing' | 'paused' | 'mutating' | 'finale'

type ActiveMechanic = { id: string; params: Record<string, number> }

const MUTATE_URL = '/api/cascade/mutate'
const REQUEST_TIMEOUT_MS = 8000
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
const LAST_PLAN_KEY = 'shapeshifter_lastPlan'
// A phone gets a tall field so the game fills the screen instead of a third of it
const PORTRAIT_W = 480
const PORTRAIT_H = 720

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

function rulesLabel(learned: number): string {
  return learned === 0 ? 'No rules yet' : `Rule ${learned} of ${RULE_COUNT}`
}

export default function CascadeGame() {
  const [phase, setPhase] = useState<GamePhase>('title')
  const [runId, setRunId] = useState(0)
  const [currentWave, setCurrentWave] = useState(0)
  const [score, setScore] = useState(0)
  const [currentMutation, setCurrentMutation] = useState<MutationResult | null>(null)
  const [allMutations, setAllMutations] = useState<MutationRecord[]>([])
  const [activeMechanics, setActiveMechanics] = useState<ActiveMechanic[]>([])
  const [gameName, setGameName] = useState('')
  const [tagline, setTagline] = useState('')
  const [finale, setFinale] = useState({ statValue: 0, statLabel: '', totalTime: 0, closingLine: '' })
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

  const handleMutationReady = useCallback(async () => {
    setPhase('mutating')
    setCurrentMutation(null)

    const run = runRef.current
    const pending = prefetchRef.current?.wave === currentWave
      ? prefetchRef.current.promise
      : fetchMutation(currentWave, activeMechanics, allMutations)
    prefetchRef.current = null

    const mutation = await pending
    if (runRef.current === run) setCurrentMutation(mutation)
  }, [currentWave, activeMechanics, allMutations, fetchMutation])

  const handleMutationContinue = useCallback(() => {
    if (!currentMutation) return

    const mechanics = [...activeMechanics, { id: currentMutation.mechanicId, params: currentMutation.params }]
    const mutations = [
      ...allMutations,
      {
        id: currentMutation.mechanicId,
        title: currentMutation.title,
        description: currentMutation.description,
        flavorText: currentMutation.flavorText,
      },
    ]
    setActiveMechanics(mechanics)
    setAllMutations(mutations)
    setCurrentWave(currentWave + 1)
    setCurrentMutation(null)
    setPhase('playing')
    prefetch(currentWave + 1, mechanics, mutations)
  }, [currentMutation, activeMechanics, allMutations, currentWave, prefetch])

  const handleGameComplete = useCallback(async () => {
    const s = gameStateRef.current
    const finalScore = s ? Math.floor(s.score) : score
    const run = runRef.current
    const hasChain = allMutations.some(m => m.id === 'combo_chain') && (s?.maxCombo ?? 0) > 1
    const style: PlayStyle = s ? getProfileSummary(s).playStyle : 'gentle'
    setScore(finalScore)
    setFinale({
      statValue: (hasChain ? s?.maxCombo : s?.collectTotal) ?? 0,
      statLabel: hasChain ? 'longest rhythm' : 'lights gathered',
      totalTime: s?.totalTime ?? 0,
      closingLine: reflection({ transformed: s?.transformed ?? 0, bumps: s?.bumps ?? 0, carries: s?.carries ?? 0 }),
    })
    setGameName('')
    setTagline('')
    setPhase('finale')

    let name = fallbackName(allMutations.map(m => m.id), style)
    let line = fallbackTagline({
      mechanicIds: allMutations.map(m => m.id),
      style,
      collected: s?.collectTotal ?? 0,
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
  }, [score, allMutations])

  const handlePlayAgain = useCallback(() => {
    runRef.current += 1
    setRunId(runRef.current)
    setPhase('title')
    setCurrentWave(0)
    setScore(0)
    setCurrentMutation(null)
    setAllMutations([])
    setActiveMechanics([])
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

  const showHud = phase === 'playing' || phase === 'paused' || phase === 'mutating'
  const blooming = activeMechanics.some(m => m.id === 'score_rush')
  const hudLabel = rulesLabel(currentWave)

  return (
    <div className="w-full max-w-[640px] mx-auto" onKeyDown={keepKeysInGame}>
      <h1 className="sr-only">The Shapeshifter</h1>
      {/* Overlays share the canvas's grid cell so a tall screen grows the box instead of being clipped */}
      <div ref={boxRef} className="grid rounded-xl overflow-hidden border border-card-border bg-card-bg scroll-mt-20">
        <div className="col-start-1 row-start-1">
          <GameCanvas
            key={`${runId}-${fieldW}`}
            width={fieldW}
            height={fieldH}
            isPlaying={phase === 'playing'}
            activeMechanics={activeMechanics}
            onMutationReady={handleMutationReady}
            onGameComplete={handleGameComplete}
            onScoreChange={setScore}
            gameStateRef={gameStateRef}
            reducedMotion={reducedMotion}
          />
        </div>

        {showHud && (
          <div
            className="col-start-1 row-start-1 self-start relative w-full pointer-events-none z-10"
            style={{ aspectRatio: `${fieldW} / ${fieldH}` }}
          >
            <p className="absolute top-2 left-3 text-xs text-foreground/80">{hudLabel}</p>

            <p className="absolute top-2 right-3 text-right text-foreground">
              <span className="text-xs text-foreground/80 mr-1.5">light</span>
              <span className="text-sm sm:text-base font-semibold tabular-nums">{score}</span>
            </p>

            {phase === 'playing' && currentWave === 0 && (
              <p className="absolute bottom-6 sm:bottom-10 inset-x-0 text-center text-sm text-foreground/80">
                {isTouch ? 'Tap the orb.' : 'Click the orb, or press Space.'}
              </p>
            )}

            {blooming && (
              <p className="absolute bottom-3 inset-x-0 text-center text-xs text-foreground/80">the bloom</p>
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
              className={`text-xs tracking-[0.15em] px-5 py-3 rounded-lg cursor-pointer bg-melon-green text-card-bg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${retroFont.className}`}
            >
              RESUME
            </button>
            <button
              type="button"
              onClick={handlePlayAgain}
              className="text-sm underline cursor-pointer text-foreground/80 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-1 min-h-[44px]"
            >
              Start over
            </button>
            {!isTouch && <p className="text-xs text-foreground/70">Esc or P to pause and resume</p>}
          </div>
        )}

        {phase === 'title' && (
          <TitleScreen onStart={handleStart} retroFont={retroFont.className} isTouch={isTouch} focusBegin={runId > 0} />
        )}

        {phase === 'mutating' && (
          <MutationScreen
            key={currentWave}
            mutation={currentMutation}
            ruleNumber={currentWave + 1}
            ruleCount={RULE_COUNT}
            onContinue={handleMutationContinue}
            retroFont={retroFont.className}
            isTouch={isTouch}
            reducedMotion={reducedMotion}
          />
        )}

        {phase === 'finale' && (
          <FinaleScreen
            score={score}
            statValue={finale.statValue}
            statLabel={finale.statLabel}
            gameName={gameName}
            tagline={tagline}
            closingLine={finale.closingLine}
            mutations={allMutations}
            totalTime={finale.totalTime}
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
              className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg border border-card-border bg-card-bg text-sm text-foreground/85 hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Pause size={16} aria-hidden="true" />
              Pause
            </button>
            {!isTouch && <p className="text-xs text-foreground/70">Esc or P also pauses</p>}
          </>
        )}
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {phase === 'playing' && `${hudLabel}.`}
        {phase === 'paused' && 'Paused.'}
        {phase === 'finale' && 'Your game is finished.'}
      </div>
    </div>
  )
}
