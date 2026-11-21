'use client'

import { MapNode, RunState } from '@/types/thought-pockets'
import { availableNodes, chooseNode, fightWarning, restAmount } from '@/lib/games/thought-pockets/engine/run'
import { getEnemyDef, ruleTextAt } from '@/lib/games/thought-pockets/data/enemies'
import { FLOOR_ROWS } from '@/lib/games/thought-pockets/engine/map'
import { useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { NODE_LABELS, NodeGlyph } from './Glyphs'
import { BiasPortrait } from './Sprites'

export const FLOOR_NAMES = { 1: 'First Impressions', 2: 'Habits of Mind', 3: 'The Big Questions' } as const

const WIDTH = 520
const ROW_HEIGHT = 92
const TOP = 46

function isFight(node: MapNode): boolean {
  return node.type === 'battle' || node.type === 'elite'
}

/** Every bias you could meet before the boss, in map order, so a route can be chosen by who waits on it. */
function fightsOnFloor(run: RunState): MapNode[] {
  return run.map.filter(isFight).sort((a, b) => a.row - b.row || a.lane - b.lane)
}

/** Everything still ahead of you: what the next steps lead to, as far as the boss. */
function ahead(run: RunState): Set<string> {
  const byId = new Map(run.map.map((n) => [n.id, n]))
  const start = run.position === null ? run.map.filter((n) => n.row === 0).map((n) => n.id) : byId.get(run.position)?.next ?? []
  const found = new Set<string>()
  const queue = [...start]
  while (queue.length > 0) {
    const id = queue.shift() as string
    if (found.has(id)) continue
    found.add(id)
    queue.push(...(byId.get(id)?.next ?? []))
  }
  return found
}

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
  const reachable = ahead(run)
  const name = (node: MapNode) =>
    node.type === 'boss' ? `${bossDef.name} (boss)` : isFight(node) && node.enemyId ? `${NODE_LABELS[node.type]}: ${getEnemyDef(node.enemyId).name}` : NODE_LABELS[node.type]
  const heals = restAmount(run) > 0
  const leadsTo = (node: MapNode) => {
    const next = node.next.map((id) => run.map.find((n) => n.id === id) as MapNode).map(name)
    return next.length === 0 ? '' : `, leads to ${next.length === 1 ? next[0] : `${next.slice(0, -1).join(', ')} or ${next.at(-1)}`}`
  }
  const warnings = open.flatMap((node) => {
    const warning = fightWarning(run, node)
    return warning ? [{ node, ...warning }] : []
  })
  const warningText = (w: (typeof warnings)[number]) =>
    `You would face ${getEnemyDef(w.node.enemyId as string).name} with ${w.resolve} Resolve${w.attack > 0 ? `, and it opens with an attack of ${w.attack}` : ''}.`
  const calmAhead = open.some((n) => n.type === 'rest' || n.type === 'shop')

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <section aria-label="Map" className="rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-3">
        <p className="mb-1 text-center text-sm text-[var(--tp-muted)]">Choose where to go next. Paths only lead forward.</p>
        {warnings.length > 0 && (
          <div className="mx-auto mb-2 max-w-[520px] rounded-md border-2 border-[var(--tp-warn)] bg-[var(--tp-ink)] px-3 py-2 text-sm text-[var(--tp-text)]" data-testid="fight-warning">
            <p className="font-semibold text-[var(--tp-warn)]">Low Resolve</p>
            {warnings.map((w) => (
              <p key={w.node.id}>{warningText(w)}</p>
            ))}
            <p className="text-[var(--tp-muted)]">
              {calmAhead ? 'A rest or the shop’s tea is one of your choices now.' : 'Unspent Focus becomes Guard, so holding back is a real defence.'}
            </p>
          </div>
        )}
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
              const state = available ? 'you can go here' : here ? 'you are here' : past ? 'visited' : reachable.has(node.id) ? 'further along your path' : 'not on your path'
              return (
                <li key={node.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${(100 * x) / WIDTH}%`, top: y }}>
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() => act((r) => chooseNode(r, node.id))}
                    aria-label={`Step ${node.row + 1}: ${name(node)}, ${state}${past ? '' : leadsTo(node)}${warnings.some((w) => w.node.id === node.id) ? `. ${warningText(warnings.find((w) => w.node.id === node.id) as (typeof warnings)[number])}` : ''}`}
                    data-testid={`node-${node.type}`}
                    data-available={available || undefined}
                    data-focus-start={node.id === open[0]?.id || undefined}
                    className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-md border-2 sm:h-12 sm:w-12 ${isFight(node) ? 'p-0.5' : ''} ${
                      available
                        ? 'cursor-pointer border-[var(--tp-accent)] bg-[var(--tp-paper)] text-[var(--tp-paper-ink)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--tp-accent)_25%,transparent)] motion-safe:hover:scale-105'
                        : here
                          ? 'border-[var(--tp-accent)] bg-[var(--tp-accent)] text-[var(--tp-on-accent)]'
                          : past
                            ? 'border-[var(--tp-accent)] bg-[var(--tp-ink)] text-[var(--tp-accent)]'
                            : 'border-[var(--tp-line)] bg-[var(--tp-ink)] text-[var(--tp-muted)]'
                    } focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)]`}
                  >
                    {isFight(node) && node.enemyId ? (
                      <BiasPortrait enemyId={node.enemyId} tier={getEnemyDef(node.enemyId).tier} className="h-full w-full" />
                    ) : (
                      <NodeGlyph type={node.type} className="h-6 w-6" />
                    )}
                  </button>
                  <span className={`mt-0.5 whitespace-nowrap text-[0.7rem] sm:text-xs ${available ? 'font-semibold text-[var(--tp-text)]' : 'text-[var(--tp-muted)]'}`} aria-hidden="true">
                    {node.type === 'boss' ? 'Boss' : NODE_LABELS[node.type]}
                  </span>
                  {isFight(node) && node.enemyId && (
                    <span className="max-w-[6.5rem] text-center text-[0.65rem] leading-tight text-[var(--tp-text)] sm:text-[0.7rem]" aria-hidden="true" data-testid="node-bias">
                      {getEnemyDef(node.enemyId).name}
                    </span>
                  )}
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
            <p className="mt-1 leading-snug">{ruleTextAt(bossDef, run.rigor)}</p>
          </div>
        </div>
        <section aria-labelledby="floor-biases" className="rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-3">
          <h2 id="floor-biases" className="text-xs uppercase tracking-wider text-[var(--tp-muted)]">
            Biases on this floor
          </h2>
          <ul className="mt-1.5 space-y-2" data-testid="floor-biases">
            {fightsOnFloor(run).map((node) => {
              const foe = getEnemyDef(node.enemyId as string)
              return (
                <li key={node.id} className={`flex gap-2 ${reachable.has(node.id) ? '' : 'opacity-60'}`}>
                  <BiasPortrait enemyId={foe.id} tier={foe.tier} className="h-9 w-9 shrink-0" />
                  <p className="text-xs leading-snug">
                    <span className="font-semibold">
                      Step {node.row + 1}, {NODE_LABELS[node.type].toLowerCase()}: {foe.name}.
                    </span>{' '}
                    {ruleTextAt(foe, run.rigor)}
                    {!reachable.has(node.id) && <span className="text-[var(--tp-muted)]"> Not on your path.</span>}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-3 text-xs leading-snug">
          <dt className="font-semibold">Fight</dt>
          <dd>A bias. Win a card.</dd>
          <dt className="font-semibold">Hard fight</dt>
          <dd>Tougher. Win a relic and a better card.</dd>
          <dt className="font-semibold">Rest</dt>
          <dd>{heals ? 'Recover Resolve, improve one card, or let one go.' : 'Improve one card, or let one go. At this level it does not restore Resolve.'}</dd>
          <dt className="font-semibold">Shop</dt>
          <dd>Spend gold on cards, relics, tea, or removing a card.</dd>
          <dt className="font-semibold">Encounter</dt>
          <dd>A choice with a cost.</dd>
          <dt className="font-semibold">Treasure</dt>
          <dd>Choose a relic.</dd>
        </dl>
      </aside>
    </div>
  )
}
