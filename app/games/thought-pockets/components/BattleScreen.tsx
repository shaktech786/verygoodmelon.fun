'use client'

import { useEffect, useRef, useState } from 'react'
import { ArgumentPreview, BattleState, EnemyMove, RoundReport, RunState, StepView } from '@/types/thought-pockets'
import {
  KNOWN_UNSETTLE,
  canPlay,
  cardCost,
  currentMove,
  endTurn,
  enemyRuleText,
  incomingDamage,
  playCard,
  previewArgument,
  undoPlay,
} from '@/lib/games/thought-pockets/engine/battle'
import { battleAction } from '@/lib/games/thought-pockets/engine/run'
import { tutorialHint } from '@/lib/games/thought-pockets/engine/tutorial'
import { describeCard, resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { TUTORIAL_ENEMY, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { KEYWORDS } from '@/lib/games/thought-pockets/data/keywords'
import { useInsightStore, useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { wakeTones } from '@/components/games/gentleCues'
import { CardFace, TYPE_COLORS, keywordsOnCard } from './CardFace'
import { BiasPortrait } from './Sprites'
import { Term } from './Term'
import { RoundShow, RoundShowState, format, showProgress, useRoundShow } from './RoundShow'

const TIER_LABELS = { normal: 'Bias', elite: 'Stubborn bias', boss: 'Philosophical problem' }
const ASK_LABELS = { evidence: 'Evidence', logic: 'Logic', guard: 'Guard' }
const BIG_FLINCH = 20

export const SHOW_CSS = `
@keyframes tp-appear { from { opacity: 0; } to { opacity: 1; } }
@keyframes tp-lift { from { transform: translateY(0); } 50% { transform: translateY(-3px); } to { transform: translateY(0); } }
@keyframes tp-pop { from { transform: scale(0.8); } 60% { transform: scale(1.12); } to { transform: scale(1); } }
@keyframes tp-flinch { 0%, 100% { transform: translateX(0); } 30% { transform: translateX(-3px) rotate(-2deg); } 65% { transform: translateX(2px); } }
@keyframes tp-flinch-big { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px) rotate(-4deg); } 55% { transform: translateX(4px) rotate(2deg); } 80% { transform: translateX(-2px); } }
@keyframes tp-rise { from { opacity: 0; transform: translateY(6px); } 25% { opacity: 1; } to { opacity: 0; transform: translateY(-22px); } }
@media (prefers-reduced-motion: no-preference) {
  html:not([data-reduce-motion="true"]) .tp-appear { animation: tp-appear 220ms ease-out both; }
  html:not([data-reduce-motion="true"]) .tp-lift { animation: tp-lift 300ms ease-out; }
  html:not([data-reduce-motion="true"]) .tp-pop { display: inline-block; animation: tp-pop 360ms ease-out; }
  html:not([data-reduce-motion="true"]) .tp-flinch { animation: tp-flinch 320ms ease-out; }
  html:not([data-reduce-motion="true"]) .tp-flinch-big { animation: tp-flinch-big 460ms ease-out; }
  html:not([data-reduce-motion="true"]) .tp-rise { animation: tp-rise 900ms ease-out both; }
}
`

function odds(chance: number): string {
  return `1 in ${Math.round(1 / chance)}`
}

function intentText(move: EnemyMove, battle: BattleState): string[] {
  const parts: string[] = []
  if (move.attack) {
    const hit = incomingDamage(battle, 0)
    parts.push(hit.hits > 1 ? `Attack ${hit.perHit} × ${hit.hits}` : `Attack ${hit.perHit}`)
  }
  if (move.guard) parts.push(`Guard ${move.guard}`)
  if (move.addDoubt) parts.push('Add a Doubt to your draw pile')
  if (move.asks) parts.push(`Asks for ${move.asks.map((ask) => ASK_LABELS[ask]).join(' and ')}`)
  if (parts.length === 0) parts.push('Wait')
  const gamble = getEnemyDef(battle.enemy.id).gamble
  if (gamble) parts.push(`or, ${odds(gamble.chance)}: Attack ${gamble.attack + battle.enemy.strength}`)
  return parts
}

function stepValue(step: StepView): string {
  const parts: string[] = []
  if (step.weight) parts.push(`+${step.weight} Weight`)
  if (step.multiplier) parts.push(`+${format(step.multiplier)} Mult`)
  if (step.guard) parts.push(`${step.guard} Guard`)
  if (step.unsettle) parts.push(`Unsettle ${step.unsettle}`)
  return parts.join(' · ')
}

function incomingLine(preview: ArgumentPreview): string {
  if (preview.enemyFalls === 'argument') return 'Your argument will end this before it acts.'
  if (preview.enemyFalls === 'unsettle') return `Your argument, then Unsettle ${preview.unsettleTick}, will end this before it acts.`
  if (preview.postpone) return 'Postponed: it will not act this round.'
  const usual =
    preview.incoming === 0
      ? 'No attack this round.'
      : preview.incomingAfterGuard === 0
        ? `As it stands, your Guard blocks all ${preview.incoming}.`
        : `As it stands, you will lose ${preview.incomingAfterGuard}${preview.guard > 0 ? ` (Guard absorbs ${Math.min(preview.guard, preview.incoming)})` : ''}.`
  return preview.risk ? `${usual} If its gamble comes off, you lose ${preview.risk.afterGuard}.` : usual
}

function lethalLine(battle: BattleState, preview: ArgumentPreview): string | null {
  if (preview.enemyFalls) return null
  const resolve = battle.player.resolve
  if (preview.incomingAfterGuard + preview.selfLoss >= resolve) return 'That is all your Resolve. Guard, hold back Focus, or end it first.'
  if (preview.risk && preview.risk.afterGuard + preview.selfLoss >= resolve)
    return `If its gamble comes off (${odds(preview.risk.chance)}), that is all your Resolve. More Guard makes you safe either way.`
  return null
}

function aftermathLines(report: RoundReport, shift: string | null): string[] {
  const lines: string[] = []
  if (report.postponed) lines.push('It was postponed and did nothing.')
  else if (report.enemyAttack > 0)
    lines.push(
      `${report.gamble === 'hit' ? 'Its gamble came off. ' : ''}It attacked for ${report.enemyAttack}${report.enemyBlocked > 0 ? `, your Guard absorbed ${report.enemyBlocked}` : ''}: you lost ${report.playerLoss}.`,
    )
  else lines.push('It did not attack.')
  if (report.gamble === 'miss') lines.push('Its gamble did not come off. The odds next round are exactly the same.')
  if (report.enemyGuardGained > 0) lines.push(`It raised ${report.enemyGuardGained} Guard.`)
  if (report.doubtsAdded > 0) lines.push('A Doubt went into your draw pile.')
  if (report.phaseChanged && shift) lines.push(shift)
  return lines
}

function roundSummary(report: RoundReport, battle: BattleState): string {
  const def = getEnemyDef(battle.enemy.id)
  const argument = report.steps.length === 0 ? 'You made no argument.' : `Your argument dealt ${report.damage} damage.`
  const unsettle = report.unsettleLoss > 0 ? ` Unsettled, it lost ${report.unsettleLoss}.` : ''
  const after = aftermathLines(report, def.phase2?.shift ?? null).join(' ')
  return `${argument}${unsettle} ${after} It has ${battle.enemy.health} Resolve left, you have ${battle.player.resolve}. Next, it will: ${intentText(currentMove(battle), battle).join(', ')}.`
}

function argumentSummary(battle: BattleState, preview: ArgumentPreview, added: string | null): string {
  const lead = added ? `${added} added.` : battle.played.length === 0 ? 'Argument cleared.' : 'Undone.'
  if (battle.played.length === 0) return `${lead} ${incomingLine(preview)}`
  const empty = preview.conclusionEmpty ? ' Your Conclusion has nothing to double.' : ''
  return `${lead} Weight ${preview.weight} × ${format(preview.multiplier)} = ${preview.damage} damage.${empty} ${incomingLine(preview)}`
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-sm bg-[var(--tp-line)]" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="h-full motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${(100 * value) / max}%`, backgroundColor: color }} />
    </div>
  )
}

function Chip({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'guard' | 'warn' | 'good' }) {
  const tones = {
    plain: 'border-[var(--tp-line)] text-[var(--tp-text)]',
    guard: 'border-[var(--tp-guard)] text-[var(--tp-guard)]',
    warn: 'border-[var(--tp-warn)] text-[var(--tp-warn)]',
    good: 'border-[var(--tp-good)] text-[var(--tp-good)]',
  }
  return <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

/** While the round plays out, the bias's Resolve counts down in step with the show. */
function shownHealth(battle: BattleState, show: RoundShowState): number {
  const report = battle.lastRound
  if (!report || show.done) return battle.enemy.health
  const { reached } = showProgress(show)
  const unsettle = reached('unsettle') ? 0 : report.unsettleLoss
  const argument = reached('land') ? 0 : report.damage - report.healedBack
  return Math.min(battle.enemy.maxHealth, battle.enemy.health + unsettle + argument)
}

function ThreatPanel({ battle, preview, known, show }: { battle: BattleState; preview: ArgumentPreview; known: boolean; show: RoundShowState }) {
  const def = getEnemyDef(battle.enemy.id)
  const move = currentMove(battle)
  const lethal = lethalLine(battle, preview)
  const { landing } = showProgress(show)
  const hit = landing && battle.lastRound ? battle.lastRound.damage : 0
  const health = shownHealth(battle, show)
  const gamble = def.gamble
  return (
    <section aria-label="Opponent" className="grid gap-2 rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-2.5 sm:grid-cols-[1fr_15rem] sm:gap-3 sm:p-4">
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <BiasPortrait enemyId={def.id} tier={def.tier} className={`h-14 w-14 sm:h-24 sm:w-24 ${hit > 0 ? (hit >= BIG_FLINCH ? 'tp-flinch-big' : 'tp-flinch') : ''}`} />
          {hit > 0 && (
            <span
              className="tp-rise pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-sm bg-[var(--tp-ink)] px-1 font-serif text-lg font-bold text-[var(--tp-accent)]"
              aria-hidden="true"
            >
              −{hit}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] uppercase tracking-wider text-[var(--tp-muted)]">
            {TIER_LABELS[def.tier]}
            {battle.enemy.phase === 2 && def.phase2 && ' · changed'}
          </p>
          <h2 className="font-serif text-lg font-semibold leading-tight text-[var(--tp-text)] sm:text-xl" data-testid="enemy-name">
            {def.name}
          </h2>
          <p className="mt-0.5 text-[0.8rem] leading-snug text-[var(--tp-text)] sm:text-sm" data-testid="enemy-rule">
            {enemyRuleText(battle)}
          </p>
          {def.phase2 && battle.enemy.phase === 1 && (
            <p className="mt-0.5 text-xs leading-snug text-[var(--tp-muted)]" data-testid="phase-warning">
              At half Resolve ({Math.floor(battle.enemy.maxHealth / 2)}) it changes. {def.phase2.ruleText}
            </p>
          )}
          {gamble && battle.enemy.misses >= 2 && (
            <p className="mt-0.5 text-xs leading-snug text-[var(--tp-muted)]" data-testid="gamble-streak">
              It has missed {battle.enemy.misses} rounds in a row and says it is due. The odds are still {odds(gamble.chance)}.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 sm:row-start-2">
        <div className="flex items-center gap-2 text-sm text-[var(--tp-text)]">
          <span className="whitespace-nowrap">
            <Term word="Resolve" /> <span data-testid="enemy-resolve">{health}</span>/{battle.enemy.maxHealth}
          </span>
          <Bar value={health} max={battle.enemy.maxHealth} color="var(--tp-enemy-bar)" label={`${def.name} Resolve`} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {battle.enemy.guard > 0 && (
            <Chip tone="guard">
              <span data-testid="enemy-guard">Guard {battle.enemy.guard}</span>
            </Chip>
          )}
          {battle.enemy.unsettle > 0 && <Chip tone="good">Unsettled {battle.enemy.unsettle}</Chip>}
          {battle.enemy.strength > 0 && <Chip tone="warn">Attacks +{battle.enemy.strength}</Chip>}
          {known && (
            <span className="text-xs text-[var(--tp-muted)]" data-testid="known">
              You have named this one before, so it started Unsettled {KNOWN_UNSETTLE}.
            </span>
          )}
        </div>
      </div>
      <div
        className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-[var(--tp-line)] bg-[var(--tp-ink)] px-2.5 py-1.5 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:block sm:p-3"
        data-testid="intent"
      >
        <p className="text-[0.68rem] uppercase tracking-wider text-[var(--tp-muted)]">Next, it will</p>
        <p className="font-serif text-base font-semibold text-[var(--tp-text)] sm:text-lg">{intentText(move, battle).join(' · ')}</p>
        <p className="w-full text-sm text-[var(--tp-text)]" data-testid="incoming">
          {incomingLine(preview)}
        </p>
        {lethal && (
          <p className="mt-1 text-sm font-semibold text-[var(--tp-warn)]" data-testid="lethal-warning">
            {lethal}
          </p>
        )}
      </div>
    </section>
  )
}

function ArgumentPanel({ battle, preview, show, reduced }: { battle: BattleState; preview: ArgumentPreview; show: RoundShowState; reduced: boolean }) {
  const empty = battle.played.length === 0
  const report = battle.lastRound
  const def = getEnemyDef(battle.enemy.id)
  return (
    <section aria-label="Your argument" className="rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-2.5 sm:p-4" data-testid="argument">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-base font-semibold text-[var(--tp-text)] sm:text-lg">Your argument</h2>
        <p className="hidden text-xs text-[var(--tp-muted)] sm:block">
          <Term word="Weight" /> × <Term word="Multiplier" />, last card is the <Term word="Conclusion" />
        </p>
      </div>
      {empty && report && show.done ? (
        <>
          <details className="mt-1 text-sm text-[var(--tp-text)] sm:hidden">
            <summary className="cursor-pointer">
              Last round: {report.damage} damage
              {report.unsettleLoss > 0 && `, Unsettle ${report.unsettleLoss}`}
              {report.enemyAttack > 0 && `; it hit for ${report.enemyAttack}, you lost ${report.playerLoss}`}
            </summary>
            <RoundShow report={report} show={show} reduced={reduced} aftermath={aftermathLines(report, def.phase2?.shift ?? null)} title="Last round" testId="last-round-phone" />
          </details>
          <div className="hidden sm:block">
            <RoundShow report={report} show={show} reduced={reduced} aftermath={aftermathLines(report, def.phase2?.shift ?? null)} title="Last round" />
          </div>
        </>
      ) : empty && report ? (
        <RoundShow report={report} show={show} reduced={reduced} aftermath={aftermathLines(report, def.phase2?.shift ?? null)} title="Last round" />
      ) : (
        <>
          <ol className="mt-1.5 flex min-h-[2rem] flex-wrap gap-1.5" aria-label="Cards in your argument, in order">
            {preview.carriedWeight > 0 && (
              <li className="rounded-sm border border-dashed border-[var(--tp-line)] px-2 py-1 text-xs text-[var(--tp-text)]">Leftover Guard +{preview.carriedWeight} Weight</li>
            )}
            {preview.doubtWeight > 0 && (
              <li className="rounded-sm border border-dashed border-[var(--tp-line)] px-2 py-1 text-xs text-[var(--tp-text)]">Doubts in hand +{preview.doubtWeight} Weight</li>
            )}
            {preview.lastingMultiplier > 0 && (
              <li className="rounded-sm border border-dashed border-[var(--tp-line)] px-2 py-1 text-xs text-[var(--tp-text)]">For this fight +{format(preview.lastingMultiplier)} Multiplier</li>
            )}
            {preview.steps.map((step, i) => (
              <li
                key={step.uid}
                className={`rounded-sm border-l-4 bg-[var(--tp-paper)] px-2 py-1 text-xs text-[var(--tp-paper-ink)] ${step.conclusion ? 'outline-2 outline-[var(--tp-accent)]' : ''}`}
                style={{ borderLeftColor: TYPE_COLORS[step.type] }}
              >
                <span className="font-semibold">
                  {i + 1}. {step.name}
                </span>{' '}
                {stepValue(step)}
                {step.notes.length > 0 && <span className="block text-[0.68rem] text-[var(--tp-paper-muted)]">{step.notes.join(' · ')}</span>}
              </li>
            ))}
            {empty && <li className="py-0.5 text-sm text-[var(--tp-muted)]">Play cards to build it. It lands when you end your turn.</li>}
          </ol>
          <Equation preview={preview} focus={battle.focus} />
        </>
      )}
    </section>
  )
}

function Equation({ preview, focus }: { preview: ArgumentPreview; focus: number }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--tp-text)]" data-testid="equation">
      <span>
        Weight <strong>{preview.weight}</strong> × Multiplier <strong>{format(preview.multiplier)}</strong> = <strong>{preview.product}</strong>
      </span>
      {preview.modifiers.map((m) => (
        <Chip key={m}>{m}</Chip>
      ))}
      {preview.raw !== preview.product && (
        <span>
          = <strong>{preview.raw}</strong>
        </span>
      )}
      {preview.steps.length > 0 && preview.weight === 0 && preview.multiplier > 1 && (
        <Chip tone="warn">
          <span data-testid="no-weight">No Weight yet: a Multiplier has nothing to multiply</span>
        </Chip>
      )}
      {preview.conclusionEmpty && (
        <Chip tone="warn">
          <span data-testid="empty-conclusion">Conclusion: nothing to double. Finish on Evidence or Logic.</span>
        </Chip>
      )}
      {preview.pierce && <Chip tone="good">Pierce: ignores Guard</Chip>}
      {preview.blocked > 0 && <Chip tone="guard">Its Guard absorbs {preview.blocked}</Chip>}
      <span aria-hidden="true">→</span>
      <span className="text-base">
        <strong data-testid="damage-preview">{preview.damage}</strong> damage
      </span>
      {preview.healedBack > 0 && <Chip tone="warn">It recovers {preview.healedBack}</Chip>}
      {preview.selfLoss > 0 && <Chip tone="warn">You lose {preview.selfLoss}</Chip>}
      {preview.growth > 0 && <Chip tone="warn">Its attacks +{preview.growth}</Chip>}
      {preview.unsettleTick > 0 && <Chip tone="good">Then Unsettle takes {preview.unsettleTick}</Chip>}
      {preview.guard > 0 && (
        <Chip tone="guard">
          Your Guard {preview.guard}
          {preview.composure > 0 && <span className="font-normal">({preview.composure} from {focus} unspent Focus)</span>}
        </Chip>
      )}
      {preview.unsettle > 0 && <Chip tone="good">Unsettle +{preview.unsettle}</Chip>}
      {preview.postpone && <Chip tone="good">Postpone</Chip>}
    </div>
  )
}

/** What a screen reader hears: the argument after each card, and the whole round after End turn. */
function useAnnouncement(battle: BattleState, preview: ArgumentPreview): string {
  const turn = battle.lastRound?.turn ?? 0
  const played = battle.played.map((c) => c.uid).join(',')
  const [said, setSaid] = useState({ turn, played, count: battle.played.length, text: '' })
  if (said.turn !== turn || said.played !== played) {
    const report = battle.lastRound
    const added = battle.played.length > said.count ? resolveCard(battle.played[battle.played.length - 1]).name : null
    const text = said.turn !== turn && report ? roundSummary(report, battle) : argumentSummary(battle, preview, added)
    setSaid({ turn, played, count: battle.played.length, text })
  }
  return said.text
}

export function BattleScreen({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const tutorialDone = useInsightStore((s) => s.tutorialDone)
  const reduced = useReducedMotion()
  const [inspected, setInspected] = useState<number | null>(null)
  const handRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLButtonElement>(null)
  const refocus = useRef<number | null>(null)
  const battle = run.battle as BattleState
  const preview = previewArgument(battle)
  const hint = !tutorialDone && battle.enemy.id === TUTORIAL_ENEMY ? tutorialHint(battle) : null
  const report = battle.lastRound
  const show = useRoundShow(report ? `${run.stats.fights}-${report.turn}` : null, report)
  const announcement = useAnnouncement(battle, preview)
  const skipShow = show.skip

  useEffect(() => {
    if (refocus.current === null) return
    const index = refocus.current
    refocus.current = null
    const cards = handRef.current?.querySelectorAll<HTMLButtonElement>(':scope > button') ?? []
    const target = cards.length > 0 ? cards[Math.min(index, cards.length - 1)] : endRef.current
    target?.focus()
  }, [battle.hand])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (document.querySelector('dialog[open]')) return
      const { run: current, act: apply } = useRunStore.getState()
      const live = current?.battle
      if (!live || current?.screen !== 'battle') return
      const key = event.key.toLowerCase()
      if (/^[1-9]$/.test(key)) {
        const card = live.hand[Number(key) - 1]
        if (card) {
          event.preventDefault()
          skipShow()
          apply((r) => battleAction(r, (b) => playCard(b, card.uid)))
        }
      } else if (key === 'u' || key === 'backspace') {
        event.preventDefault()
        apply((r) => battleAction(r, undoPlay))
      } else if (key === 'e') {
        event.preventDefault()
        wakeTones()
        apply((r) => battleAction(r, endTurn))
      } else if (key === 's' || key === 'escape') {
        skipShow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [skipShow])

  const inspectedCard = battle.hand.find((c) => c.uid === inspected)
  const inspectedDef = inspectedCard ? resolveCard(inspectedCard) : null
  const nothingPlayed = preview.steps.length === 0 && preview.carriedWeight + preview.doubtWeight === 0

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <style>{SHOW_CSS}</style>
      <ThreatPanel battle={battle} preview={preview} known={run.known.includes(battle.enemy.id)} show={show} />
      <ArgumentPanel battle={battle} preview={preview} show={show} reduced={reduced} />

      {hint && (
        <p role="status" className="rounded-md border border-[var(--tp-accent)] bg-[var(--tp-ink-2)] px-3 py-1.5 text-sm text-[var(--tp-text)]" data-testid="hint">
          {hint}
        </p>
      )}

      <section aria-label="Your hand">
        <h2 className="sr-only">Your hand</h2>
        <div ref={handRef} className="grid grid-cols-3 justify-items-stretch gap-1.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-2" data-testid="hand">
          {battle.hand.map((card, i) => {
            const def = resolveCard(card)
            return (
              <CardFace
                key={card.uid}
                card={def}
                size="hand"
                freeNote={cardCost(battle, card) < def.cost ? 'Free as first Logic' : undefined}
                hotkey={i < 9 ? i + 1 : undefined}
                disabled={!canPlay(battle, card.uid)}
                onActivate={() => {
                  refocus.current = i
                  skipShow()
                  act((r) => battleAction(r, (b) => playCard(b, card.uid)))
                }}
                onInspect={() => setInspected(card.uid)}
              />
            )
          })}
          {battle.hand.length === 0 && <p className="col-span-3 py-6 text-sm text-[var(--tp-muted)]">Your hand is empty.</p>}
        </div>
        <p className="mt-1.5 min-h-[1.25rem] text-center text-xs text-[var(--tp-muted)]">
          {inspectedDef ? (
            <>
              <span className="sm:hidden">
                <strong>{inspectedDef.name}:</strong> {describeCard(inspectedDef).join(' ')}{' '}
              </span>
              {keywordsOnCard(inspectedDef)
                .map((word) => `${word}: ${KEYWORDS[word]}`)
                .join('  ')}
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Keys: 1–9 play a card, U undoes, E ends the turn, S skips the replay.</span>
              <span className="sm:hidden">Tap a card to play it. Hold a card to read all of it.</span>
            </>
          )}
        </p>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-2 border-t border-[var(--tp-line)] bg-[var(--tp-ink)] py-2 pl-4 pr-20 sm:mx-0 sm:rounded-lg sm:border sm:py-3 sm:pr-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-[var(--tp-text)]" data-testid="focus">
          <Term word="Focus" />
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: Math.max(battle.focus, 3) }, (_, i) => (
              <span key={i} className={`h-3.5 w-3.5 border-2 border-[var(--tp-accent)] ${i < battle.focus ? 'bg-[var(--tp-accent)]' : ''}`} />
            ))}
          </span>
          <span>{battle.focus} left</span>
          <span className="hidden text-xs text-[var(--tp-muted)] sm:inline">
            Draw pile {battle.drawPile.length} · Discard {battle.discardPile.length}
            {battle.exhausted.length > 0 && ` · Gone this fight ${battle.exhausted.length}`}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => act((r) => battleAction(r, undoPlay))}
            disabled={battle.undo.length === 0}
            className="rounded-md border border-[var(--tp-line)] px-3 py-2 text-sm text-[var(--tp-text)] hover:bg-[var(--tp-ink-2)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)] sm:px-4"
          >
            Undo <span className="hidden text-xs text-[var(--tp-muted)] sm:inline">(U)</span>
          </button>
          <button
            ref={endRef}
            type="button"
            onClick={() => {
              wakeTones()
              act((r) => battleAction(r, endTurn))
            }}
            className="rounded-md bg-[var(--tp-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--tp-on-accent)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)] sm:px-4"
            data-testid="end-turn"
          >
            End turn <span className="hidden text-xs sm:inline">(E)</span>
            <span className="block text-xs font-normal">{nothingPlayed ? (preview.composure > 0 ? `Hold: ${preview.composure} Guard` : 'No argument') : `Argue for ${preview.damage}`}</span>
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" data-testid="announcer">
        {announcement}
      </p>
    </div>
  )
}
