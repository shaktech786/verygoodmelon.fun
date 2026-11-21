'use client'

import { useState } from 'react'
import { Mode, RunLength, RunState, School } from '@/types/thought-pockets'
import { SCHOOLS } from '@/lib/games/thought-pockets/data/schools'
import { ENEMIES, enemiesFor, getEnemyDef, ruleTextAt } from '@/lib/games/thought-pockets/data/enemies'
import { getCardDef } from '@/lib/games/thought-pockets/data/cards'
import { getRelicDef } from '@/lib/games/thought-pockets/data/relics'
import { defeatLine } from '@/lib/games/thought-pockets/data/defeat'
import { MAX_RIGOR, REST_HEAL_PERCENT, RIGOR_LEVELS, rigorRules } from '@/lib/games/thought-pockets/data/pace'
import { KNOWN_UNSETTLE } from '@/lib/games/thought-pockets/engine/battle'
import { RUN_FLOORS, opensNextLevel, reconsider, reconsiderResolve } from '@/lib/games/thought-pockets/engine/run'
import { FLOOR_ROWS } from '@/lib/games/thought-pockets/engine/map'
import { useInsightStore, useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { primaryButton, quietButton } from './NodeScreens'
import { BiasPortrait } from './Sprites'
import { FLOOR_NAMES } from './MapScreen'

const GENTLE_TEXT = `Recommended. A rest waits before every philosophical problem, rests heal ${REST_HEAL_PERCENT.gentle}%, you recover fully between floors, and once per run you may reconsider a lost argument with at least half your Resolve.`
const FIRST_PROBLEMS = enemiesFor(1, 'boss').map((e) => e.name).join(' or ')
const LENGTHS: { id: RunLength; name: string; text: string }[] = [
  {
    id: 'short',
    name: 'Short walk',
    text: `${FLOOR_NAMES[1]} only: ${FLOOR_ROWS} steps, ending at ${FIRST_PROBLEMS}. One sitting.`,
  },
  {
    id: 'long',
    name: 'Long walk',
    text: `All ${RUN_FLOORS.long} floors, ${RUN_FLOORS.long * FLOOR_ROWS} steps, to The Big Questions. It saves as you go, so the end of any floor is a good place to stop.`,
  },
]
const APPEAR_STEP_MS = 160

function seedFromUrl(): number {
  const param = new URLSearchParams(window.location.search).get('seed')
  const parsed = param === null ? NaN : Number(param)
  return Number.isFinite(parsed) ? parsed : Math.floor(Math.random() * 2 ** 31)
}

function deckSummary(deck: string[]): string {
  const counts = new Map<string, number>()
  deck.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))
  return [...counts.entries()].map(([id, n]) => `${n > 1 ? `${n}× ` : ''}${getCardDef(id).name}`).join(', ')
}

function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function paceName(run: RunState): string {
  return run.mode === 'rigorous' ? `Rigorous ${run.rigor}` : 'Gentle'
}

function lengthName(length: RunLength): string {
  return LENGTHS.find((l) => l.id === length)?.name ?? ''
}

