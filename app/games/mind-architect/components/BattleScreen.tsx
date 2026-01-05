'use client'

/**
 * Mind Architect - Battle Screen
 * Main combat interface
 */

import { useState, useEffect } from 'react'
import { useBattleStore } from '@/lib/games/mind-architect/store/battleStore'
import { useGameStore } from '@/lib/games/mind-architect/store/gameStore'
import { Card, CardHand } from './Card'
import { cn } from '@/lib/utils'
import { Enemy, Boss, Card as CardType } from '@/types/mind-architect'

// =============================================================================
// BATTLE SCREEN
// =============================================================================

export function BattleScreen() {
  const battleState = useBattleStore((state) => state.battleState)
  const gameState = useGameStore((state) => state.gameState)
  const playCard = useBattleStore((state) => state.playCard)
  const endTurn = useBattleStore((state) => state.endTurn)
  const undoLastAction = useBattleStore((state) => state.undoLastAction)
  const canPlayCard = useBattleStore((state) => state.canPlayCard)
  const startBattle = useBattleStore((state) => state.startBattle)
  const getCurrentNode = useGameStore((state) => state.getCurrentNode)

  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [showDamageNumber, setShowDamageNumber] = useState(false)
  const [lastDamage, setLastDamage] = useState(0)

  // Initialize battle when screen loads
  useEffect(() => {
    if (!battleState.enemy) {
      const currentNode = getCurrentNode()
      if (currentNode) {
        const isElite = currentNode.type === 'elite'
        const isBoss = currentNode.type === 'boss'
        const enemyId = currentNode.enemyId || ''
        startBattle(enemyId, gameState.currentFloor, isElite, isBoss)
      }
    }
  }, [battleState.enemy, getCurrentNode, startBattle, gameState.currentFloor])

  // Handle card selection
  const handleCardClick = (index: number) => {
    const card = battleState.hand[index]
    if (!canPlayCard(card)) return

    if (selectedCardIndex === index) {
      // Double click to play
      playCard(index)
      setSelectedCardIndex(null)
    } else {
      setSelectedCardIndex(index)
    }
  }

  // Handle end turn
  const handleEndTurn = () => {
    if (battleState.currentDamage) {
      setLastDamage(battleState.currentDamage.finalDamage)
      setShowDamageNumber(true)
      setTimeout(() => setShowDamageNumber(false), 1000)
    }
    setSelectedCardIndex(null)
    endTurn()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && battleState.phase === 'player') {
        handleEndTurn()
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && battleState.canUndo) {
        undoLastAction()
      }
      // Number keys to select cards
      const num = parseInt(e.key)
      if (num >= 1 && num <= battleState.hand.length) {
        handleCardClick(num - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [battleState.phase, battleState.hand.length, battleState.canUndo])

  if (!battleState.enemy) {
    return <div className="text-center p-8">Loading battle...</div>
  }

  const isBoss = 'phases' in battleState.enemy

  return (
    <div className="relative flex flex-col h-full min-h-screen bg-[#2D2A26] text-[#F7F3EB]">
      {/* Top Bar - Coherence and Stats */}
      <TopBar
        coherence={gameState.coherence}
        maxCoherence={gameState.maxCoherence}
        deckSize={battleState.drawPile.length}
        discardSize={battleState.discardPile.length}
      />

      {/* Enemy Zone */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <EnemyDisplay
          enemy={battleState.enemy}
          intent={useBattleStore.getState().getEnemyIntent()}
          showDamageNumber={showDamageNumber}
          damageAmount={lastDamage}
        />
      </div>

      {/* Play Area */}
      <div className="px-4">
        <PlayArea
          cards={battleState.playArea}
          damagePreview={battleState.currentDamage}
        />
      </div>

      {/* Hand Zone */}
      <div className="border-t border-[#D4C9B5]/20 bg-[#1a1917] p-4">
        <div className="flex items-center justify-between mb-2">
          {/* Thought Points */}
          <TPIndicator
            current={battleState.thoughtPoints}
            max={battleState.maxThoughtPoints}
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={undoLastAction}
              disabled={!battleState.canUndo}
              className={cn(
                'px-4 py-2 rounded-lg border-2 font-serif transition-all',
                battleState.canUndo
                  ? 'border-[#D4C9B5] text-[#F7F3EB] hover:bg-[#D4C9B5]/20'
                  : 'border-[#5A5550] text-[#5A5550] cursor-not-allowed'
              )}
            >
              Undo
            </button>
            <button
              onClick={handleEndTurn}
              disabled={battleState.phase !== 'player'}
              className={cn(
                'px-6 py-2 rounded-lg border-2 font-serif font-bold transition-all',
                battleState.phase === 'player'
                  ? 'bg-amber-600 border-amber-700 text-[#2D2A26] hover:bg-amber-500'
                  : 'bg-[#5A5550] border-[#5A5550] text-[#8A847A] cursor-not-allowed'
              )}
            >
              End Turn
            </button>
          </div>
        </div>

        {/* Card Hand */}
        <CardHand
          cards={battleState.hand}
          onCardClick={handleCardClick}
          canPlayCard={canPlayCard}
          selectedIndex={selectedCardIndex ?? undefined}
        />

        {/* Instructions */}
        <p className="text-center text-[#8A847A] text-sm mt-2">
          Click a card to select, click again to play. Press 1-{battleState.hand.length} for quick select.
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// TOP BAR
// =============================================================================

interface TopBarProps {
  coherence: number
  maxCoherence: number
  deckSize: number
  discardSize: number
}

function TopBar({ coherence, maxCoherence, deckSize, discardSize }: TopBarProps) {
  const coherencePercent = (coherence / maxCoherence) * 100
  const isLow = coherencePercent < 25
  const isWarning = coherencePercent < 50

  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1917] border-b border-[#D4C9B5]/20">
      {/* Coherence Bar */}
      <div className="flex-1 max-w-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-serif">Coherence</span>
          <span className="font-mono text-sm">
            {coherence}/{maxCoherence}
          </span>
        </div>
        <div className="h-4 bg-[#D4C9B5]/30 rounded-full overflow-hidden border border-[#D4C9B5]/50">
          <div
            className={cn(
              'h-full transition-all duration-300 rounded-full',
              isLow && 'bg-red-600 animate-pulse',
              isWarning && !isLow && 'bg-amber-500',
              !isWarning && 'bg-emerald-600'
            )}
            style={{ width: `${coherencePercent}%` }}
          />
        </div>
      </div>

      {/* Deck Info */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-[#8A847A]">Draw:</span>
          <span className="font-mono">{deckSize}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[#8A847A]">Discard:</span>
          <span className="font-mono">{discardSize}</span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// ENEMY DISPLAY
// =============================================================================

interface EnemyDisplayProps {
  enemy: Enemy | Boss
  intent: string
  showDamageNumber: boolean
  damageAmount: number
}

function EnemyDisplay({ enemy, intent, showDamageNumber, damageAmount }: EnemyDisplayProps) {
  const isBoss = 'phases' in enemy
  const hpPercent = (enemy.currentHP / enemy.maxHP) * 100

  return (
    <div className={cn(
      'relative flex flex-col items-center gap-4 p-6 rounded-xl border-2',
      'bg-[#EDE6D6] text-[#2D2A26]',
      isBoss ? 'border-[#2D2A26] min-w-[320px]' : 'border-[#9A8D7F] min-w-[280px]'
    )}>
      {/* Damage number animation */}
      {showDamageNumber && damageAmount > 0 && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 font-mono font-bold text-5xl text-amber-500 animate-bounce"
          style={{
            textShadow: '2px 2px 0 #2D2A26, 4px 4px 0 rgba(45, 42, 38, 0.3)',
            animation: 'damage-pop 0.6s ease-out forwards',
          }}
        >
          -{damageAmount}
        </div>
      )}

      {/* Portrait */}
      <div className={cn(
        'rounded-lg border-2 border-[#9A8D7F] bg-[#F7F3EB] flex items-center justify-center',
        isBoss ? 'w-40 h-40' : 'w-32 h-32'
      )}>
        <span className="text-6xl opacity-60">{getEnemyIcon(enemy.id)}</span>
      </div>

      {/* Name */}
      <h2 className={cn(
        'font-serif font-bold text-center',
        isBoss ? 'text-2xl' : 'text-xl'
      )}>
        {enemy.name}
      </h2>

      {/* HP Bar */}
      <div className="w-full">
        <div className="flex justify-between text-sm mb-1">
          <span>HP</span>
          <span className="font-mono">{enemy.currentHP}/{enemy.maxHP}</span>
        </div>
        <div className="h-4 bg-[#D4C9B5] rounded-full overflow-hidden border border-[#9A8D7F]">
          <div
            className={cn(
              'h-full transition-all duration-300 rounded-full',
              hpPercent < 25 ? 'bg-red-600' : hpPercent < 50 ? 'bg-amber-500' : 'bg-emerald-600'
            )}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Shield */}
      {enemy.shield > 0 && (
        <div className="flex items-center gap-1 text-blue-600">
          <span>🛡️</span>
          <span className="font-mono font-bold">{enemy.shield}</span>
        </div>
      )}

      {/* Intent */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#D4C9B5] rounded-lg">
        <span className="text-lg">{getIntentIcon(intent)}</span>
        <span className="text-sm">{intent}</span>
      </div>

      {/* Boss Phase */}
      {isBoss && (
        <div className="text-xs text-[#5A5550] italic">
          Phase {(enemy as Boss).currentPhase + 1}: {(enemy as Boss).phases[(enemy as Boss).currentPhase]?.name}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// PLAY AREA
// =============================================================================

interface PlayAreaProps {
  cards: CardType[]
  damagePreview: { finalDamage: number; chainBonus: number } | null
}

function PlayArea({ cards, damagePreview }: PlayAreaProps) {
  return (
    <div className={cn(
      'min-h-[200px] p-4 rounded-xl border-2 border-dashed',
      'bg-[#1a1917]/50 border-[#D4C9B5]/30',
      'flex flex-col items-center justify-center gap-4'
    )}>
      {cards.length === 0 ? (
        <p className="text-[#5A5550] italic">Play cards here to build your argument</p>
      ) : (
        <>
          {/* Played cards */}
          <div className="flex flex-wrap justify-center gap-2">
            {cards.map((card, i) => (
              <Card key={`${card.id}-${i}`} card={card} size="sm" />
            ))}
          </div>

          {/* Damage preview */}
          {damagePreview && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-[#8A847A]">Chain:</span>
                <span className="font-mono text-amber-400">
                  {cards.length} cards ({Math.round((damagePreview.chainBonus - 1) * 100)}% bonus)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#8A847A]">Damage:</span>
                <span className="font-mono text-2xl text-amber-400 font-bold">
                  {damagePreview.finalDamage}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// =============================================================================
// TP INDICATOR
// =============================================================================

interface TPIndicatorProps {
  current: number
  max: number
}

function TPIndicator({ current, max }: TPIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[#8A847A]">Thought Points:</span>
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 transition-all',
              i < current
                ? 'bg-amber-500 border-amber-600'
                : 'bg-transparent border-[#5A5550]'
            )}
          />
        ))}
      </div>
      <span className="font-mono text-sm">{current}/{max}</span>
    </div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function getEnemyIcon(id: string): string {
  const icons: Record<string, string> = {
    confirmation_bias: '🔒',
    anchoring_bias: '⚓',
    availability_heuristic: '📰',
    bandwagon_effect: '👥',
    hindsight_bias: '🔮',
    sunk_cost_fallacy: '💸',
    dunning_kruger: '🤴',
    survivorship_bias: '🏆',
    fundamental_attribution: '👤',
    in_group_bias: '🏠',
    just_world_fallacy: '⚖️',
    appeal_to_nature: '🌿',
    gambler_fallacy: '🎰',
    post_hoc: '➡️',
    normalcy_bias: '😌',
    motivated_reasoning: '❤️',
    backfire_effect: '🔥',
    choice_supportive: '✅',
    problem_of_induction: '⏳',
    trolley_problem: '🚃',
    meaning_of_life: '✨',
  }
  return icons[id] || '🧠'
}

function getIntentIcon(intent: string): string {
  const lowerIntent = intent.toLowerCase()
  if (lowerIntent.includes('attack') || lowerIntent.includes('damage')) return '⚔️'
  if (lowerIntent.includes('shield') || lowerIntent.includes('defend')) return '🛡️'
  if (lowerIntent.includes('buff') || lowerIntent.includes('strength')) return '⬆️'
  if (lowerIntent.includes('debuff') || lowerIntent.includes('weak')) return '⬇️'
  return '❓'
}

// Add CSS animation
const damagePopKeyframes = `
  @keyframes damage-pop {
    0% {
      opacity: 0;
      transform: translateX(-50%) scale(0.5) translateY(20px);
    }
    30% {
      opacity: 1;
      transform: translateX(-50%) scale(1.2) translateY(-10px);
    }
    100% {
      opacity: 0;
      transform: translateX(-50%) scale(1) translateY(-60px);
    }
  }
`

// Inject animation styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = damagePopKeyframes
  document.head.appendChild(style)
}
