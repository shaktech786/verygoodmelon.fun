'use client'

import { useState } from 'react'
import { Mode, RunLength, RunState, School } from '@/types/thought-pockets'
import { SCHOOLS, schoolDifficulty } from '@/lib/games/thought-pockets/data/schools'
import { ENEMIES, SHORT_WALK_PROBLEMS, getEnemyDef, ruleTextAt } from '@/lib/games/thought-pockets/data/enemies'
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
import { FLOOR_NAMES, WALK_STRETCH } from './MapScreen'
import { WalkArgument } from './WalkArgument'

const GENTLE_TEXT = `Recommended. A rest waits before every philosophical problem, rests heal ${REST_HEAL_PERCENT.gentle}%, you recover fully between floors, and once per run you may reconsider a lost argument with at least half your Resolve.`
const SHORT_PROBLEMS = SHORT_WALK_PROBLEMS.map((id) => getEnemyDef(id).name)
const LENGTHS: { id: RunLength; name: string; text: string }[] = [
  {
    id: 'short',
    name: 'Short walk',
    text: `${FLOOR_NAMES[1]} only: ${FLOOR_ROWS} steps, ending at your choice of two problems drawn from ${SHORT_PROBLEMS.slice(0, -1).join(', ')} and ${SHORT_PROBLEMS.at(-1)}. Nothing comes after it, so it holds nothing back. One sitting.`,
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

export function paceName(run: RunState): string {
  return run.mode === 'rigorous' ? `Rigorous ${run.rigor}` : 'Gentle'
}

function lengthName(length: RunLength): string {
  return LENGTHS.find((l) => l.id === length)?.name ?? ''
}

function LengthPicker({ length, onLength, firstTime, disabled }: { length: RunLength; onLength: (l: RunLength) => void; firstTime: boolean; disabled: boolean }) {
  return (
    <fieldset className="mx-auto mt-3 grid max-w-3xl gap-2 sm:grid-cols-2" disabled={disabled} data-testid="lengths">
      <legend className="mb-1 text-meta font-semibold text-[var(--tp-muted)]">How long a walk</legend>
      {LENGTHS.map(({ id, name, text }) => (
        <label
          key={id}
          className={`flex cursor-pointer gap-2 rounded-stamp border-2 p-3 text-meta has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--tp-focus)] ${
 length === id ? 'border-[var(--tp-good)] bg-[var(--tp-ink-2)]' : 'border-[var(--tp-line)]'
          }`}
        >
          <input type="radio" name="tp-length" value={id} checked={length === id} onChange={() => onLength(id)} className="mt-1 accent-[var(--tp-good)]" data-testid={`length-${id}`} />
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
  // Only what the player has met, in words: no empty slots waiting to be filled in
  const met = ENEMIES.filter((enemy) => beaten.includes(enemy.id))
  return (
    <section aria-labelledby="insights-title" className="rounded-sheet border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-4" data-testid="insights">
      <h2 id="insights-title" className="font-body text-lead font-semibold">
        Insights
      </h2>
      <p className="text-meta text-[var(--tp-muted)]">
        Win an argument against a bias and you keep what it taught you. A bias you have named before starts every later fight Unsettled {KNOWN_UNSETTLE}.
      </p>
      {met.length === 0 ? (
        <p className="mt-3 text-meta">Nothing kept yet. What the first bias teaches you will wait here.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {met.map((enemy) => (
            <li key={enemy.id} className="flex gap-2 rounded-stamp bg-[var(--tp-ink)] p-2 text-meta">
              <BiasPortrait enemyId={enemy.id} tier={enemy.tier} className="h-10 w-10 shrink-0" />
              <span>
                <span className="font-semibold">{enemy.name}.</span> {enemy.insight}
              </span>
            </li>
          ))}
        </ul>
      )}
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
      className={`flex cursor-pointer gap-2 rounded-stamp border-2 p-3 text-meta has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--tp-focus)] ${
 mode === id ? 'border-[var(--tp-good)] bg-[var(--tp-ink-2)]' : 'border-[var(--tp-line)]'
      }`}
    >
      <input type="radio" name="tp-mode" value={id} checked={mode === id} onChange={() => onMode(id)} className="mt-1 accent-[var(--tp-good)]" data-testid={`mode-${id}`} />
      <span>
        <span className="block font-semibold">{name}</span>
        <span className="block text-[var(--tp-muted)]">{text}</span>
      </span>
    </label>
  )
  return (
    <fieldset className="mx-auto mt-3 grid max-w-3xl gap-2 sm:grid-cols-2" disabled={disabled}>
      <legend className="mb-1 text-meta font-semibold text-[var(--tp-muted)]">Pace</legend>
      {option('gentle', 'Gentle', GENTLE_TEXT)}
      {option('rigorous', 'Rigorous', `For when you know the rules. ${RIGOR_LEVELS.length} levels, each adding one constraint. Either walk can be played at any open level; winning a level on the Long walk opens the next.`)}
      {mode === 'rigorous' && (
        <fieldset className="rounded-stamp border border-[var(--tp-line)] p-3 text-meta sm:col-span-2" data-testid="rigor-levels">
          <legend className="px-1 font-semibold">Rigorous level</legend>
          <div className="flex flex-wrap gap-2">
            {RIGOR_LEVELS.map(({ level: n }) => (
              <label
                key={n}
                className={`flex min-w-11 cursor-pointer items-center justify-center gap-1 rounded-stamp border-2 px-3 py-1.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--tp-focus)] ${
 level === n ? 'border-[var(--tp-good)]' : 'border-[var(--tp-line)]'
                }`}
              >
                <input
                  type="radio"
                  name="tp-rigor"
                  value={n}
                  checked={level === n}
                  disabled={n > open}
                  onChange={() => onLevel(n)}
                  className="accent-[var(--tp-good)]"
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
          {open < MAX_RIGOR && <p className="mt-1 text-meta text-[var(--tp-muted)]">Win level {open} on the Long walk to open level {open + 1}.</p>}
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
  const tutorialDone = useInsightStore((s) => s.tutorialDone)
  const [confirming, setConfirming] = useState(false)
  const [mode, setMode] = useState<Mode>('gentle')
  const firstTime = finishedWith.length === 0
  const [length, setLength] = useState<RunLength>(firstTime ? 'short' : 'long')
  const open = Math.min(MAX_RIGOR, rigorWon + 1)
  const [chosenLevel, setLevel] = useState(open)
  const level = Math.min(chosenLevel, open)
  const inProgress = runInProgress(run)
  // Someone who has never won a fight gets one clear way in; every choice is still a click away.
  const firstRun = !inProgress && !tutorialDone && firstTime && rigorWon === 0

  const begin = (school: School) => {
    start(school, seedFromUrl(), mode, mode === 'rigorous' ? level : 0, length)
    onResume()
  }

  const beginGently = () => {
    start(SCHOOLS[0].id, seedFromUrl(), 'gentle', 0, 'short')
    onResume()
  }

  const choices = (
    <>
      <LengthPicker length={length} onLength={setLength} firstTime={firstTime} disabled={inProgress} />
      <PacePicker mode={mode} level={level} open={open} onMode={setMode} onLevel={setLevel} disabled={inProgress} />
      <p className="mx-auto mt-4 max-w-3xl text-meta font-semibold text-[var(--tp-muted)]">Then choose a school of thought</p>
      <ul className="mt-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SCHOOLS.map((school, i) => (
          <li key={school.id}>
            <button
              type="button"
              onClick={() => begin(school.id)}
              disabled={inProgress}
              data-testid={`school-${school.id}`}
              className="flex h-full w-full flex-col gap-1 rounded-stamp border-2 border-[var(--tp-line)] bg-[var(--tp-paper)] p-4 text-left text-[var(--tp-paper-ink)] tp-edge hover:border-[var(--tp-mark)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)]"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-body text-body font-semibold">{school.name}</span>
                <span className="text-meta font-semibold text-[var(--tp-paper-muted)]" data-testid="school-difficulty">
                  {i === 0 && mode === 'gentle' ? 'Start here · ' : ''}
                  {mode === 'rigorous' ? `Rigorous ${level}: ` : ''}
                  {schoolDifficulty(school, mode, level)}
                </span>
              </span>
              <span className="text-meta">{school.tagline}</span>
              <span className="text-meta">
                <strong>Passive:</strong> {school.passive}
              </span>
              <span className="text-meta text-[var(--tp-paper-muted)]">Starts with {deckSummary(school.deck)}.</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )

  if (firstRun) {
    return (
      <div className="space-y-5 text-[var(--tp-text)]">
        <header className="text-center">
          <h2 className="font-display text-h2 font-semibold">The Philosopher</h2>
          <p className="mx-auto mt-2 max-w-xl">Each turn you build one argument from cards. Each opponent is a bias with one rule. Out-think it, and keep what it teaches.</p>
        </header>
        <section aria-labelledby="first-walk-title" className="mx-auto max-w-xl rounded-sheet border border-[var(--tp-good)] bg-[var(--tp-ink-2)] p-5 text-center" data-testid="first-walk">
          <h2 id="first-walk-title" className="font-body text-lead font-semibold">
            Start here
          </h2>
          <p className="mt-2 text-meta text-[var(--tp-muted)]">
            A Short walk at a Gentle pace, thinking as the {SCHOOLS[0].name}: {SCHOOLS[0].tagline} The first fight explains itself as you go, and the walk saves as you play.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button data-go="" type="button" className={primaryButton} onClick={beginGently} data-testid="begin-gentle">
              Begin a short, gentle walk
            </button>
            <button type="button" className={quietButton} onClick={onHelp}>
              How to play
            </button>
          </div>
        </section>
        <details className="group mx-auto max-w-5xl" data-testid="more-choices">
          <summary className="mx-auto w-fit cursor-pointer rounded-stamp px-3 py-1.5 text-meta font-semibold text-[var(--tp-text)] underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)]">
            More choices
            <span className="font-normal text-[var(--tp-muted)]"> · walk length, pace and school</span>
          </summary>
          {choices}
        </details>
      </div>
    )
  }

  return (
    <div className="space-y-5 text-[var(--tp-text)]">
      <header className="text-center">
        <h2 className="font-display text-h2 font-semibold">The Philosopher</h2>
        <p className="mx-auto mt-2 max-w-xl">Each turn you build one argument from cards. Each opponent is a bias with one rule. Out-think it, and keep what it teaches.</p>
        <p className="mx-auto mt-1 max-w-xl text-meta text-[var(--tp-muted)]">
          Choose how long a walk, how gentle a pace, then a school. Every run saves as you go.
        </p>
        <button type="button" className={`${quietButton} mt-3`} onClick={onHelp}>
          How to play
        </button>
      </header>

      {inProgress && (
        <section className="flex flex-wrap items-center justify-center gap-3 rounded-sheet border border-[var(--tp-mark)] bg-[var(--tp-ink-2)] p-4" aria-label="Run in progress">
          <p className="w-full text-center text-meta">
            {SCHOOLS.find((s) => s.id === run.school)?.name}, {paceName(run)}, {lengthName(run.length)}
            {run.length === 'long' && `, ${WALK_STRETCH[run.floor].toLowerCase()}`}
            {run.screen === 'defeat' ? ', a lost argument you can still reconsider' : `, Resolve ${run.battle?.player.resolve ?? run.resolve}/${run.maxResolve}`}
          </p>
          <button data-go="" type="button" className={primaryButton} onClick={onResume} data-testid="continue-run">
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
        <h2 id="schools-title" className="text-center font-body text-lead font-semibold">
          {inProgress ? 'Or start again' : 'Start a walk'}
        </h2>
        {choices}
        {inProgress && <p className="mt-2 text-center text-meta text-[var(--tp-muted)]">Abandon the current run to start a new one.</p>}
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
      className="relative overflow-hidden rounded-stamp border border-[var(--tp-line)] px-3 pb-3 pt-6"
      style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--clay) 30%, var(--tp-ink)), var(--tp-ink) 70%)' }}
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
      <div className="mx-auto mt-4 h-1.5 w-2/3 rounded-full" style={{ background: 'color-mix(in srgb, var(--clay) 70%, transparent)' }} />
    </div>
  )
}

function inWords(items: string[]): string {
  return items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

/** The walk's best turn retold as a moment, not a figure: the cards that landed and who they landed on. */
function strongestMoment(run: RunState): string {
  const best = run.bestArgument
  if (!best) return 'Still to come'
  const cards = [...new Set(best.round.steps.map((step) => step.name))]
  return `The turn ${inWords(cards)} came together against ${getEnemyDef(best.enemyId).name}`
}

/** The walk retold in words: who you met, how you walked, and the moment it all clicked. */
function RunSummary({ run }: { run: RunState }) {
  const school = SCHOOLS.find((s) => s.id === run.school)?.name
  const named = run.beaten.map((id) => getEnemyDef(id).name)
  const rows: [string, string][] = [
    ['School', `${school}, ${paceName(run)}, ${lengthName(run.length)}`],
    ['Biases named', named.length === 0 ? 'None yet, and that is part of the walk too' : inWords(named)],
    ['Strongest moment', strongestMoment(run)],
    ['Relics', run.relics.length === 0 ? 'None' : run.relics.map((id) => getRelicDef(id).name).join(', ')],
  ]
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-meta" data-testid="run-summary">
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
  const problem = getEnemyDef(run.map.find((n) => n.type === 'boss')?.enemyId as string).name
  const again = (length: RunLength, level: number) => {
    const school = run.school
    abandon()
    start(school, Math.floor(Math.random() * 2 ** 31), run.mode, level, length)
  }
  return (
    <section className="space-y-4 rounded-sheet border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-5 text-[var(--tp-text)]" aria-labelledby="end-title">
      <style>{`@keyframes tp-settle { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } @media (prefers-reduced-motion: no-preference) { html:not([data-reduce-motion="true"]):not([data-sense="quiet"]) .tp-settle { animation: tp-settle 900ms ease-out both; } }`}</style>
      <div className="flex items-start gap-4">
        {foe && <BiasPortrait enemyId={foe.id} tier={foe.tier} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />}
        <div>
          <h2 id="end-title" className="font-display text-h3 font-semibold sm:text-h2">
            {won ? (short ? 'A short walk, well taken' : 'Every question answered, for now') : canReconsider ? 'That argument got away from you' : 'You ran out of Resolve'}
          </h2>
          {won && short ? (
            <p className="mt-2" data-testid="short-victory">
              You walked through {FLOOR_NAMES[1]} and sat with {problem} until it let you go. That is a whole walk, not part of one. When you want a longer one, the
              Long walk goes on to {FLOOR_NAMES[2]} and {FLOOR_NAMES[3]}.
            </p>
          ) : won ? (
            <p className="mt-2">You argued your way through every floor of the walk. The questions will still be there tomorrow, and that is fine. Take a slow breath before whatever comes next.</p>
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
      {won && <WalkArgument run={run} />}
      {nextLevel && (
        <p className="rounded-stamp border border-[var(--tp-mark)] p-2 text-meta" data-testid="level-open">
          Rigorous level {nextLevel} is now open: {RIGOR_LEVELS[nextLevel - 1].text}
        </p>
      )}
      {won && short && run.mode === 'rigorous' && run.rigor < MAX_RIGOR && (
        <p className="text-meta text-[var(--tp-muted)]" data-testid="level-note">
          Rigorous levels open on the Long walk: win level {run.rigor} there to open level {run.rigor + 1}.
        </p>
      )}
      {canReconsider && (
        <div className="rounded-stamp border-2 border-[var(--tp-mark)] p-3">
          <p className="font-semibold">Reconsider</p>
          <p className="text-meta">
            Go back to the start of this argument with {reconsiderResolve(run)} Resolve
            {reconsiderResolve(run) > run.resolve ? ` (at least half, more than the ${run.resolve} you had)` : ', what you had then'} and a fresh shuffle, knowing
            what you know now. You can do this once per run.
          </p>
          <button type="button" className={`${primaryButton} mt-2`} data-go="" onClick={() => act(reconsider)} data-testid="reconsider">
            Reconsider
          </button>
        </div>
      )}
      <RunSummary run={run} />
      {run.beaten.length > 0 && (
        <div>
          <h3 className="font-semibold">{won ? 'What you understood on the way' : 'What you took from this run'}</h3>
          <ul className="mt-2 space-y-1 text-meta" data-testid="run-insights">
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
          <button type="button" className={canReconsider ? quietButton : primaryButton} data-go={canReconsider ? undefined : ''} onClick={() => again('long', run.rigor)} data-testid="take-long">
            Take the Long walk as {SCHOOLS.find((s) => s.id === run.school)?.name}
          </button>
        )}
        <button
          type="button"
          className={canReconsider || (won && short) ? quietButton : primaryButton}
          data-go={canReconsider || (won && short) ? undefined : ''}
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
