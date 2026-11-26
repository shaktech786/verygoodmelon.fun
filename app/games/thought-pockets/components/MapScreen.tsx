'use client'

import { useRef } from 'react'
import { EnemyDef, MapNode, RunState } from '@/types/thought-pockets'
import { availableNodes, bossOptions, chooseNode, fightWarning, hasHalfwayMark, holdsNothingBack, nodesAhead, recoveryOptions, restAmount, standing, studiesAtRest } from '@/lib/games/thought-pockets/engine/run'
import { fullRuleText, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { STANDING_WORDS, recoveryLine } from '@/lib/games/thought-pockets/data/mapText'
import { SHORT_WALK_BOSS } from '@/lib/games/thought-pockets/data/pace'
import { FLOOR_ROWS } from '@/lib/games/thought-pockets/engine/map'
import { useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { NODE_LABELS, NodeGlyph } from './Glyphs'
import { BiasPortrait } from './Sprites'
import { quietButton } from './NodeScreens'

export const FLOOR_NAMES = { 1: 'First Impressions', 2: 'Habits of Mind', 3: 'The Big Questions' } as const

/** Where a Long walk has reached, in words rather than a floor count. */
export const WALK_STRETCH = { 1: 'Early in the walk', 2: 'Deep in the walk', 3: 'The last stretch' } as const

/** What the problem at the end of a Short walk adds, stated from the same constants the engine uses. */
export const SHORT_WALK_BOSS_TEXT = `It ends the Short walk, so it holds nothing back: its attacks +${SHORT_WALK_BOSS.attack} and ${Math.round((SHORT_WALK_BOSS.health - 1) * 100)}% more Resolve.`

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

function position(node: MapNode): { x: number; y: number } {
  const x = node.lanes === 1 ? WIDTH / 2 : 90 + (node.lane * (WIDTH - 180)) / (node.lanes - 1)
  return { x, y: TOP + node.row * ROW_HEIGHT }
}

interface Warning {
  enemy: EnemyDef
  resolve: number
  attack: number
}

function warningText(w: Warning): string {
  return `You would face ${w.enemy.name} with ${w.resolve} Resolve${w.attack > 0 ? `, and it opens with an attack of ${w.attack}` : ''}.`
}

/** One of the floor's two problems, with every rule it plays by at this pace. */
function ProblemSummary({ enemy, run }: { enemy: EnemyDef; run: RunState }) {
  return (
    <div className="flex gap-3">
      <BiasPortrait enemyId={enemy.id} tier="boss" className="h-14 w-14 shrink-0" />
      <div className="min-w-0">
        <p className="font-body text-small font-semibold leading-tight">{enemy.name}</p>
        <p className="mt-0.5 text-meta leading-snug">{fullRuleText(enemy, run.rigor)}</p>
        {enemy.phase2 && <p className="mt-0.5 text-meta leading-snug text-[var(--tp-muted)]">At half Resolve it changes: {enemy.phase2.ruleText}</p>}
        {holdsNothingBack(run, enemy.id) && <p className="mt-0.5 text-meta leading-snug">{SHORT_WALK_BOSS_TEXT}</p>}
      </div>
    </div>
  )
}

export function MapScreen({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const choiceRef = useRef<HTMLElement>(null)
  const open = availableNodes(run)
  const openIds = new Set(open.map((n) => n.id))
  const boss = run.map.find((n) => n.type === 'boss') as MapNode
  const problems = bossOptions(run).map(getEnemyDef)
  const bossOpen = openIds.has(boss.id)
  const height = TOP * 2 + (FLOOR_ROWS - 1) * ROW_HEIGHT
  const reachable = new Set(nodesAhead(run).map((n) => n.id))
  const bossName = problems.map((p) => p.name).join(' or ')
  const name = (node: MapNode) =>
    node.type === 'boss' ? `${bossName} (boss)` : isFight(node) && node.enemyId ? `${NODE_LABELS[node.type]}: ${getEnemyDef(node.enemyId).name}` : NODE_LABELS[node.type]
  const heals = restAmount(run) > 0
  const leadsTo = (node: MapNode) => {
    const next = node.next.map((id) => run.map.find((n) => n.id === id) as MapNode).map(name)
    return next.length === 0 ? '' : `, leads to ${next.length === 1 ? next[0] : `${next.slice(0, -1).join(', ')} or ${next.at(-1)}`}`
  }
  const warningsFor = (node: MapNode): Warning[] => {
    const foes = node.type === 'boss' ? bossOptions(run) : isFight(node) && node.enemyId ? [node.enemyId] : []
    return foes.flatMap((id) => {
      const warning = fightWarning(run, id)
      return warning ? [{ enemy: getEnemyDef(id), ...warning }] : []
    })
  }
  const warnings = open.flatMap(warningsFor)
  const nodeLabel = (node: MapNode, state: string, past: boolean) => {
    const own = warningsFor(node)
    const choose = node.type === 'boss' && openIds.has(node.id) ? '. Choose which problem below the map' : ''
    return `Step ${node.row + 1}: ${name(node)}, ${state}${past ? '' : leadsTo(node)}${own.map((w) => `. ${warningText(w)}`).join('')}${choose}`
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <section aria-label="Map" className="rounded-sheet border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-3">
        <p className="mb-1 text-center text-meta text-[var(--tp-muted)]">Choose where to go next. Paths only lead forward.</p>
        {warnings.length > 0 && (
          <div className="mx-auto mb-2 max-w-[520px] rounded-stamp border-2 border-[var(--tp-warn)] bg-[var(--tp-ink)] px-3 py-2 text-meta text-[var(--tp-text)]" data-testid="fight-warning">
            <p className="font-semibold text-[var(--tp-warn)]">Low Resolve</p>
            {warnings.map((w) => (
              <p key={w.enemy.id}>{warningText(w)}</p>
            ))}
            <p className="text-[var(--tp-muted)]" data-testid="recovery">
              {recoveryLine(recoveryOptions(run))}
            </p>
          </div>
        )}
        {!heals && open.some((n) => n.type === 'elite') && (
          <p className="mx-auto mb-2 max-w-[520px] rounded-stamp border border-[var(--tp-line)] bg-[var(--tp-ink)] px-3 py-2 text-meta text-[var(--tp-text)]" data-testid="hard-fight-note">
            <strong>A hard fight is one of your next steps.</strong> At this level rests do not restore Resolve, so what it takes stays taken until tea, an
            encounter or the next floor.
          </p>
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
                    stroke={travelled || live ? 'var(--tp-mark)' : 'var(--tp-line)'}
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
              const where = standing(run, node.id)
              const state = available ? 'you can go here' : here ? 'you are here' : past ? 'visited' : where === 'ahead' ? 'further along your path' : where === 'behind' ? 'behind you' : where === 'skipped' ? 'not taken' : 'not on your path'
              const portrait = (isFight(node) || (node.type === 'boss' && (here || past))) && node.enemyId
              return (
                <li key={node.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${(100 * x) / WIDTH}%`, top: y }}>
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() =>
                      node.type === 'boss'
                        ? choiceRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
                        : act((r) => chooseNode(r, node.id))
                    }
                    aria-label={nodeLabel(node, state, past)}
                    data-testid={`node-${node.type}`}
                    data-available={available || undefined}
                    data-focus-start={(!bossOpen && node.id === open[0]?.id) || undefined}
                    className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-stamp border-2 sm:h-12 sm:w-12 ${portrait ? 'p-0.5' : ''} ${
                      available
                        ? 'cursor-pointer border-[var(--tp-mark)] bg-[var(--tp-paper)] text-[var(--tp-paper-ink)] tp-ring-mark motion-safe:hover:scale-105'
                        : here
                          ? 'border-[var(--tp-mark)] bg-[var(--tp-mark)] text-[var(--tp-on-mark)]'
                          : past
                            ? 'border-[var(--tp-mark)] bg-[var(--tp-ink)] text-[var(--tp-mark)]'
                            : 'border-[var(--tp-line)] bg-[var(--tp-ink)] text-[var(--tp-muted)]'
                    } focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)]`}
                  >
                    {portrait ? (
                      <BiasPortrait enemyId={node.enemyId as string} tier={getEnemyDef(node.enemyId as string).tier} className="h-full w-full" />
                    ) : (
                      <NodeGlyph type={node.type} className="h-6 w-6" />
                    )}
                  </button>
                  <span className={`mt-0.5 whitespace-nowrap text-[0.7rem] sm:text-meta ${available ? 'font-semibold text-[var(--tp-text)]' : 'text-[var(--tp-muted)]'}`} aria-hidden="true">
                    {node.type === 'boss' ? 'Boss: one of two' : NODE_LABELS[node.type]}
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
        {bossOpen && (
          <section ref={choiceRef} aria-labelledby="boss-choice-title" className="mx-auto mt-3 max-w-[520px] rounded-stamp border-2 border-[var(--tp-mark)] bg-[var(--tp-ink)] p-3 text-[var(--tp-text)]" data-testid="boss-choice">
            <h2 id="boss-choice-title" className="font-body text-body font-semibold">
              Two problems wait. Choose which to sit with.
            </h2>
            <ul className="mt-2 space-y-3">
              {problems.map((problem, i) => (
                <li key={problem.id} className="rounded-stamp border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-2.5">
                  <ProblemSummary enemy={problem} run={run} />
                  <button
                    type="button"
                    className={`${quietButton} mt-2 w-full sm:w-auto`}
                    onClick={() => act((r) => chooseNode(r, boss.id, problem.id))}
                    data-testid={`face-${problem.id}`}
                    data-focus-start={i === 0 || undefined}
                  >
                    Face {problem.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
      <aside className="space-y-3 text-meta text-[var(--tp-text)]">
        {!bossOpen && (
          <section aria-labelledby="floor-problems" className="space-y-2.5 rounded-sheet border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-3" data-testid="floor-problems">
            <h2 id="floor-problems" className="text-meta text-[var(--tp-muted)]">
              At the end of this floor: one of two problems, your choice when you reach it
            </h2>
            {problems.map((problem) => (
              <ProblemSummary key={problem.id} enemy={problem} run={run} />
            ))}
          </section>
        )}
        <section aria-labelledby="floor-biases" className="rounded-sheet border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-3">
          <h2 id="floor-biases" className="text-meta text-[var(--tp-muted)]">
            Biases on this floor
          </h2>
          <ul className="mt-1.5 space-y-2" data-testid="floor-biases">
            {fightsOnFloor(run).map((node) => {
              const foe = getEnemyDef(node.enemyId as string)
              const where = standing(run, node.id)
              return (
                <li key={node.id} className="flex gap-2">
                  <BiasPortrait enemyId={foe.id} tier={foe.tier} className={`h-9 w-9 shrink-0 ${reachable.has(node.id) ? '' : 'opacity-50'}`} />
                  <p className="text-meta leading-snug">
                    <span className="font-semibold">
                      Step {node.row + 1}, {NODE_LABELS[node.type].toLowerCase()}: {foe.name}.
                    </span>{' '}
                    {fullRuleText(foe, run.rigor, hasHalfwayMark(run, foe.id))}
                    {where !== 'ahead' && (
                      <span className="text-[var(--tp-muted)]" data-testid="bias-standing">
                        {' '}
                        {STANDING_WORDS[where]}
                      </span>
                    )}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 rounded-sheet border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-3 text-meta leading-snug">
          <dt className="font-semibold">Fight</dt>
          <dd>A bias. Win a card.</dd>
          <dt className="font-semibold">Hard fight</dt>
          <dd>Tougher. Win a relic and a better card.</dd>
          <dt className="font-semibold">Rest</dt>
          <dd data-testid="rest-legend">
            {studiesAtRest(run) && 'First, one card to build on, or none. Then '}
            {heals
              ? `${studiesAtRest(run) ? 'r' : 'R'}ecover Resolve, improve one card, or let one go.`
              : `${studiesAtRest(run) ? 'i' : 'I'}mprove one card, or let one go. At this level it does not restore Resolve.`}
          </dd>
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