function LengthPicker({ length, onLength, firstTime, disabled }: { length: RunLength; onLength: (l: RunLength) => void; firstTime: boolean; disabled: boolean }) {
  return (
    <fieldset className="mx-auto mt-3 grid max-w-3xl gap-2 sm:grid-cols-2" disabled={disabled} data-testid="lengths">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--tp-muted)]">How long a walk</legend>
      {LENGTHS.map(({ id, name, text }) => (
        <label
          key={id}
          className={`flex cursor-pointer gap-2 rounded-md border-2 p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--tp-focus)] ${
            length === id ? 'border-[var(--tp-accent)] bg-[var(--tp-ink-2)]' : 'border-[var(--tp-line)]'
          }`}
        >
          <input type="radio" name="tp-length" value={id} checked={length === id} onChange={() => onLength(id)} className="mt-1 accent-[var(--tp-accent)]" data-testid={`length-${id}`} />
          <span>
            <span className="block font-semibold">
              {name}
              {id === 'short' && firstTime && <span className="font-normal text-[var(--tp-muted)]"> · recommended for a first run</span>}
            </span>
            <span className="block text-[var(--tp-muted)]">{text}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

/** A lost run you can still reconsider is not over yet. */
export function runInProgress(run: RunState | null): run is RunState {
  return Boolean(run && run.screen !== 'victory' && (run.screen !== 'defeat' || run.reconsiders > 0))
}

function Insights() {
  const beaten = useInsightStore((s) => s.beaten)
  return (
    <section aria-labelledby="insights-title" className="rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-4">
      <h2 id="insights-title" className="font-serif text-xl font-semibold">
        Insights <span className="text-sm font-normal text-[var(--tp-muted)]">{beaten.length} of {ENEMIES.length}</span>
      </h2>
      <p className="text-sm text-[var(--tp-muted)]">
        Win an argument against a bias and you keep what it taught you. A bias you have named before starts every later fight Unsettled {KNOWN_UNSETTLE}.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3" data-testid="insights">
        {ENEMIES.map((enemy) =>
          beaten.includes(enemy.id) ? (
            <li key={enemy.id} className="col-span-2 flex gap-2 rounded-md bg-[var(--tp-ink)] p-2 text-sm lg:col-span-1">
              <BiasPortrait enemyId={enemy.id} tier={enemy.tier} className="h-10 w-10 shrink-0" />
              <span>
                <span className="font-semibold">{enemy.name}.</span> {enemy.insight}
              </span>
            </li>
          ) : (
            <li key={enemy.id} className="rounded-md border border-dashed border-[var(--tp-line)] px-2 py-1.5 text-xs text-[var(--tp-muted)]">
              Floor {enemy.floor}: not yet met
            </li>
          ),
        )}
      </ul>
    </section>
  )
}

interface PaceProps {
  mode: Mode
  level: number
  open: number
  onMode: (m: Mode) => void
  onLevel: (l: number) => void
  disabled: boolean
}

function PacePicker({ mode, level, open, onMode, onLevel, disabled }: PaceProps) {
  const option = (id: Mode, name: string, text: string) => (
    <label
      key={id}
      className={`flex cursor-pointer gap-2 rounded-md border-2 p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--tp-focus)] ${
        mode === id ? 'border-[var(--tp-accent)] bg-[var(--tp-ink-2)]' : 'border-[var(--tp-line)]'
      }`}
    >
      <input type="radio" name="tp-mode" value={id} checked={mode === id} onChange={() => onMode(id)} className="mt-1 accent-[var(--tp-accent)]" data-testid={`mode-${id}`} />
      <span>
        <span className="block font-semibold">{name}</span>
        <span className="block text-[var(--tp-muted)]">{text}</span>
      </span>
    </label>
  )
  return (
    <fieldset className="mx-auto mt-3 grid max-w-3xl gap-2 sm:grid-cols-2" disabled={disabled}>
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--tp-muted)]">Pace</legend>
      {option('gentle', 'Gentle', GENTLE_TEXT)}
      {option('rigorous', 'Rigorous', `For when you know the rules. ${RIGOR_LEVELS.length} levels, each adding one constraint. Either walk can be played at any open level; winning a level on the Long walk opens the next.`)}
      {mode === 'rigorous' && (
        <fieldset className="rounded-md border border-[var(--tp-line)] p-3 text-sm sm:col-span-2" data-testid="rigor-levels">
          <legend className="px-1 font-semibold">Rigorous level</legend>
          <div className="flex flex-wrap gap-2">
            {RIGOR_LEVELS.map(({ level: n }) => (
              <label
                key={n}
                className={`flex min-w-11 cursor-pointer items-center justify-center gap-1 rounded-md border-2 px-3 py-1.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--tp-focus)] ${
                  level === n ? 'border-[var(--tp-accent)]' : 'border-[var(--tp-line)]'
                }`}
              >
                <input
                  type="radio"
                  name="tp-rigor"
                  value={n}
                  checked={level === n}
                  disabled={n > open}
                  onChange={() => onLevel(n)}
                  className="accent-[var(--tp-accent)]"
                  data-testid={`rigor-${n}`}
                />
                {n}
                {n > open && <span className="sr-only">, opens when you win level {n - 1}</span>}
              </label>
            ))}
          </div>
          <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[var(--tp-text)]" data-testid="rigor-rules">
            {rigorRules(level).map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
          {open < MAX_RIGOR && <p className="mt-1 text-xs text-[var(--tp-muted)]">Win level {open} on the Long walk to open level {open + 1}.</p>}
        </fieldset>
      )}
    </fieldset>
  )
}

export function MenuScreen({ run, onResume, onHelp }: { run: RunState | null; onResume: () => void; onHelp: () => void }) {
  const start = useRunStore((s) => s.start)
  const abandon = useRunStore((s) => s.abandon)
  const finishedWith = useInsightStore((s) => s.finishedWith)
  const rigorWon = useInsightStore((s) => s.rigorWon)
  const [confirming, setConfirming] = useState(false)
  const [mode, setMode] = useState<Mode>('gentle')
  const firstTime = finishedWith.length === 0
  const [length, setLength] = useState<RunLength>(firstTime ? 'short' : 'long')
  const open = Math.min(MAX_RIGOR, rigorWon + 1)
  const [chosenLevel, setLevel] = useState(open)
  const level = Math.min(chosenLevel, open)
  const inProgress = runInProgress(run)

  const begin = (school: School) => {
    start(school, seedFromUrl(), mode, mode === 'rigorous' ? level : 0, length)
    onResume()
  }

  return (
    <div className="space-y-5 text-[var(--tp-text)]">
      <header className="text-center">
        <h2 className="font-serif text-3xl font-semibold sm:text-4xl">The Philosopher</h2>
        <p className="mx-auto mt-2 max-w-xl">Each turn you build one argument from cards. Each opponent is a bias with one rule. Out-think it, and keep what it teaches.</p>
        <p className="mx-auto mt-1 max-w-xl text-sm text-[var(--tp-muted)]">
          Choose how long a walk, how gentle a pace, then a school. Every run saves as you go.
        </p>
        <button type="button" className={`${quietButton} mt-3`} onClick={onHelp}>
          How to play
        </button>
      </header>

      {inProgress && (
        <section className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-[var(--tp-accent)] bg-[var(--tp-ink-2)] p-4" aria-label="Run in progress">
          <p className="w-full text-center text-sm">
            {SCHOOLS.find((s) => s.id === run.school)?.name}, {paceName(run)}, {lengthName(run.length)}
            {run.length === 'long' && `, floor ${run.floor} of ${RUN_FLOORS.long}`}
            {run.screen === 'defeat' ? ', a lost argument you can still reconsider' : `, Resolve ${run.battle?.player.resolve ?? run.resolve}/${run.maxResolve}`}
          </p>
          <button type="button" className={primaryButton} onClick={onResume} data-testid="continue-run">
            Continue run
          </button>
          {confirming ? (
            <button
              type="button"
              className={quietButton}
              onClick={() => {
                abandon()
                setConfirming(false)
              }}
              data-testid="confirm-abandon"
            >
              Yes, abandon it
            </button>
          ) : (
            <button type="button" className={quietButton} onClick={() => setConfirming(true)} data-testid="abandon-run">
              Abandon run
            </button>
          )}
        </section>
      )}

      <section aria-labelledby="schools-title">
        <h2 id="schools-title" className="text-center font-serif text-xl font-semibold">
          {inProgress ? 'Or start again' : 'Start a walk'}
        </h2>
        <LengthPicker length={length} onLength={setLength} firstTime={firstTime} disabled={inProgress} />
        <PacePicker mode={mode} level={level} open={open} onMode={setMode} onLevel={setLevel} disabled={inProgress} />
        <p className="mx-auto mt-4 max-w-3xl text-xs font-semibold uppercase tracking-wider text-[var(--tp-muted)]">Then choose a school of thought</p>
        <ul className="mt-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCHOOLS.map((school, i) => (
            <li key={school.id}>
              <button
                type="button"
                onClick={() => begin(school.id)}
                disabled={inProgress}
                data-testid={`school-${school.id}`}
                className="flex h-full w-full flex-col gap-1 rounded-md border-2 border-[var(--tp-line)] bg-[var(--tp-paper)] p-4 text-left text-[var(--tp-paper-ink)] shadow-[3px_3px_0_0_var(--tp-shadow)] hover:border-[var(--tp-accent)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)]"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-lg font-semibold">{school.name}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--tp-paper-muted)]" data-testid="school-difficulty">
                    {i === 0 && mode === 'gentle' ? 'Start here · ' : ''}
                    {mode === 'rigorous' ? 'Rigorous: ' : ''}
                    {school.difficulty[mode]}
                    {finishedWith.includes(school.id) && ' · finished'}
                  </span>
                </span>
                <span className="text-sm">{school.tagline}</span>
                <span className="text-sm">
                  <strong>Passive:</strong> {school.passive}
                </span>
                <span className="text-xs text-[var(--tp-paper-muted)]">Starts with {deckSummary(school.deck)}.</span>
              </button>
            </li>
          ))}
        </ul>
        {inProgress && <p className="mt-2 text-center text-sm text-[var(--tp-muted)]">Abandon the current run to start a new one.</p>}
      </section>

      <Insights />
    </div>
  )
}

