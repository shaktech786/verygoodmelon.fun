'use client'

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react'
import { Press_Start_2P } from 'next/font/google'
import { Pause } from 'lucide-react'
import type { GameState, MutationResult, MutationRecord, PlayStyle } from './engine/types'
import { MECHANIC_CATEGORIES, MECHANIC_OPTIONS, DEFAULT_PARAMS, MAX_WAVES } from './engine/types'
import { getProfileSummary } from './engine/engine'
import { fallbackName, fallbackTagline, reflection } from './engine/naming'
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
const BLOOM_SECONDS = DEFAULT_PARAMS.score_rush.duration
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '])

const FALLBACK_MUTATIONS: Record<string, Omit<MutationResult, 'params'>> = {
  arrow_keys: {
    mechanicId: 'arrow_keys',
    title: 'IT CAN MOVE',
    description: 'Your orb learned to wander.',
    flavorText: 'It had been sitting still for a long time.',
  },
  mouse_follow: {
    mechanicId: 'mouse_follow',
    title: 'IT FOLLOWS YOU',
    description: 'Your orb drifts wherever you point.',
    flavorText: 'It seems to like your company.',
  },
  stars: {
    mechanicId: 'stars',
    title: 'STARS ARRIVE',
    description: 'Small stars appear. Gather them as you go.',
    flavorText: 'The dark is being generous today.',
  },
  pulse_gems: {
    mechanicId: 'pulse_gems',
    title: 'BREATHING GEMS',
    description: 'Gems glow softly and dim again.',
    flavorText: 'They shine at their own pace.',
  },
  chasers: {
    mechanicId: 'chasers',
    title: 'SHY SHADOWS',
    description: 'Little shadows drift toward you. They only want to be near.',
    flavorText: 'Every bright thing gathers company.',
  },
  sweepers: {
    mechanicId: 'sweepers',
    title: 'TIDES',
    description: 'Slow tides of light sweep across and carry you along.',
    flavorText: 'Sometimes it is easier to float.',
  },
  blaster: {
    mechanicId: 'blaster',
    title: 'A LANTERN',
    description: 'Your orb can send out light. Shadows it reaches turn into stars.',
    flavorText: 'Shadows were only stars that had not been seen yet.',
  },
  phase_dash: {
    mechanicId: 'phase_dash',
    title: 'GLIDE',
    description: 'Your orb can glide. Glide through a shadow and it becomes a star.',
    flavorText: 'Lighter than it looks.',
  },
  combo_chain: {
    mechanicId: 'combo_chain',
    title: 'RHYTHM',
    description: 'Gathering in a steady rhythm makes your glow grow.',
    flavorText: 'No rush. Just a rhythm.',
  },
  gravity_well: {
    mechanicId: 'gravity_well',
    title: 'GENTLE PULL',
    description: 'Lights near you drift closer on their own.',
    flavorText: 'Good things find their way to you.',
  },
  score_rush: {
    mechanicId: 'score_rush',
    title: 'THE BLOOM',
    description: 'Every shadow turns to light, and the stars come thick and bright.',
    flavorText: 'Everything you met along the way, glowing at once.',
  },
}

const DEFAULT_PICKS: Record<string, string> = {
  movement: 'arrow_keys',
  collectible: 'stars',
  threat: 'chasers',
  power: 'blaster',
  modifier: 'combo_chain',
  climax: 'score_rush',
}

function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null
}

const MUTATION_COUNT = MECHANIC_CATEGORIES.length
const TOUCH_QUERY = '(pointer: coarse)'

