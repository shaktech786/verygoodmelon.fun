/**
 * Thought Pockets - Map Generation Engine
 * Creates procedural maps for each floor
 */

import { MapNode, NodeType } from '@/types/thought-pockets'

// =============================================================================
// CONSTANTS
// =============================================================================

const FLOOR_CONFIGS = {
  1: { rows: 12, minWidth: 2, maxWidth: 4 },
  2: { rows: 15, minWidth: 2, maxWidth: 4 },
  3: { rows: 10, minWidth: 2, maxWidth: 3 },
}

// Node type distribution by floor
const NODE_DISTRIBUTIONS: Record<number, Record<NodeType, number>> = {
  1: {
    battle: 0.50,
    elite: 0.08,
    rest: 0.12,
    shop: 0.10,
    mystery: 0.12,
    treasure: 0.08,
    boss: 0,
  },
  2: {
    battle: 0.45,
    elite: 0.12,
    rest: 0.12,
    shop: 0.10,
    mystery: 0.13,
    treasure: 0.08,
    boss: 0,
  },
  3: {
    battle: 0.40,
    elite: 0.15,
    rest: 0.15,
    shop: 0.10,
    mystery: 0.12,
    treasure: 0.08,
    boss: 0,
  },
}

// =============================================================================
// SEEDED RANDOM
// =============================================================================

class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
    return this.seed / 0x7fffffff
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)]
  }
}

// =============================================================================
// MAP GENERATION
// =============================================================================

