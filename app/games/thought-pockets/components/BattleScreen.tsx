'use client'

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArgumentPreview, BattleState, EnemyMove, RoundReport, RunState, StepView } from '@/types/thought-pockets'
import {
  KNOWN_UNSETTLE,
  canPlay,
  cardCost,
  chargeBonus,
  currentMove,
  endTurn,
  enemyRuleText,
  incomingDamage,
  phaseThreshold,
  playCard,
  previewArgument,
  tiringUnsettle,
  undoPlay,
} from '@/lib/games/thought-pockets/engine/battle'
import { battleAction, holdsNothingBack } from '@/lib/games/thought-pockets/engine/run'
import { tutorialHint } from '@/lib/games/thought-pockets/engine/tutorial'
import { Lesson, lessonsIn } from '@/lib/games/thought-pockets/engine/lessons'
import { describeCard, resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { timesWord } from '@/lib/games/thought-pockets/data/conclusion'
import { OVERFLOW, OVERFLOW_TEXT, PROBLEM_LINES, PROBLEM_RULE, TUTORIAL_ENEMY, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { argueLabel, releaseWords } from '@/lib/games/thought-pockets/data/turnText'
import { TIRING } from '@/lib/games/thought-pockets/data/pace'
import { keywordText } from '@/lib/games/thought-pockets/data/keywords'
import { useInsightStore, useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { wakeTones } from '@/components/games/gentleCues'
import { KeyHints } from '@/components/ui/KeyHints'
import { CardFace, TYPE_COLORS, keywordsOnCard } from './CardFace'
import { BiasPortrait, Mood, crackCount, impactLines } from './Sprites'
import { LessonNote, Term } from './Term'
import { AFTER_MS, BIG_HIT, Counting, HIT_PAUSE_MS, RoundShow, RoundShowState, format, showProgress, useRoundShow } from './RoundShow'
import { SHORT_WALK_BOSS_TEXT } from './MapScreen'

const TIER_LABELS = { normal: 'Bias', elite: 'Stubborn bias', boss: 'Philosophical problem' }
const ASK_LABELS = { evidence: 'Evidence', logic: 'Logic', guard: 'Guard' }
/** How far the portrait is knocked back by a hit, in pixels: further for a hit that takes more of its Resolve. */
const RECOIL_PX = [0, 2, 3, 5]
/** The bits of a problem's Shaken that burst out of it as it changes, as offsets in pixels. */
const BURST = [
  [-16, -10],
  [0, -18],
  [16, -10],
  [20, 4],
  [12, 16],
  [-4, 20],
  [-18, 12],
  [-22, -2],
]
const DOCK_VAR = '--tp-dock'
/** Below Tailwind's sm breakpoint, where the hand and End turn are pinned to the bottom of the screen. */
const PHONE_QUERY = '(max-width: 639.98px)'
/** How many turns ahead the screen says a long fight is about to tire the bias. */
const TIRING_NOTICE = 2

export const SHOW_CSS = `
@keyframes tp-appear { from { opacity: 0; } to { opacity: 1; } }
@keyframes tp-pop { from { transform: scale(0.8); } 60% { transform: scale(1.12); } to { transform: scale(1); } }
@keyframes tp-rise { from { opacity: 0; transform: translateY(6px); } 25% { opacity: 1; } to { opacity: 0; transform: translateY(-22px); } }
@keyframes tp-deal { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes tp-recoil {
  0% { transform: none; }
  4%, 21% { transform: translate(var(--tp-recoil), -1px); }
  38% { transform: translate(-1px, 0); }
  55% { transform: translate(0, -2px); }
  72% { transform: translate(0, 1px); }
  86% { transform: translate(0, -1px); }
  100% { transform: none; }
}
@keyframes tp-lines { 0%, 18% { opacity: 0; } 20%, 60% { opacity: 1; } 100% { opacity: 0; } }
@keyframes tp-burst { from { opacity: 1; transform: translate(0, 0); } to { opacity: 0; transform: translate(var(--tp-dx), var(--tp-dy)); } }
@keyframes tp-sink { 0% { transform: none; } 30%, 100% { transform: translateY(3px); } }
@keyframes tp-hurt {
  0% { transform: none; background-color: color-mix(in srgb, var(--warm) 35%, transparent); }
  12% { transform: translateX(-2px); }
  26% { transform: translateX(2px); }
  40% { transform: translateX(-1px); }
  54% { transform: none; }
  100% { transform: none; background-color: transparent; }
}
@keyframes tp-nudge { 0% { transform: none; } 20% { transform: translateY(2px); } 100% { transform: none; } }
@keyframes tp-tick { from { transform: translateY(-3px) scale(1.14); } to { transform: none; } }
@keyframes tp-settle { 0% { transform: none; } 35% { transform: scale(1.2); } 70% { transform: translateY(1px) scale(0.97); } 100% { transform: none; } }
@keyframes tp-arrive { from { opacity: 0; transform: translateY(14px) rotate(-2deg) scale(0.94); } 70% { opacity: 1; transform: translateY(-2px) rotate(0.5deg); } to { opacity: 1; transform: none; } }
@keyframes tp-break { 0% { transform: none; } 18% { transform: scale(1.06); } 45% { transform: translateY(2px) scale(0.98); } 100% { transform: none; } }
@keyframes tp-ring { from { opacity: 0.8; transform: scale(0.9); } to { opacity: 0; transform: scale(1.45); } }
@media (prefers-reduced-motion: no-preference) {
  html:not([data-reduce-motion="true"]) .tp-tick { display: inline-block; animation: tp-tick 200ms ease-out; }
  html:not([data-reduce-motion="true"]) .tp-settle { animation: tp-settle 360ms ease-out both; }
  html:not([data-reduce-motion="true"]) .tp-arrive { animation: tp-arrive 240ms ease-out both; }
  html:not([data-reduce-motion="true"]) .tp-break { animation: tp-break 520ms ease-out; }
  html:not([data-reduce-motion="true"]) .tp-ring { animation: tp-ring 700ms ease-out both; }
  html:not([data-reduce-motion="true"]) .tp-appear { animation: tp-appear 220ms ease-out both; }
  html:not([data-reduce-motion="true"]) .tp-pop { display: inline-block; animation: tp-pop 360ms ease-out; }
  html:not([data-reduce-motion="true"]) .tp-rise { animation: tp-rise 900ms ease-out both; }
  html:not([data-reduce-motion="true"]) .tp-deal { animation: tp-deal 220ms ease-out both; }
  html:not([data-reduce-motion="true"]) .tp-recoil { animation: tp-recoil 480ms linear; }
  html:not([data-reduce-motion="true"]) .tp-after-pause { animation-delay: ${HIT_PAUSE_MS}ms; animation-fill-mode: both; }
  html:not([data-reduce-motion="true"]) .tp-shake-lines { animation: tp-lines 480ms steps(4, end) both; }
  html:not([data-reduce-motion="true"]) .tp-burst { animation: tp-burst 900ms ease-out both; }
  html:not([data-reduce-motion="true"]) .tp-sink { animation: tp-sink 1000ms ease-out both; }
  html:not([data-reduce-motion="true"]) .tp-hurt { animation: tp-hurt ${AFTER_MS}ms ease-out; }
  html:not([data-reduce-motion="true"]) .tp-nudge { animation: tp-nudge 360ms ease-out; animation-delay: ${HIT_PAUSE_MS}ms; }
}
html[data-reduce-motion="true"] .tp-shake-lines, html[data-reduce-motion="true"] .tp-burst, html[data-reduce-motion="true"] .tp-ring { display: none; }
@media (prefers-reduced-motion: reduce) { .tp-shake-lines, .tp-burst, .tp-ring { display: none; } }
`

function odds(chance: number): string {
  return `1 in ${Math.round(1 / chance)}`
}

function intentText(move: EnemyMove, battle: BattleState): string[] {
  const parts: string[] = []
  if (move.attack) {
    const hit = incomingDamage(battle, 0)
    const charge = chargeBonus(battle)
    const spur = charge > 0 ? ` (+${charge} a hit from the cards in your hand)` : ''
    parts.push(hit.hits > 1 ? `Attack ${hit.perHit} × ${hit.hits}${spur}` : `Attack ${hit.perHit}${spur}`)
  }
  if (move.guard) parts.push(`Guard ${move.guard}`)
  if (move.addDoubt) parts.push('Add a Doubt to your draw pile')
  if (move.asks) parts.push(`Asks for ${move.asks.map((ask) => ASK_LABELS[ask]).join(' and ')}`)
  if (parts.length === 0) parts.push('Wait')
  const gamble = getEnemyDef(battle.enemy.id).gamble
  if (gamble) parts.push(`or, ${odds(gamble.chance)}: Attack ${gamble.attack + battle.enemy.strength}`)
  return parts
}

/** A Conclusion shows what it brought and what counting it again made of that: "+4 Weight ×3 → 12 Weight". */
function stepValue(step: StepView): string {
  const parts: string[] = []
  const counted = (value: number, unit: string) =>
    step.times > 1 ? `+${format(value / step.times)} ${unit} ×${step.times} → ${format(value)} ${unit}` : `+${format(value)} ${unit}`
  if (step.weight) parts.push(counted(step.weight, 'Weight'))
  if (step.multiplier) parts.push(counted(step.multiplier, 'Mult'))
  if (step.guard) parts.push(`${step.guard} Guard`)
  if (step.unsettle) parts.push(`Unsettle ${step.unsettle}`)
  return parts.join(' · ')
}

function incomingLine(preview: ArgumentPreview): string {
  if (preview.enemyFalls === 'argument') return 'Your argument will end this before it acts.'
  if (preview.enemyFalls === 'unsettle') return `Your argument, then Unsettle ${preview.unsettleTick}, will end this before it acts.`
  if (preview.postpone) return 'Postponed: it will not act this round.'
  const carried = preview.focusCarried > 0 ? ` (The Long View carries ${preview.focusCarried} more to next turn)` : ''
  const held = `your ${preview.heldFocus} unspent Focus ${preview.heldFocus === 1 ? 'becomes' : 'become'} ${preview.composure} Guard${carried}`
  const fromFocus = preview.composure > 0 ? `, ${preview.composure} of it from ${preview.heldFocus} unspent Focus${carried}` : ''
  let usual: string
  if (preview.incoming === 0) usual = 'No attack this round.'
  else if (preview.steps.length === 0 && preview.composure > 0 && preview.guard === preview.composure)
    usual =
      preview.incomingAfterGuard === 0
        ? `If you play nothing, ${held} and block all ${preview.incoming}.`
        : `If you play nothing, ${held}: you will lose ${preview.incomingAfterGuard} of ${preview.incoming}.`
  else if (preview.incomingAfterGuard === 0) usual = `As it stands, your ${preview.guard} Guard${fromFocus} blocks all ${preview.incoming}.`
  else
    usual = `As it stands, you will lose ${preview.incomingAfterGuard}${preview.guard > 0 ? ` (your ${preview.guard} Guard${fromFocus} absorbs ${Math.min(preview.guard, preview.incoming)})` : ''}.`
  return preview.risk ? `${usual} If its gamble comes off, you lose ${preview.risk.afterGuard}.` : usual
}

interface Lethal {
  /** The full warning, read out and shown above. */
  line: string
  /** A few words for the End turn button. */
  short: string
  certain: boolean
}

function lethal(battle: BattleState, preview: ArgumentPreview): Lethal | null {
  if (preview.enemyFalls) return null
  const resolve = battle.player.resolve
  if (preview.incomingAfterGuard + preview.selfLoss >= resolve)
    return { line: 'That is all your Resolve. Guard, hold back Focus, or end it first.', short: 'you fall', certain: true }
  if (preview.risk && preview.risk.afterGuard + preview.selfLoss >= resolve)
    return {
      line: `If its gamble comes off (${odds(preview.risk.chance)}), that is all your Resolve. More Guard makes you safe either way.`,
      short: `${odds(preview.risk.chance)}: you fall`,
      certain: false,
    }
  return null
}

/** The intent and what it costs you, in one line for the bar that stays on screen on a phone. */
function compactIntent(battle: BattleState, preview: ArgumentPreview): string {
  const next = `Next: ${intentText(currentMove(battle), battle).join(' · ')}`
  if (preview.enemyFalls || preview.postpone) return `${next}. It will not act.`
  const first = preview.unsettleTick > 0 ? ` Unsettle takes ${preview.unsettleTick} first.` : ''
  if (preview.incoming === 0) return `${next}.${first}`
  return `${next}.${first} You lose ${preview.incomingAfterGuard} of ${preview.incoming}.`
}

/** What happens to the bias before it acts, which is easy to miss when you play no cards. */
function beforeItActs(preview: ArgumentPreview): string[] {
  if (preview.enemyFalls) return []
  const lines: string[] = []
  if (preview.unsettleTick > 0) lines.push(`Before it acts, Unsettle takes ${preview.unsettleTick} of its Resolve.`)
  if (preview.released > 0) lines.push(`It changes this round, and as it does its Shaken ${preview.released} lands: ${releaseWords(preview.released)}.`)
  return lines
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
  const why = report.ruleGuardNote ? ` (${report.ruleGuardNote.charAt(0).toLowerCase()}${report.ruleGuardNote.slice(1)})` : ''
  if (report.enemyGuardGained > 0) lines.push(`It raised ${report.enemyGuardGained} Guard${why}.`)
  if (report.unsettleHeld > 0) lines.push(`The line held back ${report.unsettleHeld} of its Unsettle, so its Unsettle did not halve.`)
  if (report.shaken > 0 && !report.phaseChanged) lines.push(`What it stopped shook it: Shaken +${report.shaken}. It all lands at once when it changes.`)
  if (report.eased > 0) lines.push(`You lost nothing to it this round, so it calmed a little: its attacks −${report.eased}.`)
  if (report.doubtsAdded > 0) lines.push('A Doubt went into your draw pile.')
  if (report.restored > 0) lines.push(`You lost nothing this round, so you restored ${report.restored} Resolve.`)
  if (report.phaseChanged && shift) lines.push(shift)
  return lines
}

function releaseLine(report: RoundReport): string {
  return report.released > 0 ? ` As it changed, everything that shook it landed at once: Shaken ${report.released}, ${releaseWords(report.released)}.` : ''
}

function roundSummary(report: RoundReport, battle: BattleState): string {
  const def = getEnemyDef(battle.enemy.id)
  const argument = report.steps.length === 0 ? 'You made no argument.' : `Your argument dealt ${report.damage} damage.`
  const unsettle = report.unsettleLoss > 0 ? ` Unsettled, it lost ${report.unsettleLoss}.` : ''
  const after = aftermathLines(report, def.phase2?.shift ?? null).join(' ')
  return `${argument}${unsettle} ${after}${releaseLine(report)} It has ${battle.enemy.health} Resolve left, you have ${battle.player.resolve}. Next, it will: ${intentText(currentMove(battle), battle).join(', ')}.`
}

function argumentSummary(battle: BattleState, preview: ArgumentPreview, added: string | null): string {
  const lead = added ? `${added} added.` : battle.played.length === 0 ? 'Argument cleared.' : 'Undone.'
  const warning = lethal(battle, preview)
  const fall = warning ? ` ${warning.line}` : ''
  if (battle.played.length === 0) return `${lead} ${incomingLine(preview)}${fall}`
  const empty = preview.conclusionEmpty ? ` Your Conclusion has nothing to count ${timesWord(preview.conclusionCount)}.` : ''
  const steps = preview.chain.map((step) => ` ${step.text}: ${step.after}.`).join('')
  const sum = steps ? `${preview.product}.${steps} ${preview.damage} damage.` : `${preview.damage} damage.`
  return `${lead} Weight ${preview.weight} × ${format(preview.multiplier)} = ${sum}${empty} ${incomingLine(preview)}${fall}`
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-sm bg-[var(--tp-line)]" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="h-full motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${(100 * value) / max}%`, backgroundColor: color }} />
    </div>
  )
}

function Chip({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'guard' | 'warn' | 'good' | 'note' }) {
  const tones = {
    plain: 'border-[var(--tp-line)] text-[var(--tp-text)]',
    note: 'border-dashed border-[var(--tp-muted)] font-normal text-[var(--tp-text)]',
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
  const release = reached('shift') ? 0 : report.released
  return Math.min(battle.enemy.maxHealth, battle.enemy.health + unsettle + argument + release)
}

/** While the round plays out, your Resolve stays as it was until the replay reaches what cost it: Backfire as your argument lands, the bias's attack as it acts. */
function shownResolve(battle: BattleState, show: RoundShowState): number {
  const report = battle.lastRound
  if (!report || show.done) return battle.player.resolve
  const { reached } = showProgress(show)
  const backfire = reached('land') ? 0 : report.selfLoss
  const attack = reached('act') ? 0 : report.playerLoss - report.restored
  return battle.player.resolve + backfire + attack
}

/** Your Resolve as the fight on screen shows it, and how much the bias's hit is taking from it right now. */
export interface PlayerShown {
  resolve: number
  hit: number
  roundKey: string | null
}

/** How a fight tells the status bar, which sits outside it, what your Resolve shows during a replay. */
export const PlayerShownContext = createContext<(shown: PlayerShown | null) => void>(() => {})

/**
 * Your Resolve, counting down as the bias's hit lands, with one small shake and a warm tint that fades once.
 * Nothing moves with reduced motion: the replay is a still frame, so the new number simply shows.
 */
export function PlayerResolve({ resolve, max, hit, roundKey, bar = false }: { resolve: number; max: number; hit: number; roundKey: string | null; bar?: boolean }) {
  const hurt = hit > 0
  return (
    <span key={hurt ? `hurt-${roundKey}` : 'still'} className={`inline-flex items-center gap-2 rounded-sm ${hurt ? 'tp-hurt' : ''}`} data-hit={hurt ? hit : undefined}>
      <span>
        Resolve{' '}
        <strong>
          <Counting from={resolve + hit} to={resolve} ms={AFTER_MS / 2} running={hurt} />
        </strong>
        /{max}
      </span>
      {bar && (
        <span className="hidden h-2 w-24 overflow-hidden rounded-sm bg-[var(--tp-line)] sm:block" aria-hidden="true">
          <span className="block h-full bg-[var(--tp-player-bar)] motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${(100 * resolve) / max}%` }} />
        </span>
      )}
    </span>
  )
}

