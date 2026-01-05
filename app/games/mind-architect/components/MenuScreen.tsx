'use client'

/**
 * Mind Architect - Menu Screen
 * Game start and school selection
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGameStore } from '@/lib/games/mind-architect/store/gameStore'
import { School } from '@/types/mind-architect'
import { cn } from '@/lib/utils'

// =============================================================================
// SCHOOL DATA
// =============================================================================

const SCHOOLS: {
  id: School
  name: string
  icon: string
  description: string
  playstyle: string
  starterRelic: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}[] = [
  {
    id: 'rationalist',
    name: 'Rationalist',
    icon: '🧮',
    description: 'Trust in pure reason and a priori knowledge.',
    playstyle: 'Logic-focused. High multipliers, complex chains.',
    starterRelic: 'Cogito Ergo Sum: Start with +1 TP',
    difficulty: 'Medium',
  },
  {
    id: 'empiricist',
    name: 'Empiricist',
    icon: '🔬',
    description: 'Knowledge comes from sensory experience.',
    playstyle: 'Evidence-focused. Strong base weight, reliable.',
    starterRelic: 'Tabula Rasa: Draw 1 extra card turn 1',
    difficulty: 'Easy',
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    icon: '🔧',
    description: 'Truth is what works in practice.',
    playstyle: 'Balanced and flexible. Adapts to situations.',
    starterRelic: 'Utility Principle: +5 gold after each battle',
    difficulty: 'Easy',
  },
  {
    id: 'skeptic',
    name: 'Skeptic',
    icon: '❓',
    description: 'Question everything, assume nothing.',
    playstyle: 'Control-focused. Weakens enemies, disrupts.',
    starterRelic: 'Pyrrhonian Doubt: Enemies deal -1 damage',
    difficulty: 'Medium',
  },
  {
    id: 'absurdist',
    name: 'Absurdist',
    icon: '🎭',
    description: 'Embrace the meaningless with defiance.',
    playstyle: 'High risk, high reward. Chaos and randomness.',
    starterRelic: 'Sisyphean Boulder: Random card costs 0 each turn',
    difficulty: 'Hard',
  },
]

// =============================================================================
// MENU SCREEN
// =============================================================================

export function MenuScreen() {
  const router = useRouter()
  const startNewRun = useGameStore((state) => state.startNewRun)
  const isRunActive = useGameStore((state) => state.isRunActive)
  const setScreen = useGameStore((state) => state.setScreen)
  const abandonRun = useGameStore((state) => state.abandonRun)
  const gameState = useGameStore((state) => state.gameState)

  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [showSchoolSelect, setShowSchoolSelect] = useState(false)
  const [showConfirmAbandon, setShowConfirmAbandon] = useState(false)

  const handleStartGame = () => {
    if (selectedSchool) {
      startNewRun(selectedSchool)
    }
  }

  const handleContinue = () => {
    setScreen('map')
  }

  const handleAbandon = () => {
    abandonRun()
    setShowConfirmAbandon(false)
  }

  return (
    <div className="min-h-screen bg-[#2D2A26] text-[#F7F3EB] flex flex-col">
      {/* Header */}
      <header className="p-4">
        <button
          onClick={() => router.push('/games')}
          className="text-[#8A847A] hover:text-[#D4C9B5] transition-colors"
        >
          ← Back to Games
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl md:text-6xl mb-4">
            Mind Architect
          </h1>
          <p className="text-[#8A847A] text-lg max-w-md mx-auto">
            Construct arguments. Defeat cognitive biases.
            <br />
            Discover philosophical truth.
          </p>
        </div>

        {/* School Selection */}
        {showSchoolSelect && !isRunActive() ? (
          <div className="w-full max-w-4xl">
            <h2 className="font-serif text-2xl text-center mb-6">
              Choose Your Philosophical School
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {SCHOOLS.map((school) => (
                <button
                  key={school.id}
                  onClick={() => setSelectedSchool(school.id)}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-amber-400',
                    selectedSchool === school.id
                      ? 'border-amber-500 bg-amber-900/30'
                      : 'border-[#D4C9B5]/30 bg-[#1a1917] hover:border-[#D4C9B5]/60'
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{school.icon}</span>
                    <div>
                      <h3 className="font-serif font-bold">{school.name}</h3>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        school.difficulty === 'Easy' && 'bg-emerald-900/50 text-emerald-400',
                        school.difficulty === 'Medium' && 'bg-amber-900/50 text-amber-400',
                        school.difficulty === 'Hard' && 'bg-red-900/50 text-red-400'
                      )}>
                        {school.difficulty}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-[#D4C9B5] mb-2">{school.description}</p>
                  <p className="text-xs text-[#8A847A] mb-1">{school.playstyle}</p>
                  <p className="text-xs text-amber-400/80 italic">{school.starterRelic}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowSchoolSelect(false)}
                className="px-6 py-3 rounded-lg border-2 border-[#D4C9B5]/50 font-serif
                         hover:bg-[#D4C9B5]/10 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Back
              </button>
              <button
                onClick={handleStartGame}
                disabled={!selectedSchool}
                className={cn(
                  'px-8 py-3 rounded-lg font-serif font-bold text-lg transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-amber-400',
                  selectedSchool
                    ? 'bg-amber-600 hover:bg-amber-500 text-[#2D2A26]'
                    : 'bg-[#5A5550] text-[#8A847A] cursor-not-allowed'
                )}
              >
                Begin Journey
              </button>
            </div>
          </div>
        ) : (
          /* Main Menu Buttons */
          <div className="flex flex-col gap-4 items-center">
            {isRunActive() && (
              <>
                <button
                  onClick={handleContinue}
                  className="px-8 py-4 bg-emerald-700 hover:bg-emerald-600 rounded-xl font-serif font-bold text-xl
                           min-w-[280px] transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  Continue Run
                </button>
                <p className="text-sm text-[#8A847A]">
                  Floor {gameState.currentFloor} • {gameState.school} •
                  HP: {gameState.coherence}/{gameState.maxCoherence}
                </p>
              </>
            )}

            <button
              onClick={() => {
                if (isRunActive()) {
                  setShowConfirmAbandon(true)
                } else {
                  setShowSchoolSelect(true)
                }
              }}
              className={cn(
                'px-8 py-4 rounded-xl font-serif font-bold text-xl min-w-[280px] transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-amber-400',
                isRunActive()
                  ? 'bg-[#5A5550] hover:bg-[#6A6560]'
                  : 'bg-amber-600 hover:bg-amber-500 text-[#2D2A26]'
              )}
            >
              {isRunActive() ? 'New Game' : 'Start New Run'}
            </button>

            <button
              onClick={() => router.push('/games')}
              className="px-8 py-4 rounded-xl border-2 border-[#D4C9B5]/30 font-serif text-lg
                       hover:bg-[#D4C9B5]/10 min-w-[280px] transition-colors
                       focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Back to Games
            </button>
          </div>
        )}

        {/* Confirm Abandon Dialog */}
        {showConfirmAbandon && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2D2A26] border-2 border-red-800 rounded-xl p-6 max-w-md">
              <h2 className="font-serif text-2xl text-red-400 mb-4">Abandon Run?</h2>
              <p className="text-[#D4C9B5] mb-6">
                Your current progress will be lost. Are you sure you want to start a new game?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowConfirmAbandon(false)}
                  className="px-4 py-2 rounded-lg border-2 border-[#D4C9B5]/50 font-serif
                           hover:bg-[#D4C9B5]/10 transition-colors
                           focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleAbandon()
                    setShowSchoolSelect(true)
                  }}
                  className="px-4 py-2 rounded-lg bg-red-800 hover:bg-red-700 font-serif font-bold
                           transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  Abandon Run
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[#5A5550] text-sm">
        <p>A roguelike deckbuilder about epistemology</p>
      </footer>
    </div>
  )
}