export function generateFloorMap(floor: number, seed: number): MapNode[] {
  const rng = new SeededRandom(seed)
  const config = FLOOR_CONFIGS[floor as keyof typeof FLOOR_CONFIGS] || FLOOR_CONFIGS[1]
  const distribution = NODE_DISTRIBUTIONS[floor] || NODE_DISTRIBUTIONS[1]

  const nodes: MapNode[] = []
  const rowNodes: MapNode[][] = []

  // ==========================================================================
  // 1. GENERATE STARTING ROW
  // ==========================================================================

  const startingCount = rng.nextInt(2, 3)
  const startingNodes: MapNode[] = []

  for (let i = 0; i < startingCount; i++) {
    const x = (i + 0.5) / startingCount
    const node: MapNode = {
      id: `${floor}-0-${i}`,
      type: 'battle', // First row is always battles
      x,
      y: 0,
      connections: [],
      visited: false,
      available: true, // Starting nodes are available
      revealed: true,
    }
    startingNodes.push(node)
    nodes.push(node)
  }
  rowNodes.push(startingNodes)

  // ==========================================================================
  // 2. GENERATE MIDDLE ROWS
  // ==========================================================================

  for (let row = 1; row < config.rows - 1; row++) {
    const nodesInRow = rng.nextInt(config.minWidth, config.maxWidth)
    const rowNodeList: MapNode[] = []

    for (let i = 0; i < nodesInRow; i++) {
      const x = (i + 0.5) / nodesInRow
      const nodeType = selectNodeType(row, config.rows, rng, distribution)

      const node: MapNode = {
        id: `${floor}-${row}-${i}`,
        type: nodeType,
        x,
        y: row,
        connections: [],
        visited: false,
        available: false,
        revealed: false,
        enemyId: nodeType === 'battle' || nodeType === 'elite'
          ? selectEnemyId(floor, nodeType, rng)
          : undefined,
      }

      rowNodeList.push(node)
      nodes.push(node)
    }

    rowNodes.push(rowNodeList)
  }

  // ==========================================================================
  // 3. GENERATE PRE-BOSS ROW (Guaranteed rest option)
  // ==========================================================================

  const preBossRow = config.rows - 1
  const preBossNodes: MapNode[] = []
  const preBossCount = rng.nextInt(2, 3)

  for (let i = 0; i < preBossCount; i++) {
    const x = (i + 0.5) / preBossCount
    // 50% rest, 50% shop
    const nodeType = rng.next() < 0.5 ? 'rest' : 'shop'

    const node: MapNode = {
      id: `${floor}-${preBossRow}-${i}`,
      type: nodeType as NodeType,
      x,
      y: preBossRow,
      connections: [],
      visited: false,
      available: false,
      revealed: false,
    }

    preBossNodes.push(node)
    nodes.push(node)
  }
  rowNodes.push(preBossNodes)

  // ==========================================================================
  // 4. ADD BOSS NODE
  // ==========================================================================

  const bossNode: MapNode = {
    id: `${floor}-boss`,
    type: 'boss',
    x: 0.5,
    y: config.rows,
    connections: [],
    visited: false,
    available: false,
    revealed: true, // Boss is always visible
    enemyId: getBossId(floor),
  }
  nodes.push(bossNode)
  rowNodes.push([bossNode])

  // ==========================================================================
  // 5. CONNECT NODES
  // ==========================================================================

  for (let row = 0; row < rowNodes.length - 1; row++) {
    const currentRow = rowNodes[row]
    const nextRow = rowNodes[row + 1]

    for (const node of currentRow) {
      // Each node connects to 1-2 nodes in the next row
      const connectionCount = row === rowNodes.length - 2
        ? 1 // Pre-boss row only connects to boss
        : rng.nextInt(1, 2)

      const connectedIndices = new Set<number>()

      for (let c = 0; c < connectionCount; c++) {
        // Prefer nodes that are roughly aligned
        const alignedIndex = Math.round(node.x * (nextRow.length - 1))
        let targetIndex: number

        if (connectedIndices.has(alignedIndex)) {
          // Try adjacent
          const adjacent = [alignedIndex - 1, alignedIndex + 1].filter(
            (i) => i >= 0 && i < nextRow.length && !connectedIndices.has(i)
          )
          if (adjacent.length > 0) {
            targetIndex = rng.pick(adjacent)
          } else {
            continue
          }
        } else {
          // 70% aligned, 30% random
          if (rng.next() < 0.7) {
            targetIndex = alignedIndex
          } else {
            targetIndex = rng.nextInt(0, nextRow.length - 1)
          }
        }

        connectedIndices.add(targetIndex)
        const targetNode = nextRow[targetIndex]

        // Add bidirectional connection (prevent duplicates)
        if (!node.connections.includes(targetNode.id)) {
          node.connections.push(targetNode.id)
        }
        if (!targetNode.connections.includes(node.id)) {
          targetNode.connections.push(node.id)
        }
      }
    }
  }

  // ==========================================================================
  // 6. ENSURE ALL NODES ARE REACHABLE
  // ==========================================================================

  // Check that all nodes have at least one incoming connection (except starting nodes)
  for (let row = 1; row < rowNodes.length; row++) {
    for (const node of rowNodes[row]) {
      const hasIncoming = rowNodes[row - 1].some((prevNode) =>
        prevNode.connections.includes(node.id)
      )

      if (!hasIncoming) {
        // Connect from a random node in the previous row
        const prevNode = rng.pick(rowNodes[row - 1])
        if (!prevNode.connections.includes(node.id)) {
          prevNode.connections.push(node.id)
        }
        if (!node.connections.includes(prevNode.id)) {
          node.connections.push(prevNode.id)
        }
      }
    }
  }

  // ==========================================================================
  // 7. ENSURE PATH TO BOSS
  // ==========================================================================

  // All pre-boss nodes must connect to boss
  for (const preBossNode of rowNodes[config.rows - 1]) {
    if (!preBossNode.connections.includes(bossNode.id)) {
      preBossNode.connections.push(bossNode.id)
      bossNode.connections.push(preBossNode.id)
    }
  }

  return nodes
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function selectNodeType(
  row: number,
  totalRows: number,
  rng: SeededRandom,
  distribution: Record<NodeType, number>
): NodeType {
  // Early rows have more battles
  if (row < 3) {
    return rng.next() < 0.7 ? 'battle' : selectWeightedType(rng, distribution)
  }

  // Mid-game has full distribution
  if (row < totalRows - 3) {
    return selectWeightedType(rng, distribution)
  }

  // Late game can have more elites
  const lateDistribution = { ...distribution, elite: distribution.elite * 1.5 }
  return selectWeightedType(rng, lateDistribution)
}

function selectWeightedType(
  rng: SeededRandom,
  distribution: Record<NodeType, number>
): NodeType {
  const roll = rng.next()
  let cumulative = 0

  for (const [type, weight] of Object.entries(distribution)) {
    cumulative += weight
    if (roll < cumulative) {
      return type as NodeType
    }
  }

  return 'battle' // Fallback
}

function selectEnemyId(
  floor: number,
  nodeType: NodeType,
  rng: SeededRandom
): string {
  // Import enemy pools
  const enemyPools: Record<number, string[]> = {
    1: [
      'confirmation_bias',
      'anchoring_bias',
      'availability_heuristic',
      'bandwagon_effect',
      'hindsight_bias',
    ],
    2: [
      'sunk_cost_fallacy',
      'dunning_kruger',
      'survivorship_bias',
      'fundamental_attribution',
      'in_group_bias',
    ],
    3: [
      'just_world_fallacy',
      'appeal_to_nature',
      'gambler_fallacy',
      'post_hoc',
      'normalcy_bias',
    ],
  }

  const elitePools: Record<number, string[]> = {
    1: ['motivated_reasoning'],
    2: ['motivated_reasoning', 'backfire_effect'],
    3: ['motivated_reasoning', 'backfire_effect', 'choice_supportive'],
  }

  if (nodeType === 'elite') {
    const pool = elitePools[floor] || elitePools[1]
    return rng.pick(pool)
  }

  const pool = enemyPools[floor] || enemyPools[1]
  return rng.pick(pool)
}

function getBossId(floor: number): string {
  const bosses: Record<number, string> = {
    1: 'problem_of_induction',
    2: 'trolley_problem',
    3: 'meaning_of_life',
  }
  return bosses[floor] || bosses[1]
}

// =============================================================================
// MAP UTILITIES
// =============================================================================

export function getNodePosition(node: MapNode, containerWidth: number, containerHeight: number): { x: number; y: number } {
  // Add some randomness to x position for organic feel
  const xJitter = (Math.sin(parseInt(node.id.replace(/\D/g, '')) * 12.9898) * 0.5 + 0.5) * 0.05 - 0.025
  const x = (node.x + xJitter) * containerWidth
  const y = (node.y / 15) * containerHeight * 0.9 + containerHeight * 0.05

  return { x, y }
}

export function isNodeAccessible(node: MapNode, visitedNodes: Set<string>): boolean {
  if (node.visited) return false
  if (node.y === 0) return true // Starting nodes always accessible

  // Check if any connected node from previous row is visited
  return node.connections.some((connId) => visitedNodes.has(connId))
}