/**
 * Until the replay reaches each moment, the bias looks as it did before it: Shaken fills when the argument is stopped,
 * and a problem keeps its first rule, and its Shaken, until it changes.
 */
function shownBattle(battle: BattleState, show: RoundShowState): BattleState {
  const report = battle.lastRound
  if (!report || show.done) return battle
  const { reached } = showProgress(show)
  const banked = report.phaseChanged ? report.released : battle.enemy.shaken
  const shaken = reached('adjust') || reached('land') ? banked : banked - report.shaken
  if (report.phaseChanged && !reached('shift')) return { ...battle, enemy: { ...battle.enemy, phase: 1, shaken } }
  return { ...battle, enemy: { ...battle.enemy, shaken: report.phaseChanged ? 0 : shaken } }
}

/** Idle; shaken while it is hit or holds Shaken; giving way as a problem changes, and once it has. */
function moodOf(battle: BattleState, show: RoundShowState, hit: number): Mood {
  const { now } = showProgress(show)
  if (now === 'shift' || (battle.enemy.phase === 2 && getEnemyDef(battle.enemy.id).phase2)) return 'gives'
  if (hit > 0 || now === 'unsettle' || battle.enemy.shaken > 0) return 'shaken'
  return 'idle'
}

function ShakenMeter({ battle }: { battle: BattleState }) {
  const threshold = phaseThreshold(battle)
  const shaken = battle.enemy.shaken
  if (shaken === 0) return null
  const cells = Math.max(OVERFLOW.max * 2, shaken)
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--tp-text)]" data-testid="shaken">
      <span className="font-semibold text-[var(--tp-good)]">Shaken {shaken}</span>
      <span className="flex gap-px" aria-hidden="true">
        {Array.from({ length: cells }, (_, i) => (
          <span key={i} className={`h-2.5 w-1.5 border border-[var(--tp-good)] ${i < shaken ? 'bg-[var(--tp-good)]' : ''}`} />
        ))}
      </span>
      <span className="text-[var(--tp-muted)]">
        {threshold !== null ? `lands when it changes at ${threshold}: ${releaseWords(shaken)}` : `lands when it changes: ${releaseWords(shaken)}`}
      </span>
    </div>
  )
}

