'use client'

/**
 * Mind Architect - Map Screen
 * Roguelike map navigation with node selection
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useGameStore } from '@/lib/games/mind-architect/store/gameStore'
import { MapNode, NodeType } from '@/types/mind-architect'
import { cn } from '@/lib/utils'

// =============================================================================
// CONSTANTS
// =============================================================================

const NODE_ICONS: Record<NodeType, string> = {
  battle: '⚔️',
  elite: '💀',
  boss: '👑',
  rest: '🏕️',
  shop: '🛒',
  mystery: '❓',
  treasure: '💎',
}

const NODE_COLORS: Record<NodeType, string> = {
  battle: 'bg-red-900/80',
  elite: 'bg-purple-900/80',
  boss: 'bg-amber-700/80',
  rest: 'bg-green-900/80',
  shop: 'bg-blue-900/80',
  mystery: 'bg-slate-700/80',
  treasure: 'bg-yellow-700/80',
}

const NODE_NAMES: Record<NodeType, string> = {
  battle: 'Cognitive Bias',
  elite: 'Elite Bias',
  boss: 'Philosophical Crisis',
  rest: 'Meditation',
  shop: 'Library',
  mystery: 'Unknown',
  treasure: 'Insight',
}

// =============================================================================
// MAP SCREEN
// =============================================================================

export function MapScreen() {
  const gameState = useGameStore((state) => state.gameState)
  const selectNode = useGameStore((state) => state.selectNode)
  const advanceFloor = useGameStore((state) => state.advanceFloor)

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number>(0)

  // Get available nodes for keyboard navigation
  const availableNodes = gameState.map.nodes.filter((n) => n.available)

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (availableNodes.length === 0) return

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedNodeIndex((prev) =>
          prev > 0 ? prev - 1 : availableNodes.length - 1
        )
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedNodeIndex((prev) =>
          prev < availableNodes.length - 1 ? prev + 1 : 0
        )
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const node = availableNodes[selectedNodeIndex]
        if (node) {
          selectNode(node.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [availableNodes, selectedNodeIndex, selectNode])

  // Calculate node positions
  const getNodePosition = useCallback(
    (node: MapNode) => {
      const maxY = Math.max(...gameState.map.nodes.map((n) => n.y))
      const padding = 60
      const usableWidth = dimensions.width - padding * 2
      const usableHeight = dimensions.height - padding * 2

      // Add some jitter for organic feel
      const jitterSeed = parseInt(node.id.replace(/\D/g, '')) || 0
      const xJitter = (Math.sin(jitterSeed * 12.9898) * 0.5 + 0.5) * 20 - 10
      const yJitter = (Math.cos(jitterSeed * 78.233) * 0.5 + 0.5) * 10 - 5

      const x = padding + node.x * usableWidth + xJitter
      const y = padding + (node.y / (maxY + 1)) * usableHeight + yJitter

      return { x, y }
    },
    [dimensions, gameState.map.nodes]
  )

  // Check if all nodes are completed (boss defeated)
  const bossNode = gameState.map.nodes.find((n) => n.type === 'boss')
  const floorComplete = bossNode?.visited

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#2D2A26] text-[#F7F3EB]">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-[#1a1917] border-b border-[#D4C9B5]/20">
        <div>
          <h1 className="font-serif text-2xl">
            Floor {gameState.currentFloor}: {getFloorName(gameState.currentFloor)}
          </h1>
          <p className="text-sm text-[#8A847A]">
            Select a path through the cognitive landscape
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[#8A847A]">Coherence:</span>
            <span className="font-mono text-lg">
              {gameState.coherence}/{gameState.maxCoherence}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#8A847A]">Gold:</span>
            <span className="font-mono text-lg text-amber-400">
              {gameState.gold}
            </span>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {gameState.map.nodes.map((node) => {
            const fromPos = getNodePosition(node)
            return node.connections
              .filter((connId) => {
                // Only draw lines to nodes in the next row (avoid duplicates)
                const connNode = gameState.map.nodes.find((n) => n.id === connId)
                return connNode && connNode.y > node.y
              })
              .map((connId) => {
                const toNode = gameState.map.nodes.find((n) => n.id === connId)
                if (!toNode) return null
                const toPos = getNodePosition(toNode)

                // Check if this path is active (visited or available)
                const isActive = node.visited || toNode.available

                return (
                  <line
                    key={`${node.id}-${connId}`}
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke={isActive ? '#D4C9B5' : '#5A5550'}
                    strokeWidth={isActive ? 3 : 1}
                    strokeDasharray={isActive ? undefined : '4 4'}
                    className="transition-all duration-300"
                  />
                )
              })
          })}
        </svg>

        {/* Nodes */}
        {gameState.map.nodes.map((node, index) => {
          const pos = getNodePosition(node)
          const isAvailable = node.available
          const isVisited = node.visited
          const isHovered = hoveredNode === node.id
          const isKeyboardSelected =
            availableNodes[selectedNodeIndex]?.id === node.id
          const isRevealed = node.revealed || isAvailable || isVisited

          return (
            <MapNodeComponent
              key={node.id}
              node={node}
              position={pos}
              isAvailable={isAvailable}
              isVisited={isVisited}
              isHovered={isHovered}
              isKeyboardSelected={isKeyboardSelected}
              isRevealed={isRevealed}
              onSelect={() => selectNode(node.id)}
              onHover={() => setHoveredNode(node.id)}
              onLeave={() => setHoveredNode(null)}
            />
          )
        })}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[#1a1917]/90 rounded-lg p-4 border border-[#D4C9B5]/20">
          <h3 className="text-sm font-serif mb-2">Legend</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(NODE_ICONS).map(([type, icon]) => (
              <div key={type} className="flex items-center gap-2">
                <span>{icon}</span>
                <span className="text-[#8A847A]">{NODE_NAMES[type as NodeType]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 right-4 text-sm text-[#8A847A]">
          <p>Click a glowing node to proceed</p>
          <p>Arrow keys + Enter for keyboard navigation</p>
        </div>
      </div>

      {/* Floor Complete Overlay */}
      {floorComplete && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#2D2A26] border-2 border-amber-600 rounded-xl p-8 text-center max-w-md">
            <h2 className="text-3xl font-serif text-amber-400 mb-4">
              Floor {gameState.currentFloor} Complete!
            </h2>
            <p className="text-[#D4C9B5] mb-6">
              {getFloorCompleteMessage(gameState.currentFloor)}
            </p>
            {gameState.currentFloor < 3 ? (
              <button
                onClick={advanceFloor}
                className="px-8 py-3 bg-amber-600 text-[#2D2A26] font-serif font-bold rounded-lg
                         hover:bg-amber-500 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Ascend to Floor {gameState.currentFloor + 1}
              </button>
            ) : (
              <button
                onClick={advanceFloor}
                className="px-8 py-3 bg-emerald-600 text-white font-serif font-bold rounded-lg
                         hover:bg-emerald-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                Complete Your Journey
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MAP NODE COMPONENT
// =============================================================================

interface MapNodeComponentProps {
  node: MapNode
  position: { x: number; y: number }
  isAvailable: boolean
  isVisited: boolean
  isHovered: boolean
  isKeyboardSelected: boolean
  isRevealed: boolean
  onSelect: () => void
  onHover: () => void
  onLeave: () => void
}

function MapNodeComponent({
  node,
  position,
  isAvailable,
  isVisited,
  isHovered,
  isKeyboardSelected,
  isRevealed,
  onSelect,
  onHover,
  onLeave,
}: MapNodeComponentProps) {
  const isBoss = node.type === 'boss'
  const size = isBoss ? 56 : 44

  return (
    <button
      onClick={isAvailable ? onSelect : undefined}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      disabled={!isAvailable}
      aria-label={`${NODE_NAMES[node.type]}${isAvailable ? ' - Available' : ''}${isVisited ? ' - Visited' : ''}`}
      className={cn(
        'absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full',
        'flex items-center justify-center transition-all duration-200',
        'border-2 focus:outline-none',
        // Size
        isBoss ? 'w-14 h-14 text-2xl' : 'w-11 h-11 text-xl',
        // States
        isVisited && 'opacity-40 border-[#5A5550] bg-[#3D3A36]',
        !isVisited && !isRevealed && 'opacity-30 border-[#5A5550] bg-[#3D3A36]',
        isRevealed && !isVisited && !isAvailable && cn(
          'border-[#5A5550]',
          NODE_COLORS[node.type]
        ),
        isAvailable && cn(
          'border-amber-400 shadow-lg cursor-pointer',
          'hover:scale-110 hover:shadow-amber-400/30',
          NODE_COLORS[node.type],
          'animate-pulse'
        ),
        // Keyboard/hover highlight
        (isHovered || isKeyboardSelected) && isAvailable && 'scale-115 ring-2 ring-amber-300'
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {isRevealed || isAvailable || isVisited ? (
        <span aria-hidden="true">{NODE_ICONS[node.type]}</span>
      ) : (
        <span aria-hidden="true" className="text-[#5A5550]">?</span>
      )}

      {/* Tooltip */}
      {(isHovered || isKeyboardSelected) && isRevealed && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50
                     bg-[#1a1917] border border-[#D4C9B5]/30 rounded-lg px-3 py-2
                     whitespace-nowrap text-sm pointer-events-none"
        >
          <p className="font-serif font-bold">{NODE_NAMES[node.type]}</p>
          {node.type === 'battle' && <p className="text-[#8A847A]">Fight a cognitive bias</p>}
          {node.type === 'elite' && <p className="text-[#8A847A]">Tough fight, better rewards</p>}
          {node.type === 'boss' && <p className="text-amber-400">Final challenge of this floor</p>}
          {node.type === 'rest' && <p className="text-[#8A847A]">Heal or upgrade a card</p>}
          {node.type === 'shop' && <p className="text-[#8A847A]">Buy cards and relics</p>}
          {node.type === 'mystery' && <p className="text-[#8A847A]">A random event awaits</p>}
          {node.type === 'treasure' && <p className="text-[#8A847A]">Free relic!</p>}
        </div>
      )}
    </button>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function getFloorName(floor: number): string {
  const names: Record<number, string> = {
    1: 'The Foundations',
    2: 'The Depths',
    3: 'The Summit',
  }
  return names[floor] || 'Unknown'
}

function getFloorCompleteMessage(floor: number): string {
  const messages: Record<number, string> = {
    1: 'You have overcome the Problem of Induction. Your reasoning grows stronger.',
    2: 'The Trolley Problem could not derail your logic. Deeper truths await.',
    3: 'You have confronted the Meaning of Life itself. True clarity is yours.',
  }
  return messages[floor] || 'Floor complete!'
}
