'use client'

import { useState } from 'react'
import { Mode, RunState, School } from '@/types/thought-pockets'
import { SCHOOLS } from '@/lib/games/thought-pockets/data/schools'
import { ENEMIES, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { getCardDef } from '@/lib/games/thought-pockets/data/cards'
import { KNOWN_UNSETTLE, RIGOROUS_ATTACK, RIGOROUS_HEALTH } from '@/lib/games/thought-pockets/engine/battle'
import { reconsider } from '@/lib/games/thought-pockets/engine/run'
import { useInsightStore, useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { primaryButton, quietButton } from './NodeScreens'
import { BiasPortrait } from './Sprites'

const MODES: { id: Mode; name: string; text: string }[] = [
  { id: 'gentle', name: 'Gentle', text: 'Recommended. Once per run you may reconsider a lost argument, and you recover fully between floors.' },
  {
    id: 'rigorous',
    name: 'Rigorous',
    text: `For when you know the rules: biases have ${Math.round((RIGOROUS_HEALTH - 1) * 100)}% more Resolve and hit ${RIGOROUS_ATTACK} harder, and there is no second chance.`,
  },
]

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

export function MenuScreen({ run, onResume, onHelp }: { run: RunState | null; onResume: () => void; onHelp: () => void }) {
  const start = useRunStore((s) => s.start)
  const abandon = useRunStore((s) => s.abandon)
  const finishedWith = useInsightStore((s) => s.finishedWith)
  const [confirming, setConfirming] = useState(false)
  const [mode, setMode] = useState<Mode>('gentle')
  const inProgress = runInProgress(run)

  const begin = (school: School) => {
    start(school, seedFromUrl(), mode)
    onResume()
  }

  return (
    <div className="space-y-5 text-[var(--tp-text)]">
      <header className="text-center">
        <h2 className="font-serif text-3xl font-semibold sm:text-4xl">The Philosopher</h2>
        <p className="mx-auto mt-2 max-w-xl">Each turn you build one argument from cards. Each opponent is a bias with one rule. Out-think it, and keep what it teaches.</p>
        <button type="button" className={`${quietButton} mt-3`} onClick={onHelp}>
          How to play
        </button>
      </header>

      {inProgress && (
        <section className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-[var(--tp-accent)] bg-[var(--tp-ink-2)] p-4" aria-label="Run in progress">
          <p className="w-full text-center text-sm">
            {SCHOOLS.find((s) => s.id === run.school)?.name}, {run.mode === 'rigorous' ? 'rigorous, ' : ''}floor {run.floor} of 3
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
          {inProgress ? 'Or start again as' : 'Choose a school of thought'}
        </h2>
        <fieldset className="mx-auto mt-3 grid max-w-3xl gap-2 sm:grid-cols-2" disabled={inProgress}>
          <legend className="sr-only">Pace</legend>
          {MODES.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer gap-2 rounded-md border-2 p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--tp-focus)] ${
                mode === option.id ? 'border-[var(--tp-accent)] bg-[var(--tp-ink-2)]' : 'border-[var(--tp-line)]'
              }`}
            >
              <input
                type="radio"
                name="tp-mode"
                value={option.id}
                checked={mode === option.id}
                onChange={() => setMode(option.id)}
                className="mt-1 accent-[var(--tp-accent)]"
                data-testid={`mode-${option.id}`}
              />
              <span>
                <span className="block font-semibold">{option.name}</span>
                <span className="block text-[var(--tp-muted)]">{option.text}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--tp-paper-muted)]">
                    {i === 0 ? 'Start here · ' : ''}
                    {school.difficulty}
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

export function EndScreen({ run, onMenu }: { run: RunState; onMenu: () => void }) {
  const abandon = useRunStore((s) => s.abandon)
  const start = useRunStore((s) => s.start)
  const act = useRunStore((s) => s.act)
  const won = run.screen === 'victory'
  const foe = run.defeatedBy ? getEnemyDef(run.defeatedBy) : null
  const canReconsider = !won && run.reconsiders > 0 && foe !== null
  return (
    <section className="space-y-4 rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-5 text-[var(--tp-text)]" aria-labelledby="end-title">
      <div className="flex items-start gap-4">
        {foe && <BiasPortrait enemyId={foe.id} tier={foe.tier} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />}
        <div>
          <h2 id="end-title" className="font-serif text-2xl font-semibold sm:text-3xl">
            {won ? 'Every question answered, for now' : canReconsider ? 'That argument got away from you' : 'You ran out of Resolve'}
          </h2>
          {won ? (
            <p className="mt-2">You argued your way through all three floors. The questions will still be there tomorrow, and that is fine.</p>
          ) : (
            <p className="mt-2">
              {foe && (
                <>
                  <strong>{foe.name}</strong> held its ground. Its rule: {foe.ruleText}{' '}
                </>
              )}
              Losing an argument is where most good thinking starts.
            </p>
          )}
        </div>
      </div>
      {canReconsider && (
        <div className="rounded-md border-2 border-[var(--tp-accent)] p-3">
          <p className="font-semibold">Reconsider</p>
          <p className="text-sm">
            Go back to the start of this argument with the Resolve you had then and a fresh shuffle, knowing what you know now. You can do this once per run.
          </p>
          <button type="button" className={`${primaryButton} mt-2`} onClick={() => act(reconsider)} data-testid="reconsider">
            Reconsider
          </button>
        </div>
      )}
      <p className="text-sm text-[var(--tp-muted)]">
        {count(run.stats.nodes, 'place')} visited, {count(run.stats.fights, 'argument')}, {count(run.stats.turns, 'turn')}.
      </p>
      {run.beaten.length > 0 && (
        <div>
          <h3 className="font-semibold">What you took from this run</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {run.beaten.map((id) => (
              <li key={id}>
                <span className="font-semibold">{getEnemyDef(id).name}.</span> {getEnemyDef(id).insight}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={canReconsider ? quietButton : primaryButton}
          onClick={() => {
            const school = run.school
            abandon()
            start(school, Math.floor(Math.random() * 2 ** 31), run.mode)
          }}
          data-testid="again"
        >
          {canReconsider ? 'Start a fresh run instead' : `Play again as ${SCHOOLS.find((s) => s.id === run.school)?.name}`}
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