function TiringNote({ battle }: { battle: BattleState }) {
  const now = tiringUnsettle(battle)
  if (now > 0)
    return (
      <p className="mt-0.5 text-xs leading-snug text-[var(--tp-text)]" data-testid="tiring">
        Turn {battle.turn}: this argument has gone on long enough that it is tiring. It took on Unsettle {now} this turn, and {now + TIRING.step} next turn.
      </p>
    )
  if (battle.turn + TIRING_NOTICE < battle.tiresFrom) return null
  return (
    <p className="mt-0.5 text-xs leading-snug text-[var(--tp-muted)]" data-testid="tiring">
      Turn {battle.turn}. There is no turn limit: from turn {battle.tiresFrom} a long argument tires it, Unsettle {TIRING.step} more each turn.
    </p>
  )
}

/**
 * What the opponent panel shows while a round replays: the bias as it stood before the round, until the replay reaches
 * the moment each thing changed. Its Guard breaks when the argument lands; its new Guard, Unsettle and attacks show
 * once it has acted; its intent stays the one it is carrying out until then (until it changes, for a problem that does).
 */
interface PanelView {
  /** Whose numbers the chips show. */
  stats: BattleState
  /** Whose intent and forecast the panel reads out. */
  intent: BattleState
  preview: ArgumentPreview
  guard: number
}

