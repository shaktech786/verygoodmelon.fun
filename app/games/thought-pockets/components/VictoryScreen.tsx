'use client'

/**
 * Thought Pockets - Victory Screen
 * Displayed after defeating all 3 bosses
 */

import { useRouter } from 'next/navigation'
import { useGameStore } from '@/lib/games/thought-pockets/store/gameStore'
import { cn } from '@/lib/utils'

// =============================================================================
// VICTORY SCREEN
// =============================================================================

export function VictoryScreen() {
  const router = useRouter()
  const gameState = useGameStore((state) => state.gameState)
  const abandonRun = useGameStore((state) => state.abandonRun)

  const handleNewGame = () => {
    abandonRun()
  }

  const handleBackToGames = () => {
    abandonRun()
    router.push('/games')
  }

  // Calculate run stats
  const turnsTaken = gameState.turnCount
  const totalCards = gameState.deck.length
  const relicsCollected = gameState.relics.length

  return (
    <div className="min-h-screen bg-[#2D2A26] text-[#F7F3EB] flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Victory Banner */}
        <div className="mb-8">
          <div className="text-8xl mb-4 animate-bounce">✨</div>
          <h1 className="font-serif text-5xl mb-4 text-amber-400">
            Philosophical Mastery
          </h1>
          <p className="text-xl text-[#D4C9B5]">
            You have conquered the three great philosophical challenges
          </p>
        </div>

        {/* Victory Message */}
        <div className="bg-[#1a1917] rounded-xl p-8 mb-8 border border-amber-600/30">
          <p className="text-lg text-[#D4C9B5] leading-relaxed">
            Through rigorous reasoning and careful analysis, you have dismantled
            the cognitive biases that cloud human judgment. You confronted the
            Problem of Induction, navigated the Trolley Problem, and found your
            answer to the Meaning of Life.
          </p>
          <p className="text-lg text-amber-400 mt-4 italic font-serif">
            "The unexamined life is not worth living." - Socrates
          </p>
        </div>

        {/* Run Statistics */}
        <div className="bg-[#1a1917] rounded-xl p-6 mb-8 border border-[#D4C9B5]/20">
          <h2 className="font-serif text-xl mb-4">Run Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox label="School" value={capitalize(gameState.school)} />
            <StatBox label="Enemies Defeated" value={gameState.enemiesDefeated.toString()} />
            <StatBox label="Final Deck" value={`${totalCards} cards`} />
            <StatBox label="Relics" value={relicsCollected.toString()} />
            <StatBox label="Final Coherence" value={`${gameState.coherence}/${gameState.maxCoherence}`} />
            <StatBox label="Gold Collected" value={`${gameState.gold}g`} />
            <StatBox label="Bosses Defeated" value={`${gameState.bossesDefeated}/3`} />
            <StatBox label="Turns Taken" value={turnsTaken.toString()} />
          </div>
        </div>

        {/* Relics Collected */}
        {gameState.relics.length > 0 && (
          <div className="bg-[#1a1917] rounded-xl p-6 mb-8 border border-[#D4C9B5]/20">
            <h2 className="font-serif text-xl mb-4">Relics Collected</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {gameState.relics.map((relic) => (
                <div
                  key={relic.id}
                  className="flex items-center gap-2 px-3 py-2 bg-[#2D2A26] rounded-lg"
                  title={relic.description}
                >
                  <span className="text-2xl">{relic.icon}</span>
                  <span className="text-sm">{relic.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleNewGame}
            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 rounded-xl font-serif font-bold text-lg
                     text-[#2D2A26] transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Start New Run
          </button>
          <button
            onClick={handleBackToGames}
            className="px-8 py-4 rounded-xl border-2 border-[#D4C9B5]/50 font-serif text-lg
                     hover:bg-[#D4C9B5]/10 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Back to Games
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// STAT BOX
// =============================================================================

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[#8A847A] text-sm">{label}</p>
      <p className="font-mono text-lg text-amber-400">{value}</p>
    </div>
  )
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
