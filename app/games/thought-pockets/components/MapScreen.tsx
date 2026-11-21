'use client'

import { MapNode, RunState } from '@/types/thought-pockets'
import { availableNodes, chooseNode } from '@/lib/games/thought-pockets/engine/run'
import { getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { FLOOR_ROWS } from '@/lib/games/thought-pockets/engine/map'
import { useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { NODE_LABELS, NodeGlyph } from './Glyphs'
import { BiasPortrait } from './Sprites'

export const FLOOR_NAMES = { 1: 'First Impressions', 2: 'Habits of Mind', 3: 'The Big Questions' } as const

const WIDTH = 520
const ROW_HEIGHT = 92
const TOP = 46

function position(node: MapNode): { x: number; y: number } {
  const x = node.lanes === 1 ? WIDTH / 2 : 90 + (node.lane * (WIDTH - 180)) / (node.lanes - 1)
  return { x, y: TOP + node.row * ROW_HEIGHT }
}

export function MapScreen({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const open = availableNodes(run)
  const openIds = new Set(open.map((n) => n.id))
  const boss = run.map.find((n) => n.type === 'boss') as MapNode
  const bossDef = getEnemyDef(boss.enemyId as string)
  const height = TOP * 2 + (FLOOR_ROWS - 1) * ROW_HEIGHT

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <section aria-label="Map" className="rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-3">
        <p className="mb-1 text-center text-sm text-[var(--tp-muted)]">Choose where to go next. Paths only lead forward.</p>
        <div className="relative mx-auto w-full max-w-[520px]" style={{ height }}>
          <svg viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {run.map.flatMap((node) =>
              node.next.map((targetId) => {
                const target = run.map.find((n) => n.id === targetId) as MapNode
                const a = position(node)
                const b = position(target)
                const travelled = run.visited.includes(node.id) && run.visited.includes(targetId)
                const live = node.id === run.position && openIds.has(targetId)
                return (
                  <line
                    key={`${node.id}-${targetId}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={travelled || live ?'var(--tp-accent)' : 'var(--tp-line)'}
                    strokeWidth={travelled || live ? 3 : 2}
                  />
                )
              }),
            )}
          </svg>
          <ol className="absolute inset-0" aria-label="Places on this floor, from start to boss">
            {run.map.map((node) => {
              const { x, y } = position(node)
              const available = openIds.has(node.id)
              const here = node.id === run.position
              const past = run.visited.includes(node.id) && !here
              const label = node.type === 'boss' ? bossDef.name : NODE_LABELS[node.type]
              const state = available ? 'you can go here' : here ? 'you are here' : past ? 'visited' : 'not reachable from here'
              return (
                <li key={node.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${(100 * x) / WIDTH}%`, top: y }}>
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() => act((r) => chooseNode(r, node.id))}
                    aria-label={`Step ${node.row + 1}: ${label}, ${state}`}
                    data-testid={`node-${node.type}`}
                    data-available={available || undefined}
                    className={`flex h-11 w-11 items-center justify-center rounded-md border-2 sm:h-12 sm:w-12 ${
                      available
                        ? 'cursor-pointer border-[var(--tp-accent)] bg-[var(--tp-paper)] text-[var(--tp-paper-ink)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--tp-accent)_25%,transparent)] motion-safe:hover:scale-105'
                        : here
                          ? 'border-[var(--tp-accent)] bg-[var(--tp-accent)] text-[var(--tp-on-accent)]'
                          : past
                            ? 'border-[var(--tp-accent)] bg-[var(--tp-ink)] text-[var(--tp-accent)]'
                            : 'border-[var(--tp-line)] bg-[var(--tp-ink)] text-[var(--tp-muted)]'
                    } focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)]`}
                  >
                    <NodeGlyph type={node.type} className="h-6 w-6" />
                  </button>
                  <span className={`mt-0.5 whitespace-nowrap text-[0.7rem] sm:text-xs ${available ? 'font-semibold text-[var(--tp-text)]' : 'text-[var(--tp-muted)]'}`} aria-hidden="true">
                    {node.type === 'boss' ? 'Boss' : NODE_LABELS[node.type]}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
      <aside className="space-y-3 text-sm text-[var(--tp-text)]">
        <div className="flex gap-3 rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-3">
          <BiasPortrait enemyId={bossDef.id} tier="boss" className="h-16 w-16 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--tp-muted)]">Waiting at the end of this floor</p>
            <p className="font-serif text-lg font-semibold">{bossDef.name}</p>
            <p className="mt-1 leading-snug">{bossDef.ruleText}</p>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-3 text-xs leading-snug">
          <dt className="font-semibold">Fight</dt>
          <dd>A bias. Win a card.</dd>
          <dt className="font-semibold">Hard fight</dt>
          <dd>Tougher. Win a relic and a better card.</dd>
          <dt className="font-semibold">Rest</dt>
          <dd>Recover Resolve, or improve one card.</dd>
          <dt className="font-semibold">Shop</dt>
          <dd>Spend gold on cards, relics, or removing a card.</dd>
          <dt className="font-semibold">Encounter</dt>
          <dd>A choice with a cost.</dd>
          <dt className="font-semibold">Treasure</dt>
          <dd>Choose a relic.</dd>
        </dl>
      </aside>
    </div>
  )
}