function panelView(live: BattleState, preview: ArgumentPreview, before: BattleState | null, show: RoundShowState): PanelView {
  const report = live.lastRound
  const shown = shownBattle(live, show)
  if (!before || !report || show.done) return { stats: shown, intent: live, preview, guard: shown.enemy.guard }
  const { reached } = showProgress(show)
  const acted = reached('act')
  const intentHeld = !reached(report.phaseChanged ? 'shift' : 'act')
  const broken = reached('adjust') || reached('land') ? report.blocked : 0
  return {
    stats: acted ? shown : { ...shown, enemy: { ...shown.enemy, unsettle: before.enemy.unsettle, strength: before.enemy.strength, misses: before.enemy.misses } },
    intent: intentHeld ? before : live,
    preview: intentHeld ? previewArgument(before) : preview,
    guard: acted ? shown.enemy.guard : before.enemy.guard - broken,
  }
}

/** The battle as it stood just before the round now replaying; null when there is none to show, as after a reload. */
function useBeforeRound(battle: BattleState, roundKey: string | null): BattleState | null {
  const [track, setTrack] = useState<{ key: string | null; latest: BattleState; before: BattleState | null }>({ key: roundKey, latest: battle, before: null })
  if (track.key !== roundKey) setTrack({ key: roundKey, latest: battle, before: track.latest })
  else if (track.latest !== battle) setTrack({ ...track, latest: battle })
  return track.key === roundKey ? track.before : track.latest
}

