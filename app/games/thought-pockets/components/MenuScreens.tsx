'use client'

import { useState } from 'react'
import { RunState, School } from '@/types/thought-pockets'
import { SCHOOLS } from '@/lib/games/thought-pockets/data/schools'
import { ENEMIES, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { getCardDef } from '@/lib/games/thought-pockets/data/cards'
import { useInsightStore, useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { primaryButton, quietButton } from './NodeScreens'

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

function Insights() {
  const beaten = useInsightStore((s) => s.beaten)
  return (
    <section aria-labelledby="insights-title" className="rounded-xl border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-4">
      <h2 id="insights-title" className="font-serif text-xl font-semibold">
        Insights <span className="text-sm font-normal text-[var(--tp-muted)]">{beaten.length} of {ENEMIES.length}</span>
      </h2>
      <p className="text-sm text-[var(--tp-muted)]">Win an argument against a bias or a problem and you keep what it taught you.</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="insights">
        {ENEMIES.map((enemy) =>
          beaten.includes(enemy.id) ? (
            <li key={enemy.id} className="rounded-lg bg-black/20 p-2 text-sm">
              <span className="font-semibold">{enemy.name}.</span> {enemy.insight}
            </li>
          ) : (
            <li key={enemy.id} className="rounded-lg border border-dashed border-[var(--tp-line)] p-2 text-sm text-[var(--tp-muted)]">
              Not yet met
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
  const inProgress = run && run.screen !== 'victory' && run.screen !== 'defeat'

  const begin = (school: School) => {
    start(school, seedFromUrl())
    onResume()
  }

  return (
    <div className="space-y-5 text-[var(--tp-text)]">
      <header className="text-center">
        <h2 className="font-serif text-3xl font-semibold sm:text-4xl">The Philosopher</h2>
        <p className="mx-auto mt-2 max-w-xl">Each turn you build one argument from cards. Each opponent is a bias with one rule. Out-think it.</p>
        <button type="button" className={`${quietButton} mt-3`} onClick={onHelp}>
          How to play
        </button>
      </header>

      {inProgress && (
        <section className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-[var(--tp-accent)] bg-[var(--tp-ink-2)] p-4" aria-label="Run in progress">
          <p className="w-full text-center text-sm">
            {SCHOOLS.find((s) => s.id === run.school)?.name}, floor {run.floor} of 3, Resolve {run.battle?.player.resolve ?? run.resolve}/{run.maxResolve}
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
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCHOOLS.map((school) => (
            <li key={school.id}>
              <button
                type="button"
                onClick={() => begin(school.id)}
                disabled={Boolean(inProgress)}
                data-testid={`school-${school.id}`}
                className="flex h-full w-full flex-col gap-1 rounded-xl border-2 border-[var(--tp-line)] bg-[var(--tp-paper)] p-4 text-left text-[var(--tp-paper-ink)] hover:border-[var(--tp-accent)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-accent)]"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-lg font-semibold">{school.name}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#5a4c3a]">
                    {school.difficulty}
                    {finishedWith.includes(school.id) && ' · finished'}
                  </span>
                </span>
                <span className="text-sm">{school.tagline}</span>
                <span className="text-sm">
                  <strong>Passive:</strong> {school.passive}
                </span>
                <span className="text-xs text-[#5a4c3a]">Starts with {deckSummary(school.deck)}.</span>
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
  const won = run.screen === 'victory'
  const foe = run.defeatedBy ? getEnemyDef(run.defeatedBy) : null
  return (
    <section className="space-y-4 rounded-xl border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-5 text-[var(--tp-text)]" aria-labelledby="end-title">
      <h2 id="end-title" className="font-serif text-3xl font-semibold">
        {won ? 'Every question answered, for now' : 'You ran out of Resolve'}
      </h2>
      {won ? (
        <p>You argued your way through all three floors. The questions will still be there tomorrow, and that is fine.</p>
      ) : (
        <p>
          {foe ? (
            <>
              <strong>{foe.name}</strong> held its ground. Its rule: {foe.ruleText}{' '}
            </>
          ) : null}
          Losing an argument is where most good thinking starts.
        </p>
      )}
      <p className="text-sm text-[var(--tp-muted)]">
        {run.stats.nodes} places visited, {run.stats.fights} arguments, {run.stats.turns} turns.
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
          className={primaryButton}
          onClick={() => {
            const school = run.school
            abandon()
            start(school, Math.floor(Math.random() * 2 ** 31))
          }}
          data-testid="again"
        >
          Play again as {SCHOOLS.find((s) => s.id === run.school)?.name}
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
