'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Press_Start_2P } from 'next/font/google'
import type { GameState, MutationResult, MutationRecord } from './engine/types'
import { MECHANIC_CATEGORIES, MECHANIC_OPTIONS, DEFAULT_PARAMS, COLORS } from './engine/types'
import { getProfileSummary } from './engine/engine'
import GameCanvas from './components/GameCanvas'
import TitleScreen from './components/TitleScreen'
import MutationScreen from './components/MutationScreen'
import FinaleScreen from './components/FinaleScreen'

const retroFont = Press_Start_2P({ weight: '400', subsets: ['latin'], display: 'swap' })

type GamePhase = 'title' | 'playing' | 'mutating' | 'finale'

// Fallback mutations when AI is unavailable
const FALLBACK_MUTATIONS: Record<string, Omit<MutationResult, 'params'>> = {
  arrow_keys: {
    mechanicId: 'arrow_keys',
    title: 'MOVEMENT ONLINE',
    description: 'Your orb learned to move.',
    flavorText: 'It was tired of sitting still.',
    controlHint: 'ARROW KEYS / WASD to move',
  },
  mouse_follow: {
    mechanicId: 'mouse_follow',
    title: 'FOLLOW THE CURSOR',
    description: 'Your orb follows your every move.',
    flavorText: 'It has bonded with your cursor.',
    controlHint: 'Move your MOUSE to guide the orb',
  },
  stars: {
    mechanicId: 'stars',
    title: 'STARS APPEARED',
    description: 'Golden stars are spawning. Collect them.',
    flavorText: 'The void is generous today.',
    controlHint: 'Touch stars to collect',
  },
  pulse_gems: {
    mechanicId: 'pulse_gems',
    title: 'PHASE GEMS',
    description: 'Gems fade in and out. Catch them while they glow.',
    flavorText: 'Timing is everything.',
    controlHint: 'Catch gems while visible',
  },
  chasers: {
    mechanicId: 'chasers',
    title: 'THEY SEE YOU',
    description: 'Red squares appeared. They are hungry.',
    flavorText: 'Your presence attracted attention.',
    controlHint: 'Avoid the red squares!',
  },
  sweepers: {
    mechanicId: 'sweepers',
    title: 'BEAM SWEEPERS',
    description: 'Energy beams sweep across the arena.',
    flavorText: 'The grid is waking up.',
    controlHint: 'Dodge the beams!',
  },
  blaster: {
    mechanicId: 'blaster',
    title: 'PEW PEW ONLINE',
    description: 'Fight back. Your orb can shoot now.',
    flavorText: 'Those stars? They were ammo all along.',
    controlHint: 'SPACE to shoot',
  },
  phase_dash: {
    mechanicId: 'phase_dash',
    title: 'PHASE SHIFT',
    description: 'Dash through anything. Brief invincibility.',
    flavorText: 'You learned to phase through matter.',
    controlHint: 'SPACE to dash (2s cooldown)',
  },
  combo_chain: {
    mechanicId: 'combo_chain',
    title: 'COMBO SYSTEM',
    description: 'Chain actions for a score multiplier.',
    flavorText: 'Consistency is power.',
    controlHint: 'Chain actions without getting hit',
  },
  gravity_well: {
    mechanicId: 'gravity_well',
    title: 'GRAVITY WELL',
    description: 'Collectibles are drawn toward you.',
    flavorText: 'Your presence bends the field.',
    controlHint: 'Nearby collectibles drift to you',
  },
  score_rush: {
    mechanicId: 'score_rush',
    title: 'FINAL RUSH',
    description: 'Everything amplified. This is your moment.',
    flavorText: 'The cascade reaches its peak.',
    controlHint: 'Survive and score!',
  },
}

// Default mechanic selections when AI is unavailable
const DEFAULT_PICKS: Record<string, string> = {
  movement: 'arrow_keys',
  collectible: 'stars',
  threat: 'chasers',
  power: 'blaster',
  modifier: 'combo_chain',
  climax: 'score_rush',
}