function ThreatPanel({ battle: live, view, known, show, lastOfWalk }: { battle: BattleState; view: PanelView; known: boolean; show: RoundShowState; lastOfWalk: boolean }) {
  const battle = view.stats
  const def = getEnemyDef(battle.enemy.id)
  const move = currentMove(view.intent)
  const warning = lethal(view.intent, view.preview)
  const { landing, now } = showProgress(show)
  const [more, setMore] = useState(false)
  const report = live.lastRound
  const hit = landing && report ? report.damage : 0
  const health = shownHealth(live, show)
  const impact = impactLines(hit, battle.enemy.maxHealth)
  const bursting = now === 'shift' && report !== null && report.released > 0
  const gamble = def.gamble
  const threshold = phaseThreshold(battle)
  const first = beforeItActs(view.preview)
  const big = hit >= BIG_HIT
  return (
    <section aria-label="Opponent" className={`${big ? 'tp-nudge' : ''} grid gap-2 rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-2.5 sm:grid-cols-[1fr_15rem] sm:gap-3 sm:p-4`} data-big-hit={big || undefined}>
      <div className="flex gap-3">
        <div className="relative shrink-0" data-testid="portrait">
          <div className={hit > 0 ? 'tp-recoil' : bursting ? 'tp-sink' : ''} style={{ '--tp-recoil': `${RECOIL_PX[impact]}px` } as React.CSSProperties}>
            <BiasPortrait
              enemyId={def.id}
              tier={def.tier}
              mood={moodOf(battle, show, hit)}
              cracks={crackCount(health, battle.enemy.maxHealth)}
              impact={impact}
              className="h-14 w-14 sm:h-24 sm:w-24"
            />
          </div>
          {hit > 0 && (
            <span
              className={`tp-rise tp-after-pause pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-sm bg-[var(--tp-ink)] px-1 font-serif font-bold text-[var(--tp-accent)] ${big ? 'text-3xl' : 'text-lg'}`}
              aria-hidden="true"
            >
              −{hit}
            </span>
          )}
          {bursting &&
            BURST.map(([dx, dy]) => (
              <span
                key={`${dx}-${dy}`}
                className="tp-burst pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 bg-[var(--tp-good)]"
                style={{ '--tp-dx': `${dx}px`, '--tp-dy': `${dy}px` } as React.CSSProperties}
                aria-hidden="true"
              />
            ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] uppercase tracking-wider text-[var(--tp-muted)]">
            {TIER_LABELS[def.tier]}
            {battle.enemy.phase === 2 && def.phase2 && ' · changed'}
          </p>
          <h2 tabIndex={-1} data-focus-start className="font-serif text-lg font-semibold leading-tight text-[var(--tp-text)] outline-none sm:text-xl" data-testid="enemy-name">
            {def.name}
          </h2>
          <div id="enemy-rules" className={more ? '' : 'max-sm:line-clamp-1'} data-testid="rule-block">
            <p className="mt-0.5 text-[0.8rem] leading-snug text-[var(--tp-text)] sm:text-sm" data-testid="enemy-rule">
              {enemyRuleText(battle)}
            </p>
            {def.phase2 && (
              <p className="mt-0.5 text-xs leading-snug text-[var(--tp-muted)]" data-testid="phase-warning">
                {threshold !== null && `At half Resolve (${threshold}) it changes: ${def.phase2.ruleText} `}
                {enemyRuleText(battle).includes(OVERFLOW_TEXT) ? PROBLEM_LINES : PROBLEM_RULE}
              </p>
            )}
            {lastOfWalk && (
              <p className="mt-0.5 text-xs leading-snug text-[var(--tp-text)]" data-testid="holds-nothing-back">
                {SHORT_WALK_BOSS_TEXT}
              </p>
            )}
          </div>
          <button
            type="button"
            className="text-xs text-[var(--tp-muted)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--tp-focus)] sm:hidden"
            aria-expanded={more}
            aria-controls="enemy-rules"
            onClick={() => setMore((m) => !m)}
            data-testid="rule-more"
          >
            {more ? 'Less' : 'More'}
          </button>
          <TiringNote battle={view.intent} />
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
        <ShakenMeter battle={battle} />
        <div className="flex flex-wrap gap-1.5 sm:min-h-6">
          {view.guard > 0 && (
            <Chip tone="guard">
              <span data-testid="enemy-guard">Guard {view.guard}</span>
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
        <p className="font-serif text-base font-semibold text-[var(--tp-text)] sm:text-lg" data-testid="intent-move">
          {intentText(move, view.intent).join(' · ')}
        </p>
        {first.map((line, i) => (
          <p key={`${i}-${line}`} className="w-full text-sm text-[var(--tp-text)]" data-testid="before-it-acts">
            {line}
          </p>
        ))}
        <p className="w-full text-sm text-[var(--tp-text)]" data-testid="incoming">
          {incomingLine(view.preview)}
        </p>
        {warning && (
          <p className="mt-1 text-sm font-semibold text-[var(--tp-warn)]" data-testid="lethal-warning">
            {warning.line}
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
                className={`tp-arrive rounded-sm border-l-4 bg-[var(--tp-paper)] px-2 py-1 text-xs text-[var(--tp-paper-ink)] ${step.conclusion ? 'outline-2 outline-[var(--tp-accent)]' : ''}`}
                data-testid="argument-step"
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
          <Equation preview={preview} />
        </>
      )}
    </section>
  )
}

/**
 * Weight × Multiplier = product, then each step the engine applies, the last number being the damage (said once).
 * Each number ticks once as a card changes it; a number a card leaves alone stays still.
 */
function Equation({ preview }: { preview: ArgumentPreview }) {
  const damage = (
    <>
      <strong key={`damage-${preview.damage}`} className="tp-tick" data-testid="damage-preview">
        {preview.damage}
      </strong>{' '}
      damage
    </>
  )
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--tp-text)]" data-testid="equation">
      <span>
        Weight{' '}
        <strong key={`weight-${preview.weight}`} className="tp-tick">
          {preview.weight}
        </strong>{' '}
        × Multiplier{' '}
        <strong key={`multiplier-${preview.multiplier}`} className="tp-tick">
          {format(preview.multiplier)}
        </strong>
      </span>
      {preview.modifiers.map((m, i) => (
        <span key={`${i}-${m}`} className="tp-pop">
          <Chip>{m}</Chip>
        </span>
      ))}
      <span className={preview.chain.length === 0 ? 'text-base' : ''}>
        ={' '}
        {preview.chain.length === 0 ? (
          damage
        ) : (
          <strong key={`product-${preview.product}`} className="tp-tick">
            {preview.product}
          </strong>
        )}
      </span>
      {preview.chain.map((step, i) => (
        <span key={`${i}-${step.kind}`} className="contents" data-testid="chain-step">
          <span aria-hidden="true">→</span>
          <Chip tone={step.kind === 'guard' ? 'guard' : 'plain'}>{step.text}</Chip>
          <span className={i === preview.chain.length - 1 ? 'text-base' : ''}>= {i === preview.chain.length - 1 ? damage : <strong>{step.after}</strong>}</span>
        </span>
      ))}
      {preview.steps.length > 0 && preview.weight === 0 && preview.multiplier > 1 && (
        <Chip tone="note">
          <span data-testid="no-weight">No Weight yet: a Multiplier has nothing to multiply</span>
        </Chip>
      )}
      {preview.conclusionEmpty && (
        <Chip tone="note">
          <span data-testid="empty-conclusion">
            Conclusion: nothing to count {timesWord(preview.conclusionCount)}. Finish on a card with Weight or Multiplier.
          </span>
        </Chip>
      )}
      {preview.pierce && <Chip tone="good">Pierce: ignores Guard</Chip>}
      {preview.healedBack > 0 && <Chip tone="warn">It recovers {preview.healedBack}</Chip>}
      {preview.selfLoss > 0 && <Chip tone="warn">You lose {preview.selfLoss}</Chip>}
      {preview.growth > 0 && <Chip tone="warn">Its attacks +{preview.growth}</Chip>}
      {preview.unsettleTick > 0 && <Chip tone="good">Then Unsettle takes {preview.unsettleTick}</Chip>}
      {preview.unsettleHeld > 0 && (
        <Chip tone="good">
          <span data-testid="unsettle-held">The line holds back Unsettle {preview.unsettleHeld}: no halving this round</span>
        </Chip>
      )}
      {preview.shaken > 0 && <Chip tone="good">Shaken +{preview.shaken}</Chip>}
      {preview.released > 0 && (
        <Chip tone="good">
          It changes: Shaken {preview.released}, {releaseWords(preview.released)}
        </Chip>
      )}
      {preview.guard > 0 && (
        <Chip tone="guard">
          Your Guard {preview.guard}
          {preview.composure > 0 && <span className="font-normal">({preview.composure} from {preview.heldFocus} unspent Focus)</span>}
        </Chip>
      )}
      {preview.unsettle > 0 && <Chip tone="good">Unsettle +{preview.unsettle}</Chip>}
      {preview.ruleGuardNote && (
        <Chip tone="warn">
          <span data-testid="rule-guard">{preview.ruleGuardNote}</span>
        </Chip>
      )}
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

/**
 * On a phone the hand and End turn are pinned to the bottom of the screen. Their measured height becomes the page's
 * bottom scroll padding, so whatever keyboard focus or the browser scrolls to above them is placed clear of them;
 * the pinned cards cancel it with an equal negative margin, since they are always in view already.
 */
function useDockClearance() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dock = ref.current
    if (!dock) return
    const root = document.documentElement
    const fit = () => {
      const pinned = getComputedStyle(dock).position === 'sticky'
      root.style.setProperty(DOCK_VAR, pinned ? `${dock.offsetHeight}px` : '0px')
      root.style.scrollPaddingBottom = pinned ? `var(${DOCK_VAR})` : ''
    }
    const observer = new ResizeObserver(fit)
    observer.observe(dock)
    fit()
    return () => {
      observer.disconnect()
      root.style.removeProperty(DOCK_VAR)
      root.style.scrollPaddingBottom = ''
    }
  }, [])
  return ref
}

