'use client'

/**
 * Mind Architect - Reward Screen
 * Post-battle rewards: gold, cards, relics
 */

import { useState, useMemo } from 'react'
import { useGameStore } from '@/lib/games/mind-architect/store/gameStore'
import { useBattleStore } from '@/lib/games/mind-architect/store/battleStore'
import { Card as CardType, Relic } from '@/types/mind-architect'
import { Card as CardComponent } from './Card'
import { cn } from '@/lib/utils'
import { getCardRewards, getGoldReward } from '@/lib/games/mind-architect/data/shop'
import { COMMON_RELICS, UNCOMMON_RELICS, RARE_RELICS, BOSS_RELICS } from '@/lib/games/mind-architect/data/relics'

// =============================================================================
// REWARD SCREEN
// =============================================================================

interface RewardScreenProps {
  isTreasure?: boolean
  isElite?: boolean
  isBoss?: boolean
}

export function RewardScreen({ isTreasure = false, isElite = false, isBoss = false }: RewardScreenProps) {
  const gameState = useGameStore((state) => state.gameState)
  const addCardToDeck = useGameStore((state) => state.addCardToDeck)
  const addGold = useGameStore((state) => state.addGold)
  const addRelic = useGameStore((state) => state.addRelic)
  const hasRelic = useGameStore((state) => state.hasRelic)
  const setScreen = useGameStore((state) => state.setScreen)
  const completeNode = useGameStore((state) => state.completeNode)
  const advanceFloor = useGameStore((state) => state.advanceFloor)

  const [goldCollected, setGoldCollected] = useState(false)
  const [cardSelected, setCardSelected] = useState<string | null>(null)
  const [relicCollected, setRelicCollected] = useState(false)
  const [selectedCardForPreview, setSelectedCardForPreview] = useState<CardType | null>(null)

  // Generate rewards
  const goldReward = useMemo(
    () => isTreasure ? 0 : getGoldReward(gameState.currentFloor, isElite, isBoss),
    [gameState.currentFloor, isElite, isBoss, isTreasure]
  )

  const cardRewards = useMemo(
    () => isTreasure ? [] : getCardRewards(gameState.currentFloor, gameState.seed, isElite, isBoss),
    [gameState.currentFloor, gameState.seed, isElite, isBoss, isTreasure]
  )

  const relicReward = useMemo(() => {
    if (!isTreasure && !isElite && !isBoss) return null

    // Select appropriate relic pool
    let pool: Relic[]
    if (isBoss) {
      pool = BOSS_RELICS.filter((r) => !hasRelic(r.id))
    } else if (isElite || isTreasure) {
      pool = [...UNCOMMON_RELICS, ...COMMON_RELICS].filter((r) => !hasRelic(r.id))
    } else {
      pool = COMMON_RELICS.filter((r) => !hasRelic(r.id))
    }

    if (pool.length === 0) return null

    // Seeded random selection
    const seed = gameState.seed + gameState.currentFloor * 500
    const index = Math.abs(seed % pool.length)
    return pool[index]
  }, [gameState.seed, gameState.currentFloor, isTreasure, isElite, isBoss, hasRelic])

  // Handlers
  const handleCollectGold = () => {
    addGold(goldReward)
    setGoldCollected(true)
  }

  const handleSelectCard = (card: CardType) => {
    addCardToDeck(card)
    setCardSelected(card.id)
    setSelectedCardForPreview(null)
  }

  const handleSkipCard = () => {
    setCardSelected('skipped')
  }

  const handleCollectRelic = () => {
    if (relicReward) {
      addRelic(relicReward)
      setRelicCollected(true)
    }
  }

  const handleContinue = () => {
    completeNode()
    if (isBoss) {
      // Check if this was the final boss
      if (gameState.currentFloor >= 3) {
        setScreen('victory')
      } else {
        advanceFloor()
      }
    } else {
      setScreen('map')
    }
  }

  // Check if all rewards collected
  const allCollected =
    (goldReward === 0 || goldCollected) &&
    (cardRewards.length === 0 || cardSelected !== null) &&
    (!relicReward || relicCollected)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#2D2A26] text-[#F7F3EB] p-6">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl mb-2">
            {isTreasure ? '💎 Treasure Found!' : isBoss ? '👑 Boss Defeated!' : '⚔️ Victory!'}
          </h1>
          <p className="text-[#8A847A]">
            {isTreasure
              ? 'You discovered a cache of philosophical insight'
              : isBoss
              ? 'You have overcome a great philosophical challenge'
              : 'The cognitive bias has been dismantled'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Gold Reward */}
          {goldReward > 0 && (
            <div className={cn(
              'p-4 rounded-xl border-2 transition-all',
              goldCollected
                ? 'border-[#5A5550]/50 bg-[#1a1917]/50'
                : 'border-amber-600/50 bg-[#1a1917] hover:border-amber-500'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">💰</span>
                  <div>
                    <h2 className="font-serif text-xl">Gold</h2>
                    <p className="text-amber-400 font-mono text-lg">{goldReward}g</p>
                  </div>
                </div>
                {!goldCollected ? (
                  <button
                    onClick={handleCollectGold}
                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-serif font-bold
                             transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    Collect
                  </button>
                ) : (
                  <span className="text-emerald-400 font-serif">Collected ✓</span>
                )}
              </div>
            </div>
          )}

          {/* Relic Reward */}
          {relicReward && (
            <div className={cn(
              'p-4 rounded-xl border-2 transition-all',
              relicCollected
                ? 'border-[#5A5550]/50 bg-[#1a1917]/50'
                : 'border-purple-600/50 bg-[#1a1917] hover:border-purple-500'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{relicReward.icon}</span>
                  <div>
                    <h2 className="font-serif text-xl">{relicReward.name}</h2>
                    <p className="text-[#8A847A] text-sm">{relicReward.description}</p>
                  </div>
                </div>
                {!relicCollected ? (
                  <button
                    onClick={handleCollectRelic}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-serif font-bold
                             transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    Take Relic
                  </button>
                ) : (
                  <span className="text-emerald-400 font-serif">Collected ✓</span>
                )}
              </div>
            </div>
          )}

          {/* Card Rewards */}
          {cardRewards.length > 0 && (
            <div className={cn(
              'p-4 rounded-xl border-2 transition-all',
              cardSelected
                ? 'border-[#5A5550]/50 bg-[#1a1917]/50'
                : 'border-emerald-600/50 bg-[#1a1917]'
            )}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl">Choose a Card</h2>
                {!cardSelected && (
                  <button
                    onClick={handleSkipCard}
                    className="px-4 py-1 text-sm text-[#8A847A] hover:text-[#D4C9B5]
                             transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
                  >
                    Skip
                  </button>
                )}
              </div>

              {!cardSelected ? (
                <div className="flex flex-wrap justify-center gap-4">
                  {cardRewards.map((card) => (
                    <div
                      key={card.id}
                      className="relative"
                      onMouseEnter={() => setSelectedCardForPreview(card)}
                      onMouseLeave={() => setSelectedCardForPreview(null)}
                    >
                      <CardComponent
                        card={card}
                        onClick={() => handleSelectCard(card)}
                        isPlayable
                        size="md"
                      />
                    </div>
                  ))}
                </div>
              ) : cardSelected === 'skipped' ? (
                <p className="text-center text-[#8A847A]">Skipped card reward</p>
              ) : (
                <div className="flex justify-center">
                  <div className="text-center">
                    <p className="text-emerald-400 mb-2">Added to deck ✓</p>
                    <CardComponent
                      card={cardRewards.find((c) => c.id === cardSelected)!}
                      size="md"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card Preview Tooltip */}
          {selectedCardForPreview && (
            <div className="fixed bottom-4 right-4 bg-[#1a1917] p-4 rounded-xl border border-[#D4C9B5]/30 max-w-xs">
              <h3 className="font-serif font-bold">{selectedCardForPreview.name}</h3>
              <p className="text-sm text-[#8A847A] capitalize">{selectedCardForPreview.type} • Cost: {selectedCardForPreview.cost}</p>
              <p className="text-sm mt-2">{selectedCardForPreview.description}</p>
              {selectedCardForPreview.flavorText && (
                <p className="text-xs text-[#5A5550] italic mt-2">{selectedCardForPreview.flavorText}</p>
              )}
            </div>
          )}

          {/* Continue Button */}
          <div className="text-center pt-4">
            <button
              onClick={handleContinue}
              disabled={!allCollected}
              className={cn(
                'px-8 py-3 rounded-lg font-serif font-bold text-lg transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-amber-400',
                allCollected
                  ? 'bg-amber-600 hover:bg-amber-500 text-[#2D2A26]'
                  : 'bg-[#5A5550] text-[#8A847A] cursor-not-allowed'
              )}
            >
              {isBoss && gameState.currentFloor < 3
                ? 'Ascend to Next Floor'
                : isBoss && gameState.currentFloor >= 3
                ? 'Complete Journey'
                : 'Continue'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 text-center text-sm text-[#5A5550]">
          <p>
            Coherence: {gameState.coherence}/{gameState.maxCoherence} |
            Gold: {gameState.gold} |
            Deck: {gameState.deck.length} cards
          </p>
        </div>
      </div>
    </div>
  )
}