export default function CascadeGame() {
  const [phase, setPhase] = useState<GamePhase>('title')
  const [currentWave, setCurrentWave] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [rushTimer, setRushTimer] = useState(0)
  const [currentMutation, setCurrentMutation] = useState<MutationResult | null>(null)
  const [allMutations, setAllMutations] = useState<MutationRecord[]>([])
  const [activeMechanics, setActiveMechanics] = useState<Array<{ id: string; params: Record<string, number> }>>([])
  const [gameName, setGameName] = useState('')
  const [tagline, setTagline] = useState('')
  const [reducedMotion, setReducedMotion] = useState(false)
  const gameStateRef = useRef<GameState | null>(null)
  const prefetchedRef = useRef<MutationResult | null>(null)
  const fetchingRef = useRef(false)

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Fetch mutation from AI
  const fetchMutation = useCallback(async (wave: number): Promise<MutationResult> => {
    const category = MECHANIC_CATEGORIES[wave] as string
    const options = MECHANIC_OPTIONS[category as keyof typeof MECHANIC_OPTIONS]
    if (!options) {
      return { ...FALLBACK_MUTATIONS.score_rush, params: DEFAULT_PARAMS.score_rush }
    }

    const s = gameStateRef.current
    const profile = s ? getProfileSummary(s) : null

    try {
      const res = await fetch('/api/cascade/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wave,
          category,
          options: [...options],
          profile,
          activeMechanics: activeMechanics.map(m => m.id),
          isFinale: wave === 5,
          mutations: allMutations,
        }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      return {
        mechanicId: data.mechanicId,
        params: { ...(DEFAULT_PARAMS[data.mechanicId] || {}), ...(data.params || {}) },
        title: data.title || FALLBACK_MUTATIONS[data.mechanicId]?.title || 'NEW MECHANIC',
        description: data.description || FALLBACK_MUTATIONS[data.mechanicId]?.description || '',
        flavorText: data.flavorText || '',
        controlHint: data.controlHint || FALLBACK_MUTATIONS[data.mechanicId]?.controlHint || '',
        gameName: data.gameName,
        tagline: data.tagline,
      }
    } catch {
      // Fallback: deterministic selection
      const pick = DEFAULT_PICKS[category] || options[0]
      return {
        ...FALLBACK_MUTATIONS[pick],
        params: DEFAULT_PARAMS[pick] || {},
      } as MutationResult
    }
  }, [activeMechanics, allMutations])

  // Pre-fetch next mutation
  const prefetchNext = useCallback(async (nextWave: number) => {
    if (fetchingRef.current || nextWave >= 6) return
    fetchingRef.current = true
    try {
      prefetchedRef.current = await fetchMutation(nextWave)
    } catch {
      prefetchedRef.current = null
    }
    fetchingRef.current = false
  }, [fetchMutation])

  // Start game
  const handleStart = useCallback(() => {
    setPhase('playing')
    setCurrentWave(0)
    // Pre-fetch first mutation (movement)
    prefetchNext(0)
  }, [prefetchNext])

  // Mutation ready
  const handleMutationReady = useCallback(async () => {
    setPhase('mutating')

    let mutation: MutationResult
    if (prefetchedRef.current) {
      mutation = prefetchedRef.current
      prefetchedRef.current = null
    } else {
      mutation = await fetchMutation(currentWave)
    }

    setCurrentMutation(mutation)

    // Pre-fetch the NEXT mutation
    if (currentWave + 1 < 6) {
      prefetchNext(currentWave + 1)
    }
  }, [currentWave, fetchMutation, prefetchNext])

  // Continue after mutation
  const handleMutationContinue = useCallback(() => {
    if (!currentMutation) return

    const newMechanic = {
      id: currentMutation.mechanicId,
      params: currentMutation.params,
    }

    setActiveMechanics(prev => [...prev, newMechanic])
    setAllMutations(prev => [
      ...prev,
      {
        id: currentMutation.mechanicId,
        title: currentMutation.title,
        description: currentMutation.description,
        flavorText: currentMutation.flavorText,
      },
    ])
    setCurrentWave(w => w + 1)
    setCurrentMutation(null)
    setPhase('playing')
  }, [currentMutation])

  // Game complete
  const handleGameComplete = useCallback(async () => {
    const s = gameStateRef.current
    const finalScore = s ? Math.floor(s.score) : score

    // Fetch game name from AI
    try {
      const res = await fetch('/api/cascade/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isNaming: true,
          mutations: allMutations,
          score: finalScore,
          profile: s ? getProfileSummary(s) : null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setGameName(data.gameName || 'UNNAMED CREATION')
        setTagline(data.tagline || '')
      }
    } catch {
      setGameName('CASCADE #' + Math.floor(Math.random() * 9999))
    }

    setPhase('finale')
  }, [score, allMutations])

  // Play again
  const handlePlayAgain = useCallback(() => {
    setPhase('title')
    setCurrentWave(0)
    setScore(0)
    setCombo(0)
    setMultiplier(1)
    setRushTimer(0)
    setCurrentMutation(null)
    setAllMutations([])
    setActiveMechanics([])
    setGameName('')
    setTagline('')
    prefetchedRef.current = null
    gameStateRef.current = null
  }, [])

  const isPlaying = phase === 'playing'

  return (
    <div className="w-full max-w-[680px] mx-auto px-2">
      {/* Game CSS */}
      <style jsx global>{`
        @keyframes cascadeGlitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 1px); }
          40% { transform: translate(2px, -1px); }
          60% { transform: translate(-1px, 2px); }
          80% { transform: translate(1px, -2px); }
        }
        @keyframes cascadePulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>

      {/* Game container */}
      <div className="relative" style={{ background: COLORS.bg, borderRadius: '12px', overflow: 'hidden' }}>
        {/* Canvas */}
        <GameCanvas
          isPlaying={isPlaying}
          activeMechanics={activeMechanics}
          onMutationReady={handleMutationReady}
          onGameComplete={handleGameComplete}
          onScoreChange={setScore}
          onComboChange={(c, m) => { setCombo(c); setMultiplier(m) }}
          onWaveChange={setCurrentWave}
          onRushTimerChange={setRushTimer}
          gameStateRef={gameStateRef}
          reducedMotion={reducedMotion}
        />

        {/* HUD overlay (only during playing) */}
        {(phase === 'playing' || phase === 'mutating') && (
          <div className="absolute inset-0 pointer-events-none max-w-[640px] mx-auto" style={{ aspectRatio: '4/3' }}>
            {/* Score */}
            <div className={`absolute top-2 right-3 text-right ${retroFont.className}`}>
              <span
                className="text-sm sm:text-base"
                style={{ color: '#ffffff', textShadow: '0 0 8px rgba(255,255,255,0.3)' }}
              >
                {Math.floor(score)}
              </span>
            </div>

            {/* Wave */}
            <div className="absolute top-2 left-3">
              <span
                className="text-[8px] tracking-[0.1em]"
                style={{ color: '#445566', fontFamily: 'monospace' }}
              >
                WAVE {currentWave + 1}/7
              </span>
            </div>

            {/* Combo */}
            {combo > 0 && (
              <div className={`absolute top-2 left-1/2 -translate-x-1/2 ${retroFont.className}`}>
                <span
                  className="text-xs sm:text-sm"
                  style={{
                    color: COLORS.combo[Math.min(multiplier - 1, COLORS.combo.length - 1)],
                    textShadow: `0 0 10px ${COLORS.combo[Math.min(multiplier - 1, COLORS.combo.length - 1)]}66`,
                  }}
                >
                  {multiplier}x
                </span>
              </div>
            )}

            {/* Rush timer */}
            {rushTimer > 0 && (
              <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 ${retroFont.className}`}>
                <span
                  className="text-lg"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 12px rgba(255,0,255,0.5)',
                    animation: rushTimer <= 5 ? 'cascadePulse 0.5s ease-in-out infinite' : 'none',
                  }}
                >
                  {rushTimer}
                </span>
              </div>
            )}

            {/* Dash cooldown indicator */}
            {activeMechanics.some(m => m.id === 'phase_dash') && gameStateRef.current && (
              <div className="absolute bottom-3 right-3">
                <span
                  className="text-[8px]"
                  style={{
                    color: gameStateRef.current.dashCD <= 0 ? '#00ff88' : '#445566',
                    fontFamily: 'monospace',
                  }}
                >
                  {gameStateRef.current.dashCD <= 0 ? 'DASH ●' : 'DASH ○'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Title screen */}
        {phase === 'title' && (
          <TitleScreen onStart={handleStart} retroFont={retroFont.className} />
        )}

        {/* Mutation screen */}
        {phase === 'mutating' && currentMutation && (
          <MutationScreen
            mutation={currentMutation}
            waveNumber={currentWave + 1}
            onContinue={handleMutationContinue}
            retroFont={retroFont.className}
          />
        )}

        {/* Finale screen */}
        {phase === 'finale' && (
          <FinaleScreen
            score={Math.floor(score)}
            maxCombo={gameStateRef.current?.maxCombo || 0}
            gameName={gameName}
            tagline={tagline}
            mutations={allMutations}
            totalTime={gameStateRef.current?.totalTime || 0}
            onPlayAgain={handlePlayAgain}
            retroFont={retroFont.className}
          />
        )}
      </div>

      {/* Accessibility description */}
      <div className="sr-only" role="status" aria-live="polite">
        {phase === 'playing' && `Playing wave ${currentWave + 1} of 7. Score: ${Math.floor(score)}.`}
        {phase === 'mutating' && currentMutation && `New mutation: ${currentMutation.title}. ${currentMutation.description}`}
        {phase === 'finale' && `Game complete. Your game: ${gameName}. Final score: ${Math.floor(score)}.`}
      </div>
    </div>
  )
}
