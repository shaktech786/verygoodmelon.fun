'use client'

/**
 * Mind Architect - Main Game Page
 * Orchestrates all game screens based on current state
 */

import { useEffect } from 'react'
import { useGameStore } from '@/lib/games/mind-architect/store/gameStore'
import { useBattleStore } from '@/lib/games/mind-architect/store/battleStore'
import { MenuScreen } from './components/MenuScreen'
import { MapScreen } from './components/MapScreen'
import { BattleScreen } from './components/BattleScreen'
import { ShopScreen } from './components/ShopScreen'
import { RestScreen } from './components/RestScreen'
import { RewardScreen } from './components/RewardScreen'
import { EventScreen } from './components/EventScreen'
import { VictoryScreen } from './components/VictoryScreen'
import { DefeatScreen } from './components/DefeatScreen'

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
