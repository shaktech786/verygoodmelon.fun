'use client'

/**
 * Thought Pockets - Main Game Page
 * Orchestrates all game screens based on current state
 * Uses dynamic imports for code splitting — only the active screen is loaded
 */

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useGameStore } from '@/lib/games/thought-pockets/store/gameStore'
import { useBattleStore } from '@/lib/games/thought-pockets/store/battleStore'
import { SoundToggle } from '@/components/ui/SoundToggle'

// Dynamic imports — each screen loads only when needed
const MenuScreen = dynamic(() => import('./components/MenuScreen').then(m => ({ default: m.MenuScreen })))
const MapScreen = dynamic(() => import('./components/MapScreen').then(m => ({ default: m.MapScreen })))
const BattleScreen = dynamic(() => import('./components/BattleScreen').then(m => ({ default: m.BattleScreen })))
const ShopScreen = dynamic(() => import('./components/ShopScreen').then(m => ({ default: m.ShopScreen })))
const RestScreen = dynamic(() => import('./components/RestScreen').then(m => ({ default: m.RestScreen })))
const RewardScreen = dynamic(() => import('./components/RewardScreen').then(m => ({ default: m.RewardScreen })))
const EventScreen = dynamic(() => import('./components/EventScreen').then(m => ({ default: m.EventScreen })))
const VictoryScreen = dynamic(() => import('./components/VictoryScreen').then(m => ({ default: m.VictoryScreen })))
const DefeatScreen = dynamic(() => import('./components/DefeatScreen').then(m => ({ default: m.DefeatScreen })))

export default function MindArchitectPage() {
  const screen = useGameStore((state) => state.gameState.screen)
  const currentNode = useGameStore((state) => state.getCurrentNode)
  const startBattle = useBattleStore((state) => state.startBattle)
  const gameState = useGameStore((state) => state.gameState)

  // Initialize battle when entering battle screen
  useEffect(() => {
    if (screen === 'battle') {
      const node = currentNode()
      if (node && node.enemyId) {
        const isElite = node.type === 'elite'
        const isBoss = node.type === 'boss'
        startBattle(node.enemyId, gameState.currentFloor, isElite, isBoss)
      }
    }
  }, [screen, currentNode, startBattle, gameState.currentFloor])

  // Get current node for determining reward type
  const node = currentNode()
  const isElite = node?.type === 'elite'
  const isBoss = node?.type === 'boss'
  const isTreasure = node?.type === 'treasure'

  // Render appropriate screen
  function renderScreen() {
    switch (screen) {
      case 'menu':
        return <MenuScreen />
      case 'map':
        return <MapScreen />
      case 'battle':
        return <BattleScreen />
      case 'shop':
        return <ShopScreen />
      case 'rest':
        return <RestScreen />
      case 'reward':
        return <RewardScreen isTreasure={isTreasure} isElite={isElite} isBoss={isBoss} />
      case 'event':
        return <EventScreen />
      case 'victory':
        return <VictoryScreen />
      case 'defeat':
        return <DefeatScreen />
      default:
        return <MenuScreen />
    }
  }

  return (
    <>
      {renderScreen()}
      <SoundToggle gameId="thought-pockets" />
    </>
  )
}
