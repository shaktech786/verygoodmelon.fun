import { MapNode, NodeType } from '@/types/thought-pockets'
import { enemiesFor, TUTORIAL_ENEMY } from '../data/enemies'
import { pick, rollInt, shuffle } from './rng'

export const FLOOR_ROWS = 5

/** Two rows offer a fight, so with the opening fight no path meets more biases than a floor has. The row before the boss is for recovering. */
const MIDDLE_ROWS: NodeType[][] = [
  ['battle', 'event', 'shop'],
  ['elite', 'battle', 'treasure'],
  ['rest', 'event', 'shop'],
]
const ELITE_ROW = 2

function nodeId(floor: number, row: number, lane: number): string {
  return `f${floor}-r${row}-l${lane}`
}

function connect(from: number, to: number, rng: number): { links: number[][]; rng: number } {
  if (from === 1) return { links: [Array.from({ length: to }, (_, j) => j)], rng }
  if (to === 1) return { links: Array.from({ length: from }, () => [0]), rng }
  if (from === 2) return { links: [[0, 1], [1, 2]], rng }
  const links = Array.from({ length: from }, (_, i) => [i])
  let state = rng
  for (let i = 0; i < from - 1; i++) {
    const r = rollInt(state, 0, 2)
    state = r.rng
    if (r.value === 1) links[i].push(i + 1)
    if (r.value === 2) links[i + 1].unshift(i)
  }
  return { links, rng: state }
}

/** One floor: a fight to open, three rows of three choices, then the boss. Paths never cross, and no bias appears twice on a floor. */
export function generateFloor(floor: 1 | 2 | 3, rng: number): { nodes: MapNode[]; rng: number } {
  let state = rng
  const normals = shuffle(enemiesFor(floor, 'normal').map((e) => e.id), state)
  state = normals.rng
  const queue = floor === 1 ? [TUTORIAL_ENEMY, ...normals.items] : normals.items
  let cursor = 0
  const nextNormal = () => queue[cursor++]
  const elite = pick(enemiesFor(floor, 'elite'), state)
  const boss = pick(enemiesFor(floor, 'boss'), elite.rng)
  state = boss.rng

  const rows: NodeType[][] = [['battle']]
  for (const types of MIDDLE_ROWS) {
    const shuffled = shuffle(types, state)
    state = shuffled.rng
    rows.push(shuffled.items)
  }
  rows.push(['boss'])
  // Every lane always leads straight on, so a rest in the hard fight's lane is always reachable after it.
  const recovery = rows[ELITE_ROW + 1]
  const lane = rows[ELITE_ROW].indexOf('elite')
  recovery.splice(recovery.indexOf('rest'), 1)
  recovery.splice(lane, 0, 'rest')

  const nodes: MapNode[] = []
  rows.forEach((types, row) => {
    types.forEach((type, lane) => {
      let enemyId: string | undefined
      if (type === 'battle') enemyId = nextNormal()
      if (type === 'elite') enemyId = elite.item.id
      if (type === 'boss') enemyId = boss.item.id
      nodes.push({ id: nodeId(floor, row, lane), type, row, lane, lanes: types.length, next: [], enemyId })
    })
  })

  for (let row = 0; row < rows.length - 1; row++) {
    const { links, rng: after } = connect(rows[row].length, rows[row + 1].length, state)
    state = after
    links.forEach((targets, lane) => {
      const node = nodes.find((n) => n.row === row && n.lane === lane) as MapNode
      node.next = targets.map((target) => nodeId(floor, row + 1, target))
    })
  }
  return { nodes, rng: state }
}
