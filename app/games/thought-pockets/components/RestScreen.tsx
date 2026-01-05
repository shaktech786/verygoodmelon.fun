'use client'

/**
 * Thought Pockets - Rest Screen (Meditation)
 * Heal or upgrade a card
 */

import { useState } from 'react'
import { useGameStore } from '@/lib/games/thought-pockets/store/gameStore'
import { Card as CardType } from '@/types/thought-pockets'
import { Card as CardComponent } from './Card'
import { cn } from '@/lib/utils'

// =============================================================================
// REST SCREEN
// =============================================================================

export function RestScreen() {
  const gameState = useGameStore((state) => state.gameState)
  const heal = useGameStore((state) => state.heal)
  const upgradeCardInDeck = useGameStore((state) => state.upgradeCardInDeck)
  const setScreen = useGameStore((state) => state.setScreen)
  const completeNode = useGameStore((state) => state.completeNode)

  const [selectedAction, setSelectedAction] = useState<'rest' | 'upgrade' | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [actionComplete, setActionComplete] = useState(false)

  const healAmount = Math.floor(gameState.maxCoherence * 0.3)
  const upgradableCards = gameState.deck.filter((card) => !card.upgraded && card.upgradeEffect)

  const handleRest = () => {
    heal(healAmount)
    setActionComplete(true)
  }

  const handleUpgrade = () => {
    if (selectedCardId) {
      upgradeCardInDeck(selectedCardId)
      setActionComplete(true)
    }
  }

  const handleContinue = () => {
    completeNode()
    setScreen('map')
  }

  // Find the upgraded version of selected card for preview
  const selectedCard = selectedCardId
    ? gameState.deck.find((c) => c.id === selectedCardId)
    : null

  const upgradedPreview: CardType | null = selectedCard?.upgradeEffect
    ? {
        ...selectedCard,
        ...selectedCard.upgradeEffect,
        upgraded: true,
        name: `${selectedCard.name}+`,
      }
    : null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#2D2A26] text-[#F7F3EB] p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl mb-2">🏕️ Meditation Spot</h1>
          <p className="text-[#8A847A]">
            Take a moment to rest and reflect on your journey
          </p>
        </div>

        {!actionComplete ? (
          <>
            {/* Action Selection */}
            {!selectedAction && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rest Option */}
                <button
                  onClick={() => {
                    setSelectedAction('rest')
                    handleRest()
                  }}
                  className={cn(
                    'p-6 rounded-xl border-2 text-center transition-all',
                    'bg-[#1a1917] border-[#D4C9B5]/30 hover:border-emerald-500',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-400'
                  )}
                >
                  <span className="text-5xl block mb-4">💚</span>
                  <h2 className="font-serif text-xl mb-2">Rest</h2>
                  <p className="text-[#8A847A] text-sm mb-4">
                    Restore your mental clarity
                  </p>
                  <p className="text-emerald-400 font-mono">
                    Heal {healAmount} Coherence
                  </p>
                  <p className="text-xs text-[#5A5550] mt-2">
                    (Current: {gameState.coherence}/{gameState.maxCoherence})
                  </p>
                </button>

                {/* Upgrade Option */}
                <button
                  onClick={() => setSelectedAction('upgrade')}
                  disabled={upgradableCards.length === 0}
                  className={cn(
                    'p-6 rounded-xl border-2 text-center transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-amber-400',
                    upgradableCards.length > 0
                      ? 'bg-[#1a1917] border-[#D4C9B5]/30 hover:border-amber-500'
                      : 'bg-[#1a1917]/50 border-[#5A5550]/30 cursor-not-allowed'
                  )}
                >
                  <span className="text-5xl block mb-4">⬆️</span>
                  <h2 className="font-serif text-xl mb-2">Upgrade</h2>
                  <p className="text-[#8A847A] text-sm mb-4">
                    Enhance one of your cards
                  </p>
                  <p className={cn(
                    'font-mono',
                    upgradableCards.length > 0 ? 'text-amber-400' : 'text-[#5A5550]'
                  )}>
                    {upgradableCards.length > 0
                      ? `${upgradableCards.length} cards available`
                      : 'No upgradable cards'}
                  </p>
                </button>
              </div>
            )}

            {/* Upgrade Card Selection */}
            {selectedAction === 'upgrade' && !actionComplete && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl">Select a card to upgrade</h2>
                  <button
                    onClick={() => setSelectedAction(null)}
                    className="px-4 py-2 rounded-lg bg-[#5A5550] hover:bg-[#6A6560]
                             transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    Back
                  </button>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                  {upgradableCards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      className={cn(
                        'cursor-pointer transition-all',
                        selectedCardId === card.id && 'ring-2 ring-amber-400 scale-105'
                      )}
                    >
                      <CardComponent card={card} size="sm" isPlayable />
                    </div>
                  ))}
                </div>

                {/* Upgrade Preview */}
                {selectedCard && upgradedPreview && (
                  <div className="bg-[#1a1917] rounded-xl p-6 border border-[#D4C9B5]/20">
                    <h3 className="font-serif text-lg mb-4 text-center">Upgrade Preview</h3>
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <p className="text-sm text-[#8A847A] mb-2">Current</p>
                        <CardComponent card={selectedCard} size="md" />
                      </div>
                      <div className="text-4xl text-amber-400">→</div>
                      <div className="text-center">
                        <p className="text-sm text-amber-400 mb-2">Upgraded</p>
                        <CardComponent card={upgradedPreview} size="md" />
                      </div>
                    </div>
                    <button
                      onClick={handleUpgrade}
                      className="mt-6 w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg
                               font-serif font-bold transition-colors
                               focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      Confirm Upgrade
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Action Complete */
          <div className="text-center">
            <div className="bg-[#1a1917] rounded-xl p-8 border border-[#D4C9B5]/20 mb-6">
              {selectedAction === 'rest' ? (
                <>
                  <span className="text-6xl block mb-4">💚</span>
                  <h2 className="font-serif text-2xl text-emerald-400 mb-2">
                    Mind Restored
                  </h2>
                  <p className="text-[#D4C9B5]">
                    You healed {healAmount} Coherence.
                  </p>
                  <p className="text-[#8A847A] text-sm mt-2">
                    Coherence: {gameState.coherence}/{gameState.maxCoherence}
                  </p>
                </>
              ) : (
                <>
                  <span className="text-6xl block mb-4">⬆️</span>
                  <h2 className="font-serif text-2xl text-amber-400 mb-2">
                    Card Upgraded!
                  </h2>
                  {upgradedPreview && (
                    <div className="flex justify-center mt-4">
                      <CardComponent card={upgradedPreview} size="md" />
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={handleContinue}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg
                       font-serif font-bold text-lg transition-colors
                       focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Continue Journey
            </button>
          </div>
        )}

        {/* Current Stats */}
        <div className="mt-8 text-center text-sm text-[#5A5550]">
          <p>Floor {gameState.currentFloor} | Deck: {gameState.deck.length} cards | Gold: {gameState.gold}</p>
        </div>
      </div>
    </div>
  )
}
