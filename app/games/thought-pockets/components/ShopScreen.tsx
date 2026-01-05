'use client'

/**
 * Thought Pockets - Shop Screen (Library)
 * Buy cards, relics, and services
 */

import { useState, useMemo } from 'react'
import { useGameStore } from '@/lib/games/thought-pockets/store/gameStore'
import { Card, Relic } from '@/types/thought-pockets'
import { Card as CardComponent } from './Card'
import { cn } from '@/lib/utils'
import { getShopCards, getShopRelics } from '@/lib/games/thought-pockets/data/shop'

// =============================================================================
// SHOP SCREEN
// =============================================================================

export function ShopScreen() {
  const gameState = useGameStore((state) => state.gameState)
  const addCardToDeck = useGameStore((state) => state.addCardToDeck)
  const addRelic = useGameStore((state) => state.addRelic)
  const spendGold = useGameStore((state) => state.spendGold)
  const heal = useGameStore((state) => state.heal)
  const removeCardFromDeck = useGameStore((state) => state.removeCardFromDeck)
  const setScreen = useGameStore((state) => state.setScreen)
  const completeNode = useGameStore((state) => state.completeNode)
  const hasRelic = useGameStore((state) => state.hasRelic)

  const [selectedTab, setSelectedTab] = useState<'cards' | 'relics' | 'services'>('cards')
  const [purchasedCards, setPurchasedCards] = useState<Set<string>>(new Set())
  const [purchasedRelics, setPurchasedRelics] = useState<Set<string>>(new Set())
  const [removingCard, setRemovingCard] = useState(false)
  const [selectedCardToRemove, setSelectedCardToRemove] = useState<string | null>(null)

  // Generate shop inventory based on floor and seed
  const shopInventory = useMemo(() => {
    return getShopCards(gameState.currentFloor, gameState.seed)
  }, [gameState.currentFloor, gameState.seed])

  const shopRelics = useMemo(() => {
    const relics = getShopRelics(gameState.currentFloor, gameState.seed)
    // Filter out relics player already has
    return relics.filter((r) => !hasRelic(r.id))
  }, [gameState.currentFloor, gameState.seed, hasRelic])

  // Prices
  const cardPrices = useMemo(() => {
    const prices: Record<string, number> = {}
    shopInventory.forEach((card) => {
      const basePrice = card.rarity === 'common' ? 50 : card.rarity === 'uncommon' ? 75 : 150
      prices[card.id] = basePrice
    })
    return prices
  }, [shopInventory])

  const relicPrices = useMemo(() => {
    const prices: Record<string, number> = {}
    shopRelics.forEach((relic) => {
      const basePrice = relic.rarity === 'common' ? 150 : relic.rarity === 'uncommon' ? 200 : 300
      prices[relic.id] = basePrice
    })
    return prices
  }, [shopRelics])

  const healCost = 30
  const removeCost = 75

  // Handlers
  const handleBuyCard = (card: Card) => {
    const price = cardPrices[card.id]
    if (gameState.gold >= price && !purchasedCards.has(card.id)) {
      if (spendGold(price)) {
        addCardToDeck(card)
        setPurchasedCards((prev) => new Set([...prev, card.id]))
      }
    }
  }

  const handleBuyRelic = (relic: Relic) => {
    const price = relicPrices[relic.id]
    if (gameState.gold >= price && !purchasedRelics.has(relic.id)) {
      if (spendGold(price)) {
        addRelic(relic)
        setPurchasedRelics((prev) => new Set([...prev, relic.id]))
      }
    }
  }

  const handleHeal = () => {
    if (gameState.gold >= healCost) {
      if (spendGold(healCost)) {
        heal(10)
      }
    }
  }

  const handleRemoveCard = () => {
    if (selectedCardToRemove && gameState.gold >= removeCost) {
      if (spendGold(removeCost)) {
        removeCardFromDeck(selectedCardToRemove)
        setRemovingCard(false)
        setSelectedCardToRemove(null)
      }
    }
  }

  const handleLeave = () => {
    completeNode()
    setScreen('map')
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#2D2A26] text-[#F7F3EB]">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-[#1a1917] border-b border-[#D4C9B5]/20">
        <div>
          <h1 className="font-serif text-2xl">📚 The Library</h1>
          <p className="text-sm text-[#8A847A]">
            Acquire new knowledge and refine your arguments
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[#8A847A]">Gold:</span>
            <span className="font-mono text-2xl text-amber-400">
              {gameState.gold}
            </span>
          </div>
          <button
            onClick={handleLeave}
            className="px-6 py-2 bg-[#5A5550] hover:bg-[#6A6560] rounded-lg font-serif
                     transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Leave Shop
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex border-b border-[#D4C9B5]/20 bg-[#1a1917]">
        {(['cards', 'relics', 'services'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={cn(
              'px-6 py-3 font-serif capitalize transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-400',
              selectedTab === tab
                ? 'bg-[#2D2A26] text-amber-400 border-b-2 border-amber-400'
                : 'text-[#8A847A] hover:text-[#D4C9B5]'
            )}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {selectedTab === 'cards' && (
          <div>
            <h2 className="font-serif text-xl mb-4">Cards for Sale</h2>
            {shopInventory.length === 0 ? (
              <p className="text-[#8A847A]">No cards available</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {shopInventory.map((card) => {
                  const price = cardPrices[card.id]
                  const canAfford = gameState.gold >= price
                  const isPurchased = purchasedCards.has(card.id)

                  return (
                    <div key={card.id} className="flex flex-col items-center gap-2">
                      <CardComponent
                        card={card}
                        isPlayable={canAfford && !isPurchased}
                        onClick={() => handleBuyCard(card)}
                        size="md"
                        className={isPurchased ? 'opacity-30' : ''}
                      />
                      <div className={cn(
                        'flex items-center gap-1 font-mono',
                        canAfford && !isPurchased ? 'text-amber-400' : 'text-[#5A5550]'
                      )}>
                        <span>{isPurchased ? 'SOLD' : `${price}g`}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'relics' && (
          <div>
            <h2 className="font-serif text-xl mb-4">Relics for Sale</h2>
            {shopRelics.length === 0 ? (
              <p className="text-[#8A847A]">No relics available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shopRelics.map((relic) => {
                  const price = relicPrices[relic.id]
                  const canAfford = gameState.gold >= price
                  const isPurchased = purchasedRelics.has(relic.id)

                  return (
                    <button
                      key={relic.id}
                      onClick={() => handleBuyRelic(relic)}
                      disabled={!canAfford || isPurchased}
                      className={cn(
                        'flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-amber-400',
                        canAfford && !isPurchased
                          ? 'border-[#D4C9B5]/50 bg-[#1a1917] hover:border-amber-400 cursor-pointer'
                          : 'border-[#5A5550]/50 bg-[#1a1917]/50 cursor-not-allowed',
                        isPurchased && 'opacity-30'
                      )}
                    >
                      <span className="text-4xl">{relic.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-serif font-bold">{relic.name}</h3>
                        <p className="text-sm text-[#8A847A]">{relic.description}</p>
                        <p className={cn(
                          'font-mono mt-2',
                          canAfford ? 'text-amber-400' : 'text-[#5A5550]'
                        )}>
                          {isPurchased ? 'SOLD' : `${price}g`}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'services' && (
          <div className="space-y-6">
            <h2 className="font-serif text-xl mb-4">Services</h2>

            {/* Heal */}
            <div className="flex items-center justify-between p-4 rounded-lg border-2 border-[#D4C9B5]/30 bg-[#1a1917]">
              <div className="flex items-center gap-4">
                <span className="text-4xl">💚</span>
                <div>
                  <h3 className="font-serif font-bold">Meditation Session</h3>
                  <p className="text-sm text-[#8A847A]">
                    Restore 10 Coherence (Current: {gameState.coherence}/{gameState.maxCoherence})
                  </p>
                </div>
              </div>
              <button
                onClick={handleHeal}
                disabled={gameState.gold < healCost || gameState.coherence >= gameState.maxCoherence}
                className={cn(
                  'px-6 py-2 rounded-lg font-serif font-bold transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-amber-400',
                  gameState.gold >= healCost && gameState.coherence < gameState.maxCoherence
                    ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                    : 'bg-[#5A5550] text-[#8A847A] cursor-not-allowed'
                )}
              >
                {healCost}g
              </button>
            </div>

            {/* Remove Card */}
            <div className="p-4 rounded-lg border-2 border-[#D4C9B5]/30 bg-[#1a1917]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🗑️</span>
                  <div>
                    <h3 className="font-serif font-bold">Purge a Card</h3>
                    <p className="text-sm text-[#8A847A]">
                      Remove one card from your deck permanently
                    </p>
                  </div>
                </div>
                {!removingCard ? (
                  <button
                    onClick={() => setRemovingCard(true)}
                    disabled={gameState.gold < removeCost || gameState.deck.length <= 5}
                    className={cn(
                      'px-6 py-2 rounded-lg font-serif font-bold transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-amber-400',
                      gameState.gold >= removeCost && gameState.deck.length > 5
                        ? 'bg-red-800 hover:bg-red-700 text-white'
                        : 'bg-[#5A5550] text-[#8A847A] cursor-not-allowed'
                    )}
                  >
                    {removeCost}g
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setRemovingCard(false)
                      setSelectedCardToRemove(null)
                    }}
                    className="px-6 py-2 rounded-lg font-serif bg-[#5A5550] hover:bg-[#6A6560]
                             transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {removingCard && (
                <div>
                  <p className="text-sm text-amber-400 mb-4">
                    Select a card to remove:
                  </p>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                    {gameState.deck.map((card, index) => (
                      <div
                        key={`${card.id}-${index}`}
                        className={cn(
                          'cursor-pointer transition-all',
                          selectedCardToRemove === card.id && 'ring-2 ring-red-500 scale-105'
                        )}
                        onClick={() => setSelectedCardToRemove(card.id)}
                      >
                        <CardComponent card={card} size="sm" />
                      </div>
                    ))}
                  </div>
                  {selectedCardToRemove && (
                    <button
                      onClick={handleRemoveCard}
                      className="mt-4 px-6 py-2 bg-red-700 hover:bg-red-600 rounded-lg font-serif font-bold
                               transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      Confirm Removal
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
