import { MapNode, NodeType } from '@/types/thought-pockets'
import { enemiesFor, TUTORIAL_ENEMY } from '../data/enemies'
import { rollInt, shuffle } from './rng'

export const FLOOR_ROWS = 5

const MIDDLE_ROWS: NodeType[][] = [
  ['battle', 'event', 'shop'],
  ['elite', 'battle', 'treasure'],
  ['rest', 'battle', 'shop'],
]

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

/** One floor: a fight to open, three rows of three choices, then the boss. Paths never cross. */
export function generateFloor(floor: 1 | 2 | 3, rng: number): { nodes: MapNode[]; rng: number } {
  let state = rng
  const normals = shuffle(enemiesFor(floor, 'normal').map((e) => e.id), state)
  state = normals.rng
  let normalCursor = 0
  const nextNormal = () => normals.items[normalCursor++ % normals.items.length]
  const elite = enemiesFor(floor, 'elite')[0].id
  const boss = enemiesFor(floor, 'boss')[0].id

  const rows: NodeType[][] = [floor === 1 ? ['battle'] : ['battle', 'battle']]
  for (const types of MIDDLE_ROWS) {
    const shuffled = shuffle(types, state)
    state = shuffled.rng
    rows.push(shuffled.items)
  }
  rows.push(['boss'])

  const nodes: MapNode[] = []
  rows.forEach((types, row) => {
    types.forEach((type, lane) => {
      let enemyId: string | undefined
      if (type === 'battle') enemyId = floor === 1 && row === 0 ? TUTORIAL_ENEMY : nextNormal()
      if (type === 'elite') enemyId = elite
      if (type === 'boss') enemyId = boss
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
