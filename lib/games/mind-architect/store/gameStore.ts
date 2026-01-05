/**
 * Mind Architect - Main Game Store
 * Manages run state, progression, and meta-game
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  GameState,
  GameScreen,
  GameSettings,
  School,
  Card,
  Relic,
  GameMap,
  MapNode,
} from '@/types/mind-architect'
import { getStarterDeck } from '../data/cards'
import { getStarterRelic } from '../data/relics'
import { generateFloorMap } from '../engine/mapgen'

// =============================================================================
// INITIAL STATE
// =============================================================================

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  reducedMotion: false,
  autoEndTurn: false,
  confirmEndTurn: true,
  showDamageNumbers: true,
}

const initialGameState: GameState = {
  runId: '',
  school: 'pragmatist',
  seed: 0,
  currentFloor: 0,
  map: {
    floor: 0,
    nodes: [],
    currentNodeId: null,
    seed: 0,
  },
  coherence: 50,
  maxCoherence: 50,
  gold: 0,
  deck: [],
  relics: [],
  turnCount: 0,
  enemiesDefeated: 0,
  bossesDefeated: 0,
  screen: 'menu',
  settings: DEFAULT_SETTINGS,
}

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface GameStore {
  // State
  gameState: GameState

  // Run Management
  startNewRun: (school: School) => void
  abandonRun: () => void
  loadRun: () => boolean

  // Navigation
  setScreen: (screen: GameScreen) => void
  selectNode: (nodeId: string) => void
  completeNode: () => void

  // Progression
  advanceFloor: () => void

  // Resources
  addGold: (amount: number) => void
  spendGold: (amount: number) => boolean
  heal: (amount: number) => void
  damage: (amount: number) => void

  // Deck Management
  addCardToDeck: (card: Card) => void
  removeCardFromDeck: (cardId: string) => void
  upgradeCardInDeck: (cardId: string) => void

  // Relics
  addRelic: (relic: Relic) => void
  hasRelic: (relicId: string) => boolean

  // Settings
  updateSettings: (settings: Partial<GameSettings>) => void

  // Computed
  getCurrentNode: () => MapNode | null
  isRunActive: () => boolean
  canAfford: (cost: number) => boolean
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: initialGameState,

      // ========================================================================
      // RUN MANAGEMENT
      // ========================================================================

      startNewRun: (school: School) => {
        const seed = Date.now()
        const starterDeck = getStarterDeck(school)
        const starterRelic = getStarterRelic(school)

        // Generate first floor map
        const map = generateFloorMap(1, seed)

        set({
          gameState: {
            ...initialGameState,
            runId: `run_${seed}`,
            school,
            seed,
            currentFloor: 1,
            map: {
              floor: 1,
              nodes: map,
              currentNodeId: null,
              seed,
            },
            coherence: 50,
            maxCoherence: 50,
            gold: 0,
            deck: starterDeck,
            relics: starterRelic ? [starterRelic] : [],
            screen: 'map',
            settings: get().gameState.settings,
          },
        })
      },

      abandonRun: () => {
        set({
          gameState: {
            ...initialGameState,
            settings: get().gameState.settings,
          },
        })
      },

      loadRun: () => {
        const state = get().gameState
        return state.runId !== '' && state.currentFloor > 0
      },

      // ========================================================================
      // NAVIGATION
      // ========================================================================

      setScreen: (screen: GameScreen) => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            screen,
          },
        }))
      },

      selectNode: (nodeId: string) => {
        const state = get().gameState
        const node = state.map.nodes.find((n) => n.id === nodeId)

        if (!node || !node.available) return

        // Mark node as visited
        const updatedNodes = state.map.nodes.map((n) =>
          n.id === nodeId ? { ...n, visited: true, available: false } : n
        )

        // Update available nodes (adjacent to visited)
        const finalNodes = updateAvailableNodes(updatedNodes, nodeId)

        set({
          gameState: {
            ...state,
            map: {
              ...state.map,
              nodes: finalNodes,
              currentNodeId: nodeId,
            },
          },
        })

        // Navigate to appropriate screen based on node type
        const screenMap: Record<string, GameScreen> = {
          battle: 'battle',
          elite: 'battle',
          boss: 'battle',
          rest: 'rest',
          shop: 'shop',
          mystery: 'event',
          treasure: 'reward',
        }

        get().setScreen(screenMap[node.type] || 'map')
      },

      completeNode: () => {
        const state = get().gameState
        const currentNode = state.map.nodes.find(
          (n) => n.id === state.map.currentNodeId
        )

        if (!currentNode) return

        // Track stats
        let enemiesDefeated = state.enemiesDefeated
        let bossesDefeated = state.bossesDefeated

        if (currentNode.type === 'battle' || currentNode.type === 'elite') {
          enemiesDefeated++
        }
        if (currentNode.type === 'boss') {
          bossesDefeated++
        }

        set({
          gameState: {
            ...state,
            enemiesDefeated,
            bossesDefeated,
            screen: currentNode.type === 'boss' ? 'reward' : 'map',
          },
        })
      },

      // ========================================================================
      // PROGRESSION
      // ========================================================================

      advanceFloor: () => {
        const state = get().gameState
        const nextFloor = state.currentFloor + 1

        if (nextFloor > 3) {
          // Victory!
          set({
            gameState: {
              ...state,
              screen: 'victory',
            },
          })
          return
        }

        // Generate new floor map
        const newMap = generateFloorMap(nextFloor, state.seed + nextFloor)

        set({
          gameState: {
            ...state,
            currentFloor: nextFloor,
            map: {
              floor: nextFloor,
              nodes: newMap,
              currentNodeId: null,
              seed: state.seed + nextFloor,
            },
            screen: 'map',
          },
        })
      },

      // ========================================================================
      // RESOURCES
      // ========================================================================

      addGold: (amount: number) => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            gold: state.gameState.gold + amount,
          },
        }))
      },

      spendGold: (amount: number) => {
        const state = get().gameState
        if (state.gold < amount) return false

        set({
          gameState: {
            ...state,
            gold: state.gold - amount,
          },
        })
        return true
      },

      heal: (amount: number) => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            coherence: Math.min(
              state.gameState.maxCoherence,
              state.gameState.coherence + amount
            ),
          },
        }))
      },

      damage: (amount: number) => {
        const state = get().gameState
        const newCoherence = state.coherence - amount

        if (newCoherence <= 0) {
          // Defeat
          set({
            gameState: {
              ...state,
              coherence: 0,
              screen: 'defeat',
            },
          })
        } else {
          set({
            gameState: {
              ...state,
              coherence: newCoherence,
            },
          })
        }
      },

      // ========================================================================
      // DECK MANAGEMENT
      // ========================================================================

      addCardToDeck: (card: Card) => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            deck: [...state.gameState.deck, { ...card }],
          },
        }))
      },

      removeCardFromDeck: (cardId: string) => {
        set((state) => {
          const index = state.gameState.deck.findIndex((c) => c.id === cardId)
          if (index === -1) return state

          const newDeck = [...state.gameState.deck]
          newDeck.splice(index, 1)

          return {
            gameState: {
              ...state.gameState,
              deck: newDeck,
            },
          }
        })
      },

      upgradeCardInDeck: (cardId: string) => {
        set((state) => {
          const newDeck = state.gameState.deck.map((card) => {
            if (card.id === cardId && !card.upgraded && card.upgradeEffect) {
              return {
                ...card,
                ...card.upgradeEffect,
                upgraded: true,
                name: `${card.name}+`,
              }
            }
            return card
          })

          return {
            gameState: {
              ...state.gameState,
              deck: newDeck,
            },
          }
        })
      },

      // ========================================================================
      // RELICS
      // ========================================================================

      addRelic: (relic: Relic) => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            relics: [...state.gameState.relics, relic],
          },
        }))

        // Apply immediate effects
        const effect = relic.effect
        if (effect.type === 'max_coherence') {
          set((state) => ({
            gameState: {
              ...state.gameState,
              maxCoherence: state.gameState.maxCoherence + (effect.value || 0),
              coherence: state.gameState.coherence + (effect.value || 0),
            },
          }))
        }
      },

      hasRelic: (relicId: string) => {
        return get().gameState.relics.some((r) => r.id === relicId)
      },

      // ========================================================================
      // SETTINGS
      // ========================================================================

      updateSettings: (settings: Partial<GameSettings>) => {
        set((state) => ({
          gameState: {
            ...state.gameState,
            settings: {
              ...state.gameState.settings,
              ...settings,
            },
          },
        }))
      },

      // ========================================================================
      // COMPUTED
      // ========================================================================

      getCurrentNode: () => {
        const state = get().gameState
        return (
          state.map.nodes.find((n) => n.id === state.map.currentNodeId) || null
        )
      },

      isRunActive: () => {
        const state = get().gameState
        return state.runId !== '' && state.currentFloor > 0
      },

      canAfford: (cost: number) => {
        return get().gameState.gold >= cost
      },
    }),
    {
      name: 'mind-architect-game',
      partialize: (state) => ({
        gameState: {
          ...state.gameState,
          // Don't persist transient UI state
        },
      }),
    }
  )
)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function updateAvailableNodes(nodes: MapNode[], visitedNodeId: string): MapNode[] {
  const visitedNode = nodes.find((n) => n.id === visitedNodeId)
  if (!visitedNode) return nodes

  // Get all visited node IDs
  const visitedIds = new Set(nodes.filter((n) => n.visited).map((n) => n.id))

  return nodes.map((node) => {
    // If already visited, keep unavailable
    if (node.visited) {
      return { ...node, available: false }
    }

    // Check if any connected nodes have been visited
    const hasVisitedConnection = node.connections?.some((connId) =>
      visitedIds.has(connId)
    )

    // Also check if the visited node connects to this node
    const isConnectedFromVisited = visitedNode.connections?.includes(node.id)

    return {
      ...node,
      available: hasVisitedConnection || isConnectedFromVisited || false,
      revealed: hasVisitedConnection || isConnectedFromVisited || node.revealed,
    }
  })
}
