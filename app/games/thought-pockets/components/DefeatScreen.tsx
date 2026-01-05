'use client'

/**
 * Thought Pockets - Defeat Screen
 * Displayed when coherence reaches 0
 */

import { useRouter } from 'next/navigation'
import { useGameStore } from '@/lib/games/thought-pockets/store/gameStore'

// =============================================================================
// DEFEAT SCREEN
// =============================================================================

export function DefeatScreen() {
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

  // Defeat quotes based on floor
  const defeatQuotes: Record<number, { quote: string; author: string }> = {
    1: {
      quote: 'To admit one\'s ignorance is the beginning of wisdom.',
      author: 'Socrates',
    },
    2: {
      quote: 'We learn from failure, not from success.',
      author: 'Bram Stoker',
    },
    3: {
      quote: 'The only true wisdom is in knowing you know nothing.',
      author: 'Socrates',
    },
  }

  const currentQuote = defeatQuotes[gameState.currentFloor] || defeatQuotes[1]

  return (
    <div className="min-h-screen bg-[#2D2A26] text-[#F7F3EB] flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Defeat Banner */}
        <div className="mb-8">
          <div className="text-8xl mb-4 opacity-50">💭</div>
          <h1 className="font-serif text-5xl mb-4 text-red-400">
            Coherence Lost
          </h1>
          <p className="text-xl text-[#D4C9B5]">
            Your argument has fallen apart
          </p>
        </div>

        {/* Defeat Message */}
        <div className="bg-[#1a1917] rounded-xl p-8 mb-8 border border-red-900/30">
          <p className="text-lg text-[#D4C9B5] leading-relaxed mb-4">
            The cognitive biases proved too powerful this time. Your logical
            framework crumbled under the weight of irrationality. But remember:
            every philosopher has faced defeat before achieving clarity.
          </p>
          <p className="text-lg text-amber-400 italic font-serif">
            "{currentQuote.quote}"
          </p>
          <p className="text-sm text-[#8A847A] mt-2">- {currentQuote.author}</p>
        </div>

        {/* Run Statistics */}
        <div className="bg-[#1a1917] rounded-xl p-6 mb-8 border border-[#D4C9B5]/20">
          <h2 className="font-serif text-xl mb-4">Run Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatBox label="School" value={capitalize(gameState.school)} />
            <StatBox label="Floor Reached" value={gameState.currentFloor.toString()} />
            <StatBox label="Enemies Defeated" value={gameState.enemiesDefeated.toString()} />
            <StatBox label="Final Deck" value={`${gameState.deck.length} cards`} />
            <StatBox label="Relics" value={gameState.relics.length.toString()} />
            <StatBox label="Gold" value={`${gameState.gold}g`} />
          </div>
        </div>

        {/* What Went Wrong */}
        <div className="bg-[#1a1917] rounded-xl p-6 mb-8 border border-[#D4C9B5]/20">
          <h2 className="font-serif text-xl mb-3">Reflections</h2>
          <ul className="text-left text-[#8A847A] space-y-2 max-w-md mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>Consider building more Evidence cards for consistent damage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>Rest sites are valuable - don't skip healing opportunities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>Watch for enemy intents and plan your chains accordingly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>Avoid contradictions - they hurt your Coherence!</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleNewGame}
            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 rounded-xl font-serif font-bold text-lg
                     text-[#2D2A26] transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Try Again
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
      <p className="font-mono text-lg">{value}</p>
    </div>
  )
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
