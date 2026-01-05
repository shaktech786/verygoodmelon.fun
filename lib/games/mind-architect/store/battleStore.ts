/**
 * Mind Architect - Battle Store
 * Manages all combat-specific state
 */

import { create } from 'zustand'
import {
  BattleState,
  Card,
  Enemy,
  Boss,
  StatusEffect,
  DamageBreakdown,
  BattleAction,
  Relic,
} from '@/types/mind-architect'
import { calculateDamage, calculateCoherenceDamage } from '../engine/damage'
import { getRandomEnemy, getEnemyById, getNextPattern, advancePattern } from '../data/enemies'
import { getBossByFloor, createBossInstance, checkPhaseTransition, transitionToNextPhase, getBossPattern, advanceBossPattern } from '../data/bosses'
import { useGameStore } from './gameStore'

// =============================================================================
// CONSTANTS
// =============================================================================

const STARTING_TP = 3
const STARTING_HAND_SIZE = 5
const MAX_HAND_SIZE = 10

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialBattleState: BattleState = {
  enemy: null,
  turn: 0,
  phase: 'player',
  thoughtPoints: STARTING_TP,
  maxThoughtPoints: STARTING_TP,
  hand: [],
  drawPile: [],
  discardPile: [],
  exhaustPile: [],
  playArea: [],
  currentDamage: null,
  playerStatusEffects: [],
  history: [],
  canUndo: false,
  animationQueue: [],
}

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface BattleStore {
  // State
  battleState: BattleState

  // Battle Lifecycle
  startBattle: (enemyId: string, floor: number, isElite?: boolean, isBoss?: boolean) => void
  endBattle: (victory: boolean) => void

  // Turn Actions
  playCard: (cardIndex: number) => void
  endTurn: () => void
  undoLastAction: () => void

  // Card Operations
  drawCards: (count: number) => void
  discardCard: (cardIndex: number) => void
  discardHand: () => void
  shuffleDiscardIntoDraw: () => void

  // Damage
  calculateCurrentDamage: () => DamageBreakdown
  dealDamage: () => void
  takeDamage: (amount: number) => void

  // Enemy Turn
  executeEnemyTurn: () => void

  // Status Effects
  applyStatusEffect: (effect: StatusEffect, target: 'player' | 'enemy') => void
  tickStatusEffects: () => void

  // Turn Management
  startNewTurn: () => void

  // Computed
  canPlayCard: (card: Card) => boolean
  getEnemyIntent: () => string
  isBattleOver: () => boolean
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useBattleStore = create<BattleStore>((set, get) => ({
  battleState: initialBattleState,

  // ========================================================================
  // BATTLE LIFECYCLE
  // ========================================================================

  startBattle: (enemyId: string, floor: number, isElite = false, isBoss = false) => {
    const gameState = useGameStore.getState().gameState
    const deck = [...gameState.deck]

    // Get enemy
    let enemy: Enemy | Boss
    if (isBoss) {
      const boss = getBossByFloor(floor)
      if (!boss) return
      enemy = createBossInstance(boss)
    } else {
      // Look up enemy by ID, fall back to random if not found
      const foundEnemy = getEnemyById(enemyId)
      if (foundEnemy) {
        // Create fresh instance with reset HP and status
        enemy = {
          ...foundEnemy,
          currentHP: foundEnemy.maxHP,
          currentPatternIndex: 0,
          statusEffects: [],
          shield: 0,
        }
      } else {
        enemy = getRandomEnemy(floor, isElite)
      }
    }

    // Shuffle deck to create draw pile
    const drawPile = shuffleArray(deck)

    // Apply relic bonuses
    let startingTP = STARTING_TP
    let startingDraw = STARTING_HAND_SIZE

    for (const relic of gameState.relics) {
      if (relic.effect.trigger === 'battle_start') {
        if (relic.effect.type === 'starting_tp') {
          startingTP += relic.effect.value || 0
        }
        if (relic.effect.type === 'draw') {
          startingDraw += relic.effect.value || 0
        }
      }
    }

    // Draw starting hand
    const hand = drawPile.splice(0, startingDraw)

    set({
      battleState: {
        ...initialBattleState,
        enemy,
        turn: 1,
        phase: 'player',
        thoughtPoints: startingTP,
        maxThoughtPoints: startingTP,
        hand,
        drawPile,
        discardPile: [],
        exhaustPile: [],
        playArea: [],
        currentDamage: null,
        playerStatusEffects: [],
        history: [],
        canUndo: false,
        animationQueue: [],
      },
    })

    // Calculate initial damage preview
    get().calculateCurrentDamage()
  },

  endBattle: (victory: boolean) => {
    const state = get().battleState
    const gameStore = useGameStore.getState()

    if (victory) {
      // Calculate rewards
      const goldReward = calculateGoldReward(state.enemy!, state.turn)
      gameStore.addGold(goldReward)

      // Boss rewards
      if (state.enemy && 'phases' in state.enemy) {
        const boss = state.enemy as Boss
        gameStore.addGold(boss.rewards.gold)
      }

      gameStore.completeNode()
    } else {
      gameStore.setScreen('defeat')
    }

    // Reset battle state
    set({ battleState: initialBattleState })
  },

  // ========================================================================
  // TURN ACTIONS
  // ========================================================================

  playCard: (cardIndex: number) => {
    const state = get().battleState
    const card = state.hand[cardIndex]

    if (!get().canPlayCard(card)) return

    // Save state for undo
    const historyEntry: BattleAction = {
      type: 'play_card',
      cardIndex,
      timestamp: Date.now(),
      stateBefore: {
        hand: [...state.hand],
        playArea: [...state.playArea],
        thoughtPoints: state.thoughtPoints,
      },
    }

    // Remove card from hand, add to play area
    const newHand = [...state.hand]
    newHand.splice(cardIndex, 1)

    // Handle card effects immediately
    let drawCount = 0
    let tpGain = 0

    if (card.effect) {
      switch (card.effect.type) {
        case 'draw':
          drawCount = card.effect.value || 0
          break
        case 'gain_tp':
          tpGain = card.effect.value || 0
          break
        case 'heal':
          useGameStore.getState().heal(card.effect.value || 0)
          break
      }
    }

    set({
      battleState: {
        ...state,
        hand: newHand,
        playArea: [...state.playArea, card],
        thoughtPoints: state.thoughtPoints - card.cost + tpGain,
        history: [...state.history, historyEntry],
        canUndo: true,
      },
    })

    // Draw cards if effect triggered
    if (drawCount > 0) {
      get().drawCards(drawCount)
    }

    // Recalculate damage
    get().calculateCurrentDamage()
  },

  endTurn: () => {
    // Apply damage first
    get().dealDamage()

    // Get fresh state AFTER damage was dealt
    const state = get().battleState

    // Check if enemy is dead
    if (state.enemy && state.enemy.currentHP <= 0) {
      get().endBattle(true)
      return
    }

    // Move play area to discard
    const newDiscardPile = [...state.discardPile, ...state.playArea]

    // Discard hand (except retain cards)
    const retainCards = state.hand.filter((c) => c.retain)
    const discardCards = state.hand.filter((c) => !c.retain)
    const finalDiscard = [...newDiscardPile, ...discardCards]

    set({
      battleState: {
        ...state,
        playArea: [],
        hand: retainCards,
        discardPile: finalDiscard,
        phase: 'enemy',
        history: [],
        canUndo: false,
      },
    })

    // Execute enemy turn
    get().executeEnemyTurn()
  },

  undoLastAction: () => {
    const state = get().battleState
    if (!state.canUndo || state.history.length === 0) return

    const lastAction = state.history[state.history.length - 1]

    if (lastAction.type === 'play_card' && lastAction.stateBefore) {
      set({
        battleState: {
          ...state,
          hand: lastAction.stateBefore.hand || state.hand,
          playArea: lastAction.stateBefore.playArea || state.playArea,
          thoughtPoints: lastAction.stateBefore.thoughtPoints || state.thoughtPoints,
          history: state.history.slice(0, -1),
          canUndo: state.history.length > 1,
        },
      })

      get().calculateCurrentDamage()
    }
  },

  // ========================================================================
  // CARD OPERATIONS
  // ========================================================================

  drawCards: (count: number) => {
    const state = get().battleState
    let drawPile = [...state.drawPile]
    let discardPile = [...state.discardPile]
    const hand = [...state.hand]

    for (let i = 0; i < count && hand.length < MAX_HAND_SIZE; i++) {
      if (drawPile.length === 0) {
        if (discardPile.length === 0) break
        // Shuffle discard into draw
        drawPile = shuffleArray(discardPile)
        discardPile = []
      }
      const card = drawPile.shift()
      if (card) hand.push(card)
    }

    set({
      battleState: {
        ...state,
        hand,
        drawPile,
        discardPile,
      },
    })
  },

  discardCard: (cardIndex: number) => {
    const state = get().battleState
    const card = state.hand[cardIndex]
    if (!card) return

    const newHand = [...state.hand]
    newHand.splice(cardIndex, 1)

    set({
      battleState: {
        ...state,
        hand: newHand,
        discardPile: [...state.discardPile, card],
      },
    })
  },

  discardHand: () => {
    const state = get().battleState
    set({
      battleState: {
        ...state,
        hand: [],
        discardPile: [...state.discardPile, ...state.hand],
      },
    })
  },

  shuffleDiscardIntoDraw: () => {
    const state = get().battleState
    set({
      battleState: {
        ...state,
        drawPile: shuffleArray([...state.drawPile, ...state.discardPile]),
        discardPile: [],
      },
    })
  },

  // ========================================================================
  // DAMAGE
  // ========================================================================

  calculateCurrentDamage: () => {
    const state = get().battleState
    if (!state.enemy) {
      return {
        totalWeight: 0,
        totalMultiplier: 1,
        chainBonus: 1,
        relicBonuses: 0,
        resistanceReduction: 0,
        finalDamage: 0,
        weightSources: [],
        multiplierSources: [],
        bonusSources: [],
      }
    }

    const gameState = useGameStore.getState().gameState
    const damage = calculateDamage(
      state.playArea,
      gameState.relics,
      state.enemy,
      state.playerStatusEffects
    )

    set({
      battleState: {
        ...state,
        currentDamage: damage,
      },
    })

    return damage
  },

  dealDamage: () => {
    const state = get().battleState
    if (!state.enemy || !state.currentDamage) return

    const damage = state.currentDamage.finalDamage
    const newHP = state.enemy.currentHP - damage

    // Check for boss phase transition
    let enemy = { ...state.enemy }
    if ('phases' in enemy) {
      enemy.currentHP = Math.max(0, newHP)
      if (checkPhaseTransition(enemy as Boss)) {
        transitionToNextPhase(enemy as Boss)
      }
    } else {
      enemy.currentHP = Math.max(0, newHP)
    }

    // Calculate coherence damage from contradictions
    const gameState = useGameStore.getState().gameState
    const coherenceDamage = calculateCoherenceDamage(
      state.playArea,
      state.playerStatusEffects
    )

    if (coherenceDamage > 0) {
      useGameStore.getState().damage(coherenceDamage)
    }

    set({
      battleState: {
        ...state,
        enemy,
        currentDamage: null,
      },
    })
  },

  takeDamage: (amount: number) => {
    const state = get().battleState

    // Check for vulnerable debuff
    let finalDamage = amount
    const vulnerable = state.playerStatusEffects.find((s) => s.id === 'vulnerable')
    if (vulnerable) {
      finalDamage = Math.round(amount * 1.5)
    }

    // Check for weak enemy
    const enemyWeak = state.enemy?.statusEffects.find((s) => s.id === 'weak')
    if (enemyWeak) {
      finalDamage = Math.round(finalDamage * 0.75)
    }

    useGameStore.getState().damage(finalDamage)
  },

  // ========================================================================
  // ENEMY TURN
  // ========================================================================

  executeEnemyTurn: () => {
    const state = get().battleState
    if (!state.enemy) return

    // Get enemy's action
    let pattern
    if ('phases' in state.enemy) {
      pattern = getBossPattern(state.enemy as Boss)
    } else {
      pattern = getNextPattern(state.enemy)
    }

    // Execute action
    switch (pattern.intent) {
      case 'attack':
        if (pattern.damage) {
          get().takeDamage(pattern.damage)
        }
        break
      case 'defend':
        if (pattern.effect?.type === 'shield') {
          const newEnemy = { ...state.enemy }
          newEnemy.shield = (newEnemy.shield || 0) + (pattern.effect.value || 0)
          set({
            battleState: {
              ...state,
              enemy: newEnemy,
            },
          })
        }
        break
      case 'buff':
        if (pattern.effect) {
          get().applyStatusEffect(
            {
              id: pattern.effect.type,
              name: pattern.effect.type,
              type: 'buff',
              value: pattern.effect.value || 0,
              duration: pattern.effect.duration || -1,
              icon: '⬆️',
            },
            'enemy'
          )
        }
        break
      case 'debuff':
        if (pattern.effect && pattern.effect.target === 'player') {
          get().applyStatusEffect(
            {
              id: pattern.effect.type,
              name: pattern.effect.type,
              type: 'debuff',
              value: pattern.effect.value || 0,
              duration: pattern.effect.duration || -1,
              icon: '⬇️',
            },
            'player'
          )
        }
        break
    }

    // Advance enemy pattern
    if ('phases' in state.enemy) {
      advanceBossPattern(state.enemy as Boss)
    } else {
      advancePattern(state.enemy)
    }

    // Start new player turn
    get().tickStatusEffects()
    get().startNewTurn()
  },

  startNewTurn: () => {
    const state = get().battleState
    const gameState = useGameStore.getState().gameState

    // Calculate TP for new turn
    let newTP = STARTING_TP
    for (const relic of gameState.relics) {
      if (relic.effect.trigger === 'turn_start' && relic.effect.type === 'starting_tp') {
        newTP += relic.effect.value || 0
      }
    }

    set({
      battleState: {
        ...state,
        turn: state.turn + 1,
        phase: 'player',
        thoughtPoints: newTP,
      },
    })

    // Draw cards
    const drawCount = STARTING_HAND_SIZE - get().battleState.hand.length
    if (drawCount > 0) {
      get().drawCards(drawCount)
    }

    // Recalculate damage
    get().calculateCurrentDamage()
  },

  // ========================================================================
  // STATUS EFFECTS
  // ========================================================================

  applyStatusEffect: (effect: StatusEffect, target: 'player' | 'enemy') => {
    const state = get().battleState

    if (target === 'player') {
      // Check if effect already exists
      const existing = state.playerStatusEffects.find((s) => s.id === effect.id)
      if (existing) {
        existing.value += effect.value
        existing.duration = Math.max(existing.duration, effect.duration)
      } else {
        set({
          battleState: {
            ...state,
            playerStatusEffects: [...state.playerStatusEffects, effect],
          },
        })
      }
    } else if (state.enemy) {
      const existing = state.enemy.statusEffects.find((s) => s.id === effect.id)
      if (existing) {
        existing.value += effect.value
        existing.duration = Math.max(existing.duration, effect.duration)
      } else {
        const newEnemy = {
          ...state.enemy,
          statusEffects: [...state.enemy.statusEffects, effect],
        }
        set({
          battleState: {
            ...state,
            enemy: newEnemy,
          },
        })
      }
    }
  },

  tickStatusEffects: () => {
    const state = get().battleState

    // Tick player effects
    const newPlayerEffects = state.playerStatusEffects
      .map((effect) => ({
        ...effect,
        duration: effect.duration - 1,
      }))
      .filter((effect) => effect.duration !== 0)

    // Tick enemy effects
    let newEnemyEffects: StatusEffect[] = []
    if (state.enemy) {
      newEnemyEffects = state.enemy.statusEffects
        .map((effect) => ({
          ...effect,
          duration: effect.duration - 1,
        }))
        .filter((effect) => effect.duration !== 0)
    }

    set({
      battleState: {
        ...state,
        playerStatusEffects: newPlayerEffects,
        enemy: state.enemy
          ? { ...state.enemy, statusEffects: newEnemyEffects }
          : null,
      },
    })
  },

  // ========================================================================
  // COMPUTED
  // ========================================================================

  canPlayCard: (card: Card) => {
    const state = get().battleState
    return state.thoughtPoints >= card.cost && state.phase === 'player'
  },

  getEnemyIntent: () => {
    const state = get().battleState
    if (!state.enemy) return ''

    let pattern
    if ('phases' in state.enemy) {
      pattern = getBossPattern(state.enemy as Boss)
    } else {
      pattern = getNextPattern(state.enemy)
    }

    return pattern.description
  },

  isBattleOver: () => {
    const state = get().battleState
    const gameState = useGameStore.getState().gameState

    if (!state.enemy) return true
    if (state.enemy.currentHP <= 0) return true
    if (gameState.coherence <= 0) return true

    return false
  },
}))

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function calculateGoldReward(enemy: Enemy | Boss, turns: number): number {
  const baseGold = enemy.tier === 'boss' ? 50 : enemy.tier === 'elite' ? 30 : 15
  const bonus = Math.max(0, 10 - turns) // Bonus for fast kills
  return baseGold + bonus + Math.floor(Math.random() * 10)
}