/**
 * Where keyboard focus goes after a play or a round: the card now at that place, or End turn when the hand is empty.
 * While a round replays the page is not scrolled to it, so the bias stays in view; it is brought into view once the replay ends.
 */
function useRefocus(hand: BattleState['hand'], replaying: boolean) {
  const handRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLButtonElement>(null)
  const refocus = useRef<number | null>(null)
  useEffect(() => {
    if (refocus.current === null) return
    const index = refocus.current
    refocus.current = null
    const cards = handRef.current?.querySelectorAll<HTMLButtonElement>(':scope > button') ?? []
    const target = cards.length > 0 ? cards[Math.min(index, cards.length - 1)] : endRef.current
    target?.focus({ preventScroll: replaying })
  }, [hand, replaying])
  useEffect(() => {
    if (replaying) return
    const active = document.activeElement
    if (active instanceof HTMLElement && handRef.current?.contains(active)) active.scrollIntoView({ block: 'nearest' })
  }, [replaying])
  return { handRef, endRef, refocus }
}

/**
 * On a phone the pinned dock covers the lower half of the screen, where the replay plays out. While it plays the dock shrinks
 * to one line and the page brings the replay up above it. With reduced motion the round is one still frame at once, so nothing scrolls.
 */
function useReplayInView(roundKey: string | null, replaying: boolean, dockRef: React.RefObject<HTMLDivElement | null>) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const replay = ref.current
    const dock = dockRef.current
    if (!replaying || !replay || !dock || !window.matchMedia(PHONE_QUERY).matches) return
    // The dock has already shrunk in this render; scroll only as far as it takes to bring the replay's end above it.
    const hidden = replay.getBoundingClientRect().bottom - dock.getBoundingClientRect().top
    if (hidden > 0) window.scrollBy({ top: hidden, behavior: 'smooth' })
  }, [roundKey, replaying, dockRef])
  return ref
}