/** A quiet evening sky: each bias you understood this run settles into place, one after another. */
function Celebration({ run }: { run: RunState }) {
  const reduced = useReducedMotion()
  return (
    <div
      className="relative overflow-hidden rounded-md border border-[var(--tp-line)] px-3 pb-3 pt-6"
      style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--warm) 30%, var(--tp-ink)), var(--tp-ink) 70%)' }}
      aria-hidden="true"
      data-testid="celebration"
    >
      <ul className="flex flex-wrap justify-center gap-2">
        {run.beaten.map((id, i) => (
          <li key={id} className={reduced ? '' : 'tp-settle'} style={reduced ? undefined : { animationDelay: `${i * APPEAR_STEP_MS}ms` }}>
            <BiasPortrait enemyId={id} tier={getEnemyDef(id).tier} className="h-10 w-10 sm:h-12 sm:w-12" />
          </li>
        ))}
      </ul>
      <div className="mx-auto mt-4 h-1.5 w-2/3 rounded-full" style={{ background: 'color-mix(in srgb, var(--warm) 70%, transparent)' }} />
    </div>
  )
}

function RunSummary({ run }: { run: RunState }) {
  const school = SCHOOLS.find((s) => s.id === run.school)?.name
  const rows: [string, string][] = [
    ['School', `${school}, ${paceName(run)}, ${lengthName(run.length)}`],
    ['Journey', `${count(run.stats.nodes, 'place')}, ${count(run.stats.fights, 'argument')}, ${count(run.stats.turns, 'turn')}`],
    ['Best argument', `${run.stats.best} damage in one turn`],
    ['Deck', count(run.deck.length, 'card')],
    ['Relics', run.relics.length === 0 ? 'None' : run.relics.map((id) => getRelicDef(id).name).join(', ')],
  ]
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm" data-testid="run-summary">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-semibold">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EndScreen({ run, onMenu }: { run: RunState; onMenu: () => void }) {
  const abandon = useRunStore((s) => s.abandon)
  const start = useRunStore((s) => s.start)
  const act = useRunStore((s) => s.act)
  const won = run.screen === 'victory'
  const short = run.length === 'short'
  const foe = run.defeatedBy ? getEnemyDef(run.defeatedBy) : null
  const canReconsider = !won && run.reconsiders > 0 && foe !== null
  const nextLevel = opensNextLevel(run) && run.rigor < MAX_RIGOR ? run.rigor + 1 : null
  const bossId = run.map.find((n) => n.type === 'boss')?.enemyId
  const problem = bossId ? getEnemyDef(bossId).name : FIRST_PROBLEMS
  const again = (length: RunLength, level: number) => {
    const school = run.school
    abandon()
    start(school, Math.floor(Math.random() * 2 ** 31), run.mode, level, length)
  }
  return (
    <section className="space-y-4 rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-5 text-[var(--tp-text)]" aria-labelledby="end-title">
      <style>{`@keyframes tp-settle { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } @media (prefers-reduced-motion: no-preference) { html:not([data-reduce-motion="true"]) .tp-settle { animation: tp-settle 900ms ease-out both; } }`}</style>
      <div className="flex items-start gap-4">
        {foe && <BiasPortrait enemyId={foe.id} tier={foe.tier} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />}
        <div>
          <h2 id="end-title" className="font-serif text-2xl font-semibold sm:text-3xl">
            {won ? (short ? 'A short walk, well taken' : 'Every question answered, for now') : canReconsider ? 'That argument got away from you' : 'You ran out of Resolve'}
          </h2>
          {won && short ? (
            <p className="mt-2" data-testid="short-victory">
              You walked through {FLOOR_NAMES[1]} and sat with {problem} until it let you go. That is a whole walk, not part of one. When you want a longer one, the
              Long walk goes on to {FLOOR_NAMES[2]} and {FLOOR_NAMES[3]}.
            </p>
          ) : won ? (
            <p className="mt-2">You argued your way through all {RUN_FLOORS.long} floors. The questions will still be there tomorrow, and that is fine. Take a slow breath before whatever comes next.</p>
          ) : (
            <p className="mt-2">
              {foe && run.defeatRound && (
                <span className="block" data-testid="defeat-cause">
                  {defeatLine(run.defeatRound, foe)}
                </span>
              )}
              {foe && (
                <>
                  <strong>{foe.name}</strong> held its ground. Its rule: {ruleTextAt(foe, run.rigor)}{' '}
                </>
              )}
              Losing an argument is where most good thinking starts.
            </p>
          )}
        </div>
      </div>
      {won && <Celebration run={run} />}
      {nextLevel && (
        <p className="rounded-md border border-[var(--tp-accent)] p-2 text-sm" data-testid="level-open">
          Rigorous level {nextLevel} is now open: {RIGOR_LEVELS[nextLevel - 1].text}
        </p>
      )}
      {won && short && run.mode === 'rigorous' && run.rigor < MAX_RIGOR && (
        <p className="text-sm text-[var(--tp-muted)]" data-testid="level-note">
          Rigorous levels open on the Long walk: win level {run.rigor} there to open level {run.rigor + 1}.
        </p>
      )}
      {canReconsider && (
        <div className="rounded-md border-2 border-[var(--tp-accent)] p-3">
          <p className="font-semibold">Reconsider</p>
          <p className="text-sm">
            Go back to the start of this argument with {reconsiderResolve(run)} Resolve
            {reconsiderResolve(run) > run.resolve ? ` (at least half, more than the ${run.resolve} you had)` : ', what you had then'} and a fresh shuffle, knowing
            what you know now. You can do this once per run.
          </p>
          <button type="button" className={`${primaryButton} mt-2`} onClick={() => act(reconsider)} data-testid="reconsider">
            Reconsider
          </button>
        </div>
      )}
      <RunSummary run={run} />
      {run.beaten.length > 0 && (
        <div>
          <h3 className="font-semibold">{won ? 'What you understood on the way' : 'What you took from this run'}</h3>
          <ul className="mt-2 space-y-1 text-sm" data-testid="run-insights">
            {run.beaten.map((id) => (
              <li key={id}>
                <span className="font-semibold">{getEnemyDef(id).name}.</span> {getEnemyDef(id).insight}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {won && short && (
          <button type="button" className={primaryButton} onClick={() => again('long', run.rigor)} data-testid="take-long">
            Take the Long walk as {SCHOOLS.find((s) => s.id === run.school)?.name}
          </button>
        )}
        <button
          type="button"
          className={canReconsider || (won && short) ? quietButton : primaryButton}
          onClick={() => again(run.length, nextLevel ?? run.rigor)}
          data-testid="again"
        >
          {canReconsider
            ? 'Start a fresh run instead'
            : `${won && short ? 'Another Short walk' : 'Play again'} as ${SCHOOLS.find((s) => s.id === run.school)?.name}${nextLevel ? ` at level ${nextLevel}` : ''}`}
        </button>
        <button
          type="button"
          className={quietButton}
          onClick={() => {
            abandon()
            onMenu()
          }}
          data-testid="new-run"
        >
          Choose another school
        </button>
      </div>
    </section>
  )
}
