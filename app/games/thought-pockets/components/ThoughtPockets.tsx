'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CardInstance, RunState } from '@/types/thought-pockets'
import { TYPE_LABELS, describeCard, resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { getRelicDef } from '@/lib/games/thought-pockets/data/relics'
import { getSchoolDef } from '@/lib/games/thought-pockets/data/schools'
import { KEYWORDS, Keyword } from '@/lib/games/thought-pockets/data/keywords'
import { useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { COMPOSURE_GUARD } from '@/lib/games/thought-pockets/engine/battle'
import { SoundToggle } from '@/components/ui/SoundToggle'
import { BattleScreen } from './BattleScreen'
import { MapScreen, FLOOR_NAMES } from './MapScreen'
import { EventScreen, RestScreen, RewardScreen, ShopScreen, quietButton } from './NodeScreens'
import { EndScreen, MenuScreen, paceName, runInProgress } from './MenuScreens'
import { TYPE_COLORS } from './CardFace'

/** Every colour comes from the site palette in app/globals.css, so the game follows light and dark mode. */
const THEME_CSS = `
.tp-root {
  --tp-ink: var(--background);
  --tp-ink-2: var(--card-bg);
  --tp-line: color-mix(in srgb, var(--foreground) 24%, var(--card-bg));
  --tp-shadow: color-mix(in srgb, var(--foreground) 14%, transparent);
  --tp-text: var(--foreground);
  --tp-muted: var(--primary-light);
  --tp-paper: color-mix(in srgb, var(--card-bg) 94%, var(--warm));
  --tp-paper-ink: var(--foreground);
  --tp-paper-muted: var(--primary-light);
  --tp-accent: var(--accent);
  --tp-on-accent: var(--background);
  --tp-focus: var(--foreground);
  --tp-good: var(--melon-green);
  --tp-guard: color-mix(in srgb, var(--melon-blue) 70%, var(--foreground));
  --tp-warn: var(--accent);
  --tp-enemy-bar: var(--melon-red);
  --tp-player-bar: var(--success);
  --tp-evidence: var(--melon-emerald);
  --tp-logic: var(--warm);
  --tp-guard-type: var(--melon-blue);
  --tp-rhetoric: var(--melon-purple);
  --tp-doubt: var(--primary-light);
}
.tp-screen:focus-visible { box-shadow: none; animation: none; }
`

function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useRunStore.persist.onFinishHydration(onChange),
    () => useRunStore.persist.hasHydrated(),
    () => false,
  )
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${title}-title`}
      className="tp-root m-auto max-h-[85dvh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-5 text-[var(--tp-text)] backdrop:bg-black/60"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={`${title}-title`} className="font-serif text-2xl font-semibold">
          {title}
        </h2>
        <button type="button" className={quietButton} onClick={onClose}>
          Close
        </button>
      </div>
      <div className="mt-3 text-sm leading-relaxed">{children}</div>
    </dialog>
  )
}

function HowToPlay() {
  return (
    <>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Each turn you draw 5 cards and get 3 Focus to spend on them.</li>
        <li>
          <strong>Evidence</strong> adds Weight. <strong>Logic</strong> raises the Multiplier, which starts at ×1. Your argument deals Weight × Multiplier.
        </li>
        <li>
          The last card you play is your <strong>Conclusion</strong>: its Weight or Multiplier counts twice. Which card to finish on is up to you.
        </li>
        <li>
          <strong>Guard</strong> cards absorb the enemy&apos;s attack this round. Guard is used up by damage, and wears off at its owner&apos;s next turn. Enemy Guard works the same way.
        </li>
        <li>
          Holding back is a choice too: each Focus you leave unspent becomes {COMPOSURE_GUARD} Guard when you end your turn.
        </li>
        <li>
          End your turn and the round plays out in order: your argument lands, then any <strong>Unsettle</strong> takes its toll (and halves), then the enemy acts. A
          bias that falls before it acts does nothing. You can undo any card before you end the turn.
        </li>
        <li>
          The enemy shows exactly what it will do next, and the preview shows exactly what will happen. One bias gambles: it shows its real odds, and the preview
          shows both outcomes.
        </li>
        <li>Every bias has one rule, written under its name. Philosophical problems change their rule once, at half Resolve, and say how in advance.</li>
        <li>
          Some cards reach across turns: <strong>Keep</strong> cards stay in your hand if you do not play them, <strong>Once</strong> cards are gone for the rest of the
          fight after you play them, and a few effects last the whole fight.
        </li>
        <li>In Gentle pace, if an argument gets away from you, you may reconsider it once per run: back to its start, knowing what you know now.</li>
      </ol>
      <p className="mt-3">
        Keys in a fight: <strong>1–9</strong> play a card, <strong>U</strong> undoes, <strong>E</strong> ends the turn, <strong>S</strong> skips the replay of a
        round. On touch screens, hold a card to read all of it, and tap a replay to skip it.
      </p>
      <h3 className="mt-4 font-semibold">Words</h3>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {(Object.keys(KEYWORDS) as Keyword[]).map((word) => (
          <div key={word} className="contents">
            <dt className="font-semibold">{word}</dt>
            <dd>{KEYWORDS[word]}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

function DeckList({ run }: { run: RunState }) {
  const school = getSchoolDef(run.school)
  const groups = new Map<string, { card: CardInstance; count: number }>()
  for (const card of run.deck) {
    const key = `${card.cardId}${card.upgraded ? '+' : ''}`
    const existing = groups.get(key)
    groups.set(key, { card, count: (existing?.count ?? 0) + 1 })
  }
  return (
    <>
      <p>
        <strong>{school.name} passive:</strong> {school.passive}
      </p>
      <h3 className="mt-3 font-semibold">Relics</h3>
      {run.relics.length === 0 ? (
        <p className="text-[var(--tp-muted)]">None yet.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {run.relics.map((id) => (
            <li key={id}>
              <strong>{getRelicDef(id).name}:</strong> {getRelicDef(id).text}
            </li>
          ))}
        </ul>
      )}
      <h3 className="mt-3 font-semibold">{run.deck.length} cards</h3>
      <ul className="mt-1 space-y-1">
        {[...groups.values()].map(({ card, count }) => {
          const def = resolveCard(card)
          return (
            <li key={`${card.cardId}${card.upgraded}`} className="border-l-4 pl-2" style={{ borderLeftColor: TYPE_COLORS[def.type] }}>
              <strong>
                {count > 1 ? `${count}× ` : ''}
                {def.name}
              </strong>{' '}
              <span className="text-[var(--tp-muted)]">
                {TYPE_LABELS[def.type]}
                {def.type !== 'doubt' && `, ${def.cost} Focus`}
              </span>
              : {describeCard(def).join(' ')}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function StatusBar({ run, onMenu, onDeck, onHelp }: { run: RunState; onMenu: () => void; onDeck: () => void; onHelp: () => void }) {
  const resolve = run.battle?.player.resolve ?? run.resolve
  const small = `${quietButton} px-2.5 py-1 text-xs sm:px-3 sm:text-sm`
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[var(--tp-text)] sm:mb-3 sm:gap-x-4">
      <p className="font-serif">
        <span className="font-semibold">Floor {run.floor} of 3</span>
        <span className="hidden text-[var(--tp-muted)] sm:inline"> · {FLOOR_NAMES[run.floor]}</span>
      </p>
      <p className="flex items-center gap-2" data-testid="player-resolve">
        <span>
          Resolve <strong>{resolve}</strong>/{run.maxResolve}
        </span>
        <span className="hidden h-2 w-24 overflow-hidden rounded-sm bg-[var(--tp-line)] sm:block" aria-hidden="true">
          <span className="block h-full bg-[var(--tp-player-bar)]" style={{ width: `${(100 * resolve) / run.maxResolve}%` }} />
        </span>
        {run.battle && run.battle.player.guard > 0 && <span className="text-[var(--tp-guard)]">Guard {run.battle.player.guard}</span>}
      </p>
      <p>
        Gold <strong data-testid="gold">{run.gold}</strong>
      </p>
      {run.mode === 'rigorous' && <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tp-muted)]">{paceName(run)}</p>}
      <div className="flex w-full gap-1.5 sm:ml-auto sm:w-auto sm:gap-2">
        <button type="button" className={small} onClick={onDeck} data-testid="open-deck">
          Deck {run.deck.length} · Relics {run.relics.length}
        </button>
        <button type="button" className={small} onClick={onHelp}>
          <span className="sm:hidden">Help</span>
          <span className="hidden sm:inline">How to play</span>
        </button>
        <button type="button" className={`${small} ml-auto sm:ml-0`} onClick={onMenu} data-testid="open-menu">
          Menu
        </button>
      </div>
    </div>
  )
}

function Screen({ run }: { run: RunState }) {
  switch (run.screen) {
    case 'map':
      return <MapScreen run={run} />
    case 'battle':
      return <BattleScreen run={run} />
    case 'reward':
      return <RewardScreen run={run} />
    case 'shop':
      return <ShopScreen run={run} />
    case 'rest':
      return <RestScreen run={run} />
    case 'event':
      return <EventScreen run={run} />
    case 'victory':
    case 'defeat':
      return null
  }
}

export function ThoughtPockets() {
  const hydrated = useHydrated()
  const run = useRunStore((s) => s.run)
  const [menuOpen, setMenuOpen] = useState(true)
  const [dialog, setDialog] = useState<'help' | 'deck' | null>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const showMenu = !run || menuOpen
  const viewKey = showMenu ? 'menu' : `${run.screen}-${run.pick ?? ''}-${run.floor}`

  useEffect(() => {
    screenRef.current?.focus({ preventScroll: true })
  }, [viewKey])

  return (
    <div className="tp-root min-h-[calc(100dvh-4rem)] bg-[var(--tp-ink)] px-4 py-3 sm:py-6">
      <style>{THEME_CSS}</style>
      <div className="mx-auto max-w-5xl">
        <h1 className="sr-only">The Philosopher</h1>
        {!hydrated ? (
          <p className="py-24 text-center text-[var(--tp-muted)]">Opening your notebook…</p>
        ) : (
          <>
            {runInProgress(run) && !showMenu && run.screen !== 'defeat' && (
              <StatusBar run={run} onMenu={() => setMenuOpen(true)} onDeck={() => setDialog('deck')} onHelp={() => setDialog('help')} />
            )}
            <div ref={screenRef} tabIndex={-1} className="tp-screen outline-none" data-testid={`screen-${showMenu ? 'menu' : run.screen}`}>
              {showMenu ? (
                <MenuScreen run={run} onResume={() => setMenuOpen(false)} onHelp={() => setDialog('help')} />
              ) : run.screen === 'victory' || run.screen === 'defeat' ? (
                <EndScreen run={run} onMenu={() => setMenuOpen(true)} />
              ) : (
                <Screen run={run} />
              )}
            </div>
          </>
        )}
      </div>
      <Modal open={dialog === 'help'} onClose={() => setDialog(null)} title="How to play">
        <HowToPlay />
      </Modal>
      <Modal open={dialog === 'deck' && Boolean(run)} onClose={() => setDialog(null)} title="Your deck">
        {run && <DeckList run={run} />}
      </Modal>
      <SoundToggle gameId="thought-pockets" />
    </div>
  )
}
