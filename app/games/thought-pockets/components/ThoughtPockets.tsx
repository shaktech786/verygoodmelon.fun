'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CardInstance, RunState, School } from '@/types/thought-pockets'
import { TYPE_LABELS, describeCard, resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { getRelicDef } from '@/lib/games/thought-pockets/data/relics'
import { getSchoolDef } from '@/lib/games/thought-pockets/data/schools'
import { KEYWORDS, Keyword, keywordText } from '@/lib/games/thought-pockets/data/keywords'
import { conclusionLine } from '@/lib/games/thought-pockets/data/conclusion'
import { useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { COMPOSURE_GUARD } from '@/lib/games/thought-pockets/engine/battle'
import { PROBLEM_RULE, slowGroundText } from '@/lib/games/thought-pockets/data/enemies'
import { TIRING } from '@/lib/games/thought-pockets/data/pace'
import { BattleScreen, PlayerResolve, PlayerShown, PlayerShownContext } from './BattleScreen'
import { MapScreen, FLOOR_NAMES, WALK_STRETCH } from './MapScreen'
import { EventScreen, RestScreen, RewardScreen, ShopScreen, quietButton } from './NodeScreens'
import { EndScreen, MenuScreen, paceName, runInProgress } from './MenuScreens'
import { TYPE_COLORS, TypeMark } from './CardFace'

/**
 * The game's ink map (PLAN.md 9.13): every --tp-* colour points at a Seedpress role, so the game follows light, dark, Quiet and high
 * contrast with the rest of the site. Flesh is only for the one Go of a view (--tp-accent); anything the player has chosen or is
 * standing on is rind (--tp-mark); a gentle problem is seed ink, never red.
 */
const THEME_CSS = `
.tp-root {
  --tp-ink: var(--paper);
  --tp-ink-2: var(--sheet);
  --tp-line: var(--rule-strong);
  --tp-shadow: var(--rule-strong);
  --tp-text: var(--ink);
  --tp-muted: var(--ink-soft);
  --tp-paper: var(--sheet);
  --tp-paper-ink: var(--ink);
  --tp-paper-muted: var(--ink-soft);
  --tp-accent: var(--flesh);
  --tp-on-accent: var(--on-flesh);
  --tp-mark: var(--rind);
  --tp-on-mark: var(--sheet);
  --tp-focus: var(--focus);
  --tp-good: var(--rind);
  --tp-guard: var(--brass);
  --tp-warn: var(--seed);
  --tp-enemy-bar: var(--seed);
  --tp-player-bar: var(--moss);
  --tp-evidence: var(--moss);
  --tp-logic: var(--clay);
  --tp-guard-type: var(--brass);
  --tp-rhetoric: var(--dusk);
  --tp-doubt: var(--ink-soft);
}
/* Printed edges, not blurred shadows: height is a hard edge */
.tp-edge { box-shadow: 3px 3px 0 0 var(--tp-shadow); }
.tp-ring-mark { box-shadow: 0 0 0 3px var(--rind-wash), 0 0 0 5px var(--tp-mark); }
.tp-scrim::backdrop { background-color: color-mix(in srgb, var(--ink) 55%, transparent); }
.tp-danger { border-color: var(--tp-warn); color: var(--tp-warn); }
.tp-root button.sp-go:disabled, .tp-root button.sp-stamp:disabled { background-color: var(--well); background-image: none; color: var(--ink-soft); border: 2px dashed var(--rule-strong); box-shadow: none; transform: none; cursor: not-allowed; }
.tp-screen:focus-visible, .tp-screen [tabindex="-1"]:focus-visible { outline: none; box-shadow: none; animation: none; }
/* A card you point at or reach by keyboard is picked up: its shadow deepens, and with motion it lifts and tilts, alternately, as in a hand. */
@media (hover: hover) { .tp-lift:hover { box-shadow: 4px 6px 0 0 var(--tp-shadow); } }
.tp-lift:focus-visible { box-shadow: 4px 6px 0 0 var(--tp-shadow); }
@media (prefers-reduced-motion: no-preference) {
  html:not([data-reduce-motion="true"]):not([data-sense="quiet"]) .tp-lift { transition: transform 75ms ease-out, box-shadow 75ms ease-out; }
  @media (hover: hover) { html:not([data-reduce-motion="true"]):not([data-sense="quiet"]) .tp-lift:hover { transform: translateY(-4px) rotate(-0.8deg); } }
  html:not([data-reduce-motion="true"]):not([data-sense="quiet"]) .tp-lift:focus-visible { transform: translateY(-4px) rotate(-0.8deg); }
  @media (hover: hover) { html:not([data-reduce-motion="true"]):not([data-sense="quiet"]) .tp-lift:nth-child(even):hover { transform: translateY(-4px) rotate(0.8deg); } }
  html:not([data-reduce-motion="true"]):not([data-sense="quiet"]) .tp-lift:nth-child(even):focus-visible { transform: translateY(-4px) rotate(0.8deg); }
  html:not([data-reduce-motion="true"]):not([data-sense="quiet"]) .tp-lift:active { transform: translateY(-1px) scale(0.98); }
}
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
      className="tp-root m-auto max-h-[85dvh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-sheet border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-5 text-[var(--tp-text)] tp-scrim"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={`${title}-title`} className="font-display text-h3 font-semibold">
          {title}
        </h2>
        <button type="button" className={quietButton} onClick={onClose}>
          Close
        </button>
      </div>
      <div className="mt-3 text-meta leading-relaxed">{children}</div>
    </dialog>
  )
}

/** The rules, stated for the school you are playing (or every school, from the menu). */
function HowToPlay({ school }: { school: School | null }) {
  return (
    <>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Each turn you draw 5 cards and get 3 Focus to spend on them.</li>
        <li>
          <strong>Evidence</strong> adds Weight. <strong>Logic</strong> raises the Multiplier, which starts at ×1. Your argument deals Weight × Multiplier.
        </li>
        <li>
          The last card you play is your <strong>Conclusion</strong>. {conclusionLine(school)} Which card to finish on is up to you.
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
          {PROBLEM_RULE} At half Resolve the argument stops at the line and the problem changes.
        </li>
        <li>
          At Gentle pace every bias plays by one more rule, except the first fight&apos;s teaching one and, on your first walk, the bias that teaches Unsettle:{' '}
          {slowGroundText()}
        </li>
        <li>On a Short walk, the quiet place before the problem first offers one card to build on, since the problem gives nothing after.</li>
        <li>
          There is no turn limit, and a long argument never counts against you. From turn {TIRING.gentle} in Gentle pace ({TIRING.rigorous} in Rigorous) the
          bias starts to tire: it takes on Unsettle {TIRING.step} more each turn, so every argument comes to an end.
        </li>
        <li>
          Some cards reach across turns: <strong>Keep</strong> cards stay in your hand if you do not play them, <strong>Once</strong> cards are gone for the rest of the
          fight after you play them, and a few effects last the whole fight.
        </li>
        <li>
          In Gentle pace, if an argument gets away from you, you may reconsider it once per run: back to its start with at least half your Resolve, knowing what
          you know now.
        </li>
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
            <dd>{keywordText(word, school)}</dd>
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
                <TypeMark type={def.type} />
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

function StatusBar({ run, shown, onMenu, onDeck, onHelp }: { run: RunState; shown: PlayerShown | null; onMenu: () => void; onDeck: () => void; onHelp: () => void }) {
  const live = run.battle?.player.resolve ?? run.resolve
  const fight = run.battle && shown
  const small = `${quietButton} px-2.5 py-1 text-meta sm:px-3`
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-meta text-[var(--tp-text)] sm:mb-3 sm:gap-x-4">
      <p className="font-body">
        <span className="font-semibold">{run.length === 'short' ? 'Short walk' : WALK_STRETCH[run.floor]}</span>
        <span className="hidden text-[var(--tp-muted)] sm:inline"> · {FLOOR_NAMES[run.floor]}</span>
      </p>
      <p className="flex items-center gap-2" data-testid="player-resolve">
        <PlayerResolve resolve={fight ? shown.resolve : live} max={run.maxResolve} hit={fight ? shown.hit : 0} roundKey={fight ? shown.roundKey : null} bar />
        {run.battle && run.battle.player.guard > 0 && <span className="text-[var(--tp-guard)]">Guard {run.battle.player.guard}</span>}
      </p>
      <p>
        Gold <strong data-testid="gold">{run.gold}</strong>
      </p>
      {run.mode === 'rigorous' && <p className="text-meta font-semibold text-[var(--tp-muted)]">{paceName(run)}</p>}
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
  const [shown, setShown] = useState<PlayerShown | null>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const showMenu = !run || menuOpen
  const viewKey = showMenu ? 'menu' : `${run.screen}-${run.pick ?? ''}-${run.floor}`

  const shownKey = useRef(viewKey)

  useEffect(() => {
    // The first screen is already where the page left the reader, so only a change of screen moves focus
    if (shownKey.current === viewKey) return
    shownKey.current = viewKey
    const screen = screenRef.current
    if (!screen) return
    // The site header is sticky, so a new screen starts from the top rather than wherever the last one was scrolled.
    window.scrollTo({ top: 0 })
    const start = screen.querySelector<HTMLElement>('[data-focus-start]') ?? screen.querySelector<HTMLElement>('h2')
    if (start && !start.hasAttribute('tabindex')) start.setAttribute('tabindex', '-1')
    ;(start ?? screen).focus({ preventScroll: true })
  }, [viewKey])

  return (
    <div className="tp-root min-h-[calc(100dvh-4rem)] bg-[var(--tp-ink)] px-4 py-3 sm:py-6">
      <style>{THEME_CSS}</style>
      {/* The server draws the first menu of a new visit; saved progress arrives once the page has hydrated (kept-boot.ts hides that menu for a visitor who has some) */}
      <div className="mx-auto max-w-5xl" data-booting={hydrated ? undefined : 'thought-pockets'}>
        {runInProgress(run) && !showMenu && run.screen !== 'defeat' && (
          <StatusBar run={run} shown={shown} onMenu={() => setMenuOpen(true)} onDeck={() => setDialog('deck')} onHelp={() => setDialog('help')} />
        )}
        <div ref={screenRef} tabIndex={-1} className="tp-screen outline-none" data-testid={`screen-${showMenu ? 'menu' : run.screen}`}>
          {showMenu ? (
            <MenuScreen run={run} onResume={() => setMenuOpen(false)} onHelp={() => setDialog('help')} />
          ) : run.screen === 'victory' || run.screen === 'defeat' ? (
            <EndScreen run={run} onMenu={() => setMenuOpen(true)} />
          ) : (
            <PlayerShownContext.Provider value={setShown}>
              <Screen run={run} />
            </PlayerShownContext.Provider>
          )}
        </div>
      </div>
      <Modal open={dialog === 'help'} onClose={() => setDialog(null)} title="How to play">
        <HowToPlay school={runInProgress(run) ? run.school : null} />
      </Modal>
      <Modal open={dialog === 'deck' && Boolean(run)} onClose={() => setDialog(null)} title="Your deck">
        {run && <DeckList run={run} />}
      </Modal>
    </div>
  )
}
