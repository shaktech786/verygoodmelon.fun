'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CardInstance, RunState } from '@/types/thought-pockets'
import { TYPE_LABELS, describeCard, resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { getRelicDef } from '@/lib/games/thought-pockets/data/relics'
import { getSchoolDef } from '@/lib/games/thought-pockets/data/schools'
import { KEYWORDS, Keyword } from '@/lib/games/thought-pockets/data/keywords'
import { useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { SoundToggle } from '@/components/ui/SoundToggle'
import { BattleScreen } from './BattleScreen'
import { MapScreen, FLOOR_NAMES } from './MapScreen'
import { EventScreen, RestScreen, RewardScreen, ShopScreen, quietButton } from './NodeScreens'
import { EndScreen, MenuScreen } from './MenuScreens'
import { TYPE_COLORS } from './CardFace'

const THEME = {
  '--tp-ink': '#1c1814',
  '--tp-ink-2': '#27211a',
  '--tp-line': '#5a4d3c',
  '--tp-text': '#f1e8d6',
  '--tp-muted': '#c9bba3',
  '--tp-paper': '#f4ecda',
  '--tp-paper-ink': '#2a2118',
  '--tp-accent': '#e8b04a',
  '--tp-red': '#e2715f',
} as React.CSSProperties

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
      className="m-auto max-h-[85dvh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-5 text-[var(--tp-text)] backdrop:bg-black/60"
      style={THEME}
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
        <li>The enemy shows exactly what it will do next, and the preview shows exactly what will happen. Nothing is left to chance once you choose.</li>
        <li>End your turn: your argument lands, then the enemy acts. You can undo any card before that.</li>
        <li>Every bias has one rule, written under its name. Working out how to beat it is the point.</li>
      </ol>
      <p className="mt-3">
        Keys in a fight: <strong>1–9</strong> play a card, <strong>U</strong> undoes, <strong>E</strong> ends the turn. On touch screens, hold a card to read it.
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
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--tp-text)]">
      <p className="font-serif">
        <span className="font-semibold">Floor {run.floor} of 3</span>
        <span className="hidden text-[var(--tp-muted)] sm:inline"> · {FLOOR_NAMES[run.floor]}</span>
      </p>
      <p className="flex items-center gap-2" data-testid="player-resolve">
        <span>
          Resolve <strong>{resolve}</strong>/{run.maxResolve}
        </span>
        <span className="hidden h-2 w-24 overflow-hidden rounded-full bg-black/40 sm:block" aria-hidden="true">
          <span className="block h-full rounded-full bg-[#8fc9a0]" style={{ width: `${(100 * resolve) / run.maxResolve}%` }} />
        </span>
        {run.battle && run.battle.player.guard > 0 && <span className="text-[#bcd6f2]">Guard {run.battle.player.guard}</span>}
      </p>
      <p>
        Gold <strong data-testid="gold">{run.gold}</strong>
      </p>
      <div className="ml-auto flex gap-2">
        <button type="button" className={`${quietButton} px-3 py-1`} onClick={onDeck} data-testid="open-deck">
          Deck {run.deck.length} · Relics {run.relics.length}
        </button>
        <button type="button" className={`${quietButton} px-3 py-1`} onClick={onHelp}>
          How to play
        </button>
        <button type="button" className={`${quietButton} px-3 py-1`} onClick={onMenu} data-testid="open-menu">
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
    <div style={THEME} className="min-h-[calc(100dvh-4rem)] bg-[var(--tp-ink)] px-4 py-4 sm:py-6">
      <style>{'.tp-screen:focus-visible { box-shadow: none; animation: none; }'}</style>
      <div className="mx-auto max-w-5xl">
        <h1 className="sr-only">The Philosopher</h1>
        {!hydrated ? (
          <p className="py-24 text-center text-[var(--tp-muted)]">Opening your notebook…</p>
        ) : (
          <>
            {run && !showMenu && run.screen !== 'victory' && run.screen !== 'defeat' && (
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