function subscribeTouch(onChange: () => void) {
  const mq = window.matchMedia(TOUCH_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function textOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function toMutation(mechanicId: string, data: Record<string, unknown>): MutationResult {
  const fallback = FALLBACK_MUTATIONS[mechanicId]
  return {
    mechanicId,
    params: { ...DEFAULT_PARAMS[mechanicId] },
    title: textOr(data.title, fallback.title),
    description: textOr(data.description, fallback.description),
    flavorText: textOr(data.flavorText, fallback.flavorText),
  }
}

export default function CascadeGame() {
  const [phase, setPhase] = useState<GamePhase>('title')
  const [runId, setRunId] = useState(0)
  const [currentWave, setCurrentWave] = useState(0)
  const [score, setScore] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [rushTimer, setRushTimer] = useState(0)
  const [currentMutation, setCurrentMutation] = useState<MutationResult | null>(null)
  const [allMutations, setAllMutations] = useState<MutationRecord[]>([])
  const [activeMechanics, setActiveMechanics] = useState<ActiveMechanic[]>([])
  const [gameName, setGameName] = useState('')
  const [tagline, setTagline] = useState('')
  const [finale, setFinale] = useState({ statValue: 0, statLabel: '', totalTime: 0, closingLine: '' })
  const reducedMotion = useReducedMotion()
  // Arrow keys cannot be pressed on a phone, so touch players always get the follow control
  const isTouch = useSyncExternalStore(subscribeTouch, () => window.matchMedia(TOUCH_QUERY).matches, () => false)
  const gameStateRef = useRef<GameState | null>(null)
  const prefetchRef = useRef<{ wave: number; promise: Promise<MutationResult> } | null>(null)
  const runRef = useRef(0)

  const fetchMutation = useCallback(async (
    wave: number,
    mechanics: ActiveMechanic[],
    mutations: MutationRecord[],
  ): Promise<MutationResult> => {
    const category = MECHANIC_CATEGORIES[wave]
    const options = category === 'movement' && isTouch ? ['mouse_follow'] : [...MECHANIC_OPTIONS[category]]
    const s = gameStateRef.current

    try {
      const res = await fetch(MUTATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wave,
          category,
          options,
          profile: s ? getProfileSummary(s) : null,
          activeMechanics: mechanics.map(m => m.id),
          mutations,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) throw new Error(`mutate ${res.status}`)
      const data = await res.json()
      if (!options.includes(data.mechanicId)) throw new Error('unknown mechanic')
      return toMutation(data.mechanicId, data)
    } catch {
      const pick = options.includes(DEFAULT_PICKS[category]) ? DEFAULT_PICKS[category] : options[0]
      return toMutation(pick, {})
    }
  }, [isTouch])

  const prefetch = useCallback((wave: number, mechanics: ActiveMechanic[], mutations: MutationRecord[]) => {
    prefetchRef.current = wave < MUTATION_COUNT
      ? { wave, promise: fetchMutation(wave, mechanics, mutations) }
      : null
  }, [fetchMutation])

  const handleStart = useCallback(() => {
    setPhase('playing')
    prefetch(0, [], [])
  }, [prefetch])

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
      statLabel: hasChain ? 'longest rhythm' : 'stars gathered',
      totalTime: s?.totalTime ?? 0,
      closingLine: reflection({ transformed: s?.transformed ?? 0, nudges: s?.nudges ?? 0 }),
    })
    setGameName('')
    setTagline('')
    setPhase('finale')

    let name = fallbackName(allMutations.map(m => m.id), style)
    let line = fallbackTagline(style)
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
          nudges: s?.nudges ?? 0,
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
    setMultiplier(1)
    setRushTimer(0)
    setCurrentMutation(null)
    setAllMutations([])
    setActiveMechanics([])
    setGameName('')
    setTagline('')
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

  // A key still held from play would otherwise scroll the page and carry the new rule's card out of view
  useEffect(() => {
    if (phase !== 'mutating') return
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key) && !isControlTarget(e.target)) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  const showHud = phase === 'playing' || phase === 'paused' || phase === 'mutating'
  const bloomLeft = rushTimer / BLOOM_SECONDS

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <h1 className="sr-only">The Shapeshifter</h1>
      {/* Overlays share the canvas's grid cell so a tall screen grows the box instead of being clipped */}
      <div className="grid rounded-xl overflow-hidden border border-card-border bg-card-bg">
        <div className="col-start-1 row-start-1">
          <GameCanvas
            key={runId}
            isPlaying={phase === 'playing'}
            activeMechanics={activeMechanics}
            onMutationReady={handleMutationReady}
            onGameComplete={handleGameComplete}
            onScoreChange={setScore}
            onMultiplierChange={setMultiplier}
            onRushTimerChange={setRushTimer}
            gameStateRef={gameStateRef}
            reducedMotion={reducedMotion}
          />
        </div>

        {showHud && (
          <div className="col-start-1 row-start-1 self-start relative w-full aspect-[4/3] pointer-events-none z-10">
            <p className="absolute top-2 left-3 text-xs text-foreground/80">
              Wave {currentWave + 1} of {MAX_WAVES}
            </p>

            <p className="absolute top-2 right-3 text-right text-foreground">
              <span className="text-xs text-foreground/80 mr-1.5">light</span>
              <span className="text-sm sm:text-base font-semibold tabular-nums">{score}</span>
            </p>

            {multiplier > 1 && (
              <p className="absolute top-2 left-1/2 -translate-x-1/2 text-xs sm:text-sm font-semibold text-accent">
                {multiplier}× glow
              </p>
            )}

            {phase === 'playing' && currentWave === 0 && (
              <p className="absolute bottom-12 sm:bottom-16 inset-x-0 text-center text-sm text-foreground/80">
                {isTouch ? 'Tap the orb.' : 'Click the orb, or press Space.'}
              </p>
            )}

            {rushTimer > 0 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1/2 max-w-[240px]" aria-hidden="true">
                <p className="text-center text-xs text-foreground/80 mb-1">the bloom</p>
                <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-[var(--melon-pink)] ${reducedMotion ? '' : 'transition-[width] duration-1000 ease-linear'}`}
                    style={{ width: `${Math.max(0, Math.min(1, bloomLeft)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {phase === 'playing' && (
              <button
                type="button"
                onClick={pause}
                aria-label="Pause"
                className="pointer-events-auto absolute bottom-2 left-2 w-11 h-11 flex items-center justify-center rounded-lg border border-card-border bg-card-bg/90 text-foreground/80 hover:text-foreground cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Pause size={18} aria-hidden="true" />
              </button>
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
              className="text-sm underline cursor-pointer text-foreground/80 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-1"
            >
              Start over
            </button>
            {!isTouch && <p className="text-xs text-foreground/70">Esc or P to pause and resume</p>}
          </div>
        )}

        {phase === 'title' && (
          <TitleScreen onStart={handleStart} retroFont={retroFont.className} isTouch={isTouch} />
        )}

        {phase === 'mutating' && (
          <MutationScreen
            key={currentWave}
            mutation={currentMutation}
            waveNumber={currentWave + 1}
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

      <div className="sr-only" role="status" aria-live="polite">
        {phase === 'playing' && `Wave ${currentWave + 1} of ${MAX_WAVES}.`}
        {phase === 'paused' && 'Paused.'}
      </div>
    </div>
  )
}