/**
 * In a Gentle walk, one new idea at a time: the first idea this fight puts in front of you that has not been explained yet,
 * in one plain line. It stays up for the rest of the fight, and the next new idea can take its place from the next turn on.
 * The first fight's hints teach the basics, so nothing else is introduced during them.
 */
function useLesson(run: RunState, battle: BattleState, preview: ArgumentPreview, quiet: boolean): Lesson | null {
  const seen = useInsightStore((s) => s.seen)
  const learn = useInsightStore((s) => s.learn)
  const fight = run.stats.fights
  const [shown, setShown] = useState<{ fight: number; turn: number; lesson: Lesson } | null>(null)
  const current = shown?.fight === fight ? shown : null
  const fresh = run.mode === 'gentle' && !quiet ? lessonsIn(battle, preview).find((l) => !seen.includes(l)) : undefined
  if (fresh && fresh !== current?.lesson && (!current || current.turn < battle.turn)) setShown({ fight, turn: battle.turn, lesson: fresh })
  const lesson = current?.lesson ?? null
  useEffect(() => {
    if (lesson) learn(lesson)
  }, [lesson, learn])
  return lesson
}

export function BattleScreen({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const tutorialDone = useInsightStore((s) => s.tutorialDone)
  const reduced = useReducedMotion()
  const [inspected, setInspected] = useState<number | null>(null)
  const battle = run.battle as BattleState
  const preview = previewArgument(battle)
  const teachingBasics = !tutorialDone && battle.enemy.id === TUTORIAL_ENEMY
  const hint = teachingBasics ? tutorialHint(battle) : null
  const lesson = useLesson(run, battle, preview, teachingBasics)
  const report = battle.lastRound
  const roundKey = report ? `${run.stats.fights}-${report.turn}` : null
  const show = useRoundShow(roundKey, report, reduced)
  const { handRef, endRef, refocus } = useRefocus(battle.hand, !show.done)
  const view = panelView(battle, preview, useBeforeRound(battle, roundKey), show)
  const announcement = useAnnouncement(battle, preview)
  const skipShow = show.skip
  const dockRef = useDockClearance()
  const replaying = !show.done
  const playerResolve = shownResolve(battle, show)
  const playerHit = showProgress(show).now === 'act' && report ? report.playerLoss : 0
  const publish = useContext(PlayerShownContext)
  useLayoutEffect(() => publish({ resolve: playerResolve, hit: playerHit, roundKey }), [publish, playerResolve, playerHit, roundKey])
  useLayoutEffect(() => () => publish(null), [publish])
  const argumentRef = useReplayInView(roundKey, replaying, dockRef)

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
          if (handRef.current?.contains(document.activeElement)) refocus.current = Number(key) - 1
          apply((r) => battleAction(r, (b) => playCard(b, card.uid)))
        }
      } else if (key === 'u' || key === 'backspace') {
        event.preventDefault()
        apply((r) => battleAction(r, undoPlay))
      } else if (key === 'e') {
        event.preventDefault()
        wakeTones()
        refocus.current = 0
        apply((r) => battleAction(r, endTurn))
      } else if (key === 's' || key === 'escape') {
        skipShow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [skipShow, refocus, handRef])

  const inspectedCard = battle.hand.find((c) => c.uid === inspected)
  const inspectedDef = inspectedCard ? resolveCard(inspectedCard) : null
  const action = argueLabel(preview)
  const danger = lethal(battle, preview)

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <style>{SHOW_CSS}</style>
      <ThreatPanel battle={battle} view={view} known={run.known.includes(battle.enemy.id)} show={show} lastOfWalk={holdsNothingBack(run, battle.enemy.id)} />
      <div role="status" className={lesson ? undefined : 'sr-only'}>
        {lesson && <LessonNote lesson={lesson} />}
      </div>
      <div ref={argumentRef}>
        <ArgumentPanel battle={battle} preview={preview} show={show} reduced={reduced} />
      </div>

      <div
        ref={dockRef}
        className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-1.5 border-t border-[var(--tp-line)] bg-[var(--tp-ink)] px-4 pt-2 sm:static sm:mx-0 sm:gap-3 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 [&_*]:[scroll-margin-bottom:calc(-1*var(--tp-dock,0px))]"
        data-testid="hand-dock"
      >
        {hint && (
          <p role="status" className={`${replaying ? 'max-sm:hidden' : ''} rounded-md border border-[var(--tp-good)] bg-[var(--tp-ink-2)] px-3 py-1.5 text-sm text-[var(--tp-text)]`} data-testid="hint">
            {hint}
          </p>
        )}
        <section aria-label="Your hand" className={show.done ? undefined : 'max-sm:hidden'}>
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
          <div className="mt-1.5 min-h-[1.25rem] text-center text-xs text-[var(--tp-muted)]">
            {inspectedDef ? (
              <p className="max-sm:line-clamp-3">
                <span className="sm:hidden">
                  <strong>{inspectedDef.name}:</strong> {describeCard(inspectedDef).join(' ')}{' '}
                </span>
                {keywordsOnCard(inspectedDef)
                  .map((word) => `${word}: ${keywordText(word, run.school)}`)
                  .join('  ')}
              </p>
            ) : (
              <>
                <div className="hidden sm:block">
                  <KeyHints className="text-[var(--tp-muted)]">1–9 play a card, U undoes, E ends the turn, S skips the replay.</KeyHints>
                </div>
                <p className="sm:hidden">Tap a card to play it. Hold a card to read all of it.</p>
              </>
            )}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 bg-[var(--tp-ink)] pb-2 pr-16 sm:sticky sm:bottom-0 sm:z-10 sm:rounded-lg sm:border sm:border-[var(--tp-line)] sm:py-3 sm:pl-4 sm:pr-4">
          {replaying && (
            <p className="w-full text-sm text-[var(--tp-text)] sm:hidden" data-testid="dock-resolve">
              <PlayerResolve resolve={playerResolve} max={battle.player.maxResolve} hit={playerHit} roundKey={roundKey} />
            </p>
          )}
          <p className="w-full text-xs leading-snug text-[var(--tp-text)] sm:hidden" data-testid="intent-compact">
            {compactIntent(view.intent, view.preview)}
          </p>
          <div className={`${replaying ? 'max-sm:hidden' : ''} flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-[var(--tp-text)]`} data-testid="focus">
            <span className="mr-2 hidden sm:inline" data-testid="bar-resolve">
              <PlayerResolve resolve={playerResolve} max={battle.player.maxResolve} hit={playerHit} roundKey={roundKey} />
            </span>
            <Term word="Focus" />
            <span className="flex gap-1" aria-hidden="true">
              {Array.from({ length: Math.max(battle.focus, 3) }, (_, i) => (
                <span key={i} className={`h-3.5 w-3.5 border-2 border-[var(--tp-good)] ${i < battle.focus ? 'bg-[var(--tp-good)]' : ''}`} />
              ))}
            </span>
            <span>{battle.focus} left</span>
            <span className="text-xs text-[var(--tp-muted)]" data-testid="turn">
              Turn {battle.turn}
            </span>
            <span className="hidden text-xs text-[var(--tp-muted)] sm:inline">
              Draw pile {battle.drawPile.length} · Discard {battle.discardPile.length}
              {battle.exhausted.length > 0 && ` · Gone this fight ${battle.exhausted.length}`}
            </span>
          </div>
          <div className={`${replaying ? 'max-sm:hidden' : ''} flex gap-2`}>
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
              aria-label={`End turn: ${action}.${danger ? ` ${danger.line}` : ''}`}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)] sm:px-4 ${
                danger ? 'border-2 border-[var(--tp-warn)] bg-[var(--tp-ink)] text-[var(--tp-warn)]' : 'bg-[var(--tp-accent)] text-[var(--tp-on-accent)]'
              }`}
              data-testid="end-turn"
              data-danger={danger ? (danger.certain ? 'certain' : 'risk') : undefined}
            >
              End turn <span className="hidden text-xs sm:inline">(E)</span>
              <span className="block text-xs font-normal">
                {action}
                {danger && <strong className="font-semibold"> · {danger.short}</strong>}
              </span>
            </button>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" data-testid="announcer">
        {announcement}
      </p>
    </div>
  )
}
