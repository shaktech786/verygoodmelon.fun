'use client'

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react'
import { Press_Start_2P } from 'next/font/google'
import type { GameState, MutationResult, MutationRecord } from './engine/types'
import { MECHANIC_CATEGORIES, MECHANIC_OPTIONS, DEFAULT_PARAMS, COLORS, MAX_WAVES } from './engine/types'
import { getProfileSummary } from './engine/engine'
import GameCanvas from './components/GameCanvas'
import TitleScreen from './components/TitleScreen'
import MutationScreen from './components/MutationScreen'
import FinaleScreen from './components/FinaleScreen'

const retroFont = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

type GamePhase = 'title' | 'playing' | 'paused' | 'mutating' | 'finale'

type ActiveMechanic = { id: string; params: Record<string, number> }

const MUTATE_URL = '/api/cascade/mutate'
const REQUEST_TIMEOUT_MS = 8000

const FALLBACK_MUTATIONS: Record<string, Omit<MutationResult, 'params'>> = {
  arrow_keys: {
    mechanicId: 'arrow_keys',
    title: 'MOVEMENT ONLINE',
    description: 'Your orb learned to move.',
    flavorText: 'It was tired of sitting still.',
  },
  mouse_follow: {
    mechanicId: 'mouse_follow',
    title: 'FOLLOW ME',
    description: 'Your orb follows wherever you point.',
    flavorText: 'It has grown attached to you.',
  },
  stars: {
    mechanicId: 'stars',
    title: 'STARS APPEARED',
    description: 'Golden stars are spawning. Collect them.',
    flavorText: 'The void is generous today.',
  },
  pulse_gems: {
    mechanicId: 'pulse_gems',
    title: 'PHASE GEMS',
    description: 'Gems fade in and out. Catch them while they glow.',
    flavorText: 'Timing is everything.',
  },
  chasers: {
    mechanicId: 'chasers',
    title: 'THEY SEE YOU',
    description: 'Red squares appeared. They drift toward you.',
    flavorText: 'Your presence attracted attention.',
  },
  sweepers: {
    mechanicId: 'sweepers',
    title: 'BEAM SWEEPERS',
    description: 'Energy beams sweep across the arena.',
    flavorText: 'The grid is waking up.',
  },
  blaster: {
    mechanicId: 'blaster',
    title: 'PEW PEW ONLINE',
    description: 'Fight back. Your orb can shoot now.',
    flavorText: 'Those stars? They were ammo all along.',
  },
  phase_dash: {
    mechanicId: 'phase_dash',
    title: 'PHASE SHIFT',
    description: 'Dash through anything. Dashing through a red square breaks it.',
    flavorText: 'You learned to phase through matter.',
  },
  combo_chain: {
    mechanicId: 'combo_chain',
    title: 'COMBO SYSTEM',
    description: 'Chain pickups quickly for a score multiplier.',
    flavorText: 'Consistency is power.',
  },
  gravity_well: {
    mechanicId: 'gravity_well',
    title: 'GRAVITY WELL',
    description: 'Collectibles are drawn toward you.',
    flavorText: 'Your presence bends the field.',
  },
  score_rush: {
    mechanicId: 'score_rush',
    title: 'FINAL RUSH',
    description: 'Everything amplified. This is your moment.',
    flavorText: 'The cascade reaches its peak.',
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

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const TOUCH_QUERY = '(pointer: coarse)'

function subscribeMedia(onChange: () => void) {
  const queries = [REDUCED_MOTION_QUERY, TOUCH_QUERY].map(q => window.matchMedia(q))
  queries.forEach(mq => mq.addEventListener('change', onChange))
  return () => queries.forEach(mq => mq.removeEventListener('change', onChange))
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(subscribeMedia, () => window.matchMedia(query).matches, () => false)
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
  const [finale, setFinale] = useState({ statValue: 0, statLabel: '', totalTime: 0 })
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  // Arrow keys cannot be pressed on a phone, so touch players always get the follow control
  const isTouch = useMediaQuery(TOUCH_QUERY)
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
    const hasChain = allMutations.some(m => m.id === 'combo_chain')
    setScore(finalScore)
    setFinale({
      statValue: (hasChain ? s?.maxCombo : s?.collectTotal) ?? 0,
      statLabel: hasChain ? 'BEST CHAIN' : 'COLLECTED',
      totalTime: s?.totalTime ?? 0,
    })
    setGameName('')
    setTagline('')
    setPhase('finale')

    let name = `CASCADE #${finalScore}`
    let line = 'A game that built itself around you.'
    try {
      const res = await fetch(MUTATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isNaming: true,
          mutations: allMutations,
          score: finalScore,
          profile: s ? getProfileSummary(s) : null,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.gameName === 'string' && data.gameName) name = data.gameName
        if (typeof data.tagline === 'string' && data.tagline) line = data.tagline
      }
    } catch {
      // The score-based name above is the fallback
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

  const showHud = phase === 'playing' || phase === 'paused' || phase === 'mutating'
  const comboColor = COLORS.combo[Math.min(multiplier - 1, COLORS.combo.length - 1)]

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <style jsx global>{`
        @keyframes cascadeGlitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 1px); }
          40% { transform: translate(2px, -1px); }
          60% { transform: translate(-1px, 2px); }
          80% { transform: translate(1px, -2px); }
        }
      `}</style>

      {/* Overlays share the canvas's grid cell so a tall screen grows the box instead of being clipped */}
      <div className="grid" style={{ background: COLORS.bg, borderRadius: '12px', overflow: 'hidden' }}>
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
            <div className={`absolute top-2 right-3 text-right ${retroFont.className}`}>
              <span
                className="text-sm sm:text-base"
                style={{ color: '#ffffff', textShadow: '0 0 8px rgba(255,255,255,0.3)' }}
                aria-label={`Score ${score}`}
              >
                {score}
              </span>
            </div>

            <div className="absolute top-2 left-3">
              <span className="text-[10px] tracking-[0.1em]" style={{ color: '#8899aa', fontFamily: 'monospace' }}>
                WAVE {currentWave + 1}/{MAX_WAVES}
              </span>
            </div>

            {multiplier > 1 && (
              <div className={`absolute top-2 left-1/2 -translate-x-1/2 ${retroFont.className}`}>
                <span
                  className="text-xs sm:text-sm"
                  style={{ color: comboColor, textShadow: `0 0 10px ${comboColor}66` }}
                >
                  {multiplier}x
                </span>
              </div>
            )}

            {phase === 'playing' && currentWave === 0 && (
              <p
                className="absolute bottom-12 sm:bottom-16 inset-x-0 text-center text-[11px] tracking-[0.15em]"
                style={{ color: '#8899aa', fontFamily: 'monospace' }}
              >
                {isTouch ? 'TAP THE ORB' : 'CLICK THE ORB OR PRESS SPACE'}
              </p>
            )}

            {rushTimer > 0 && (
              <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 ${retroFont.className}`}>
                <span className="text-lg" style={{ color: '#ff00ff', textShadow: '0 0 12px rgba(255,0,255,0.5)' }}>
                  {rushTimer}
                </span>
              </div>
            )}

            {phase === 'playing' && (
              <button
                type="button"
                onClick={pause}
                aria-label="Pause"
                className={`pointer-events-auto absolute bottom-2 left-2 min-w-[40px] min-h-[40px] px-2 rounded border text-[10px] cursor-pointer ${retroFont.className}`}
                style={{ color: '#8899aa', borderColor: 'rgba(136,153,170,0.35)', background: 'rgba(8,8,16,0.6)' }}
              >
                II
              </button>
            )}
          </div>
        )}

        {phase === 'paused' && (
          <div
            className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center gap-4 rounded-lg px-4 py-8"
            style={{ background: 'rgba(8,8,16,0.9)' }}
            role="dialog"
            aria-label="Paused"
          >
            <p className={`text-lg tracking-[0.3em] ${retroFont.className}`} style={{ color: '#00ff88' }}>
              PAUSED
            </p>
            <button
              type="button"
              onClick={resume}
              autoFocus
              className={`text-xs tracking-[0.15em] border px-5 py-3 rounded cursor-pointer ${retroFont.className}`}
              style={{ color: '#00ff88', borderColor: 'rgba(0,255,136,0.4)', background: 'rgba(0,255,136,0.06)' }}
            >
              RESUME
            </button>
            <button
              type="button"
              onClick={handlePlayAgain}
              className="text-[11px] tracking-[0.15em] underline cursor-pointer"
              style={{ color: '#8899aa', fontFamily: 'monospace' }}
            >
              START OVER
            </button>
            {!isTouch && (
              <p className="text-[11px]" style={{ color: '#8899aa', fontFamily: 'monospace' }}>
                Esc or P to pause and resume
              </p>
            )}
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
            mutations={allMutations}
            totalTime={finale.totalTime}
            onPlayAgain={handlePlayAgain}
            retroFont={retroFont.className}
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
