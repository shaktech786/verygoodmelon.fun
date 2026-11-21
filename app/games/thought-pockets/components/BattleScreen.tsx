'use client'

import { useEffect, useState } from 'react'
import { ArgumentPreview, BattleState, EnemyMove, RoundReport, RunState, StepView } from '@/types/thought-pockets'
import { COMPOSURE_GUARD, KNOWN_UNSETTLE, canPlay, cardCost, currentMove, endTurn, incomingDamage, playCard, previewArgument, undoPlay } from '@/lib/games/thought-pockets/engine/battle'
import { battleAction } from '@/lib/games/thought-pockets/engine/run'
import { resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { TUTORIAL_ENEMY, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { KEYWORDS } from '@/lib/games/thought-pockets/data/keywords'
import { useInsightStore, useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { CardFace, TYPE_COLORS, keywordsOnCard } from './CardFace'
import { BiasPortrait } from './Sprites'
import { Term } from './Term'

const TIER_LABELS = { normal: 'Bias', elite: 'Stubborn bias', boss: 'Philosophical problem' }
const ASK_LABELS = { evidence: 'Evidence', logic: 'Logic', guard: 'Guard' }
const REVEAL_STEP_MS = 180

function format(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/0$/, '')
}

function intentText(move: EnemyMove, battle: BattleState): string[] {
  const parts: string[] = []
  if (move.attack) {
    const hit = incomingDamage(battle, 0)
    parts.push(hit.hits > 1 ? `Attack ${hit.perHit} × ${hit.hits}` : `Attack ${hit.perHit}`)
  }
  if (move.guard) parts.push(`Guard ${move.guard}`)
  if (move.addDoubt) parts.push('Add a Doubt to your draw pile')
  if (move.asks) parts.push(`Asks for ${ASK_LABELS[move.asks]}`)
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

function ThreatPanel({ battle, preview, known }: { battle: BattleState; preview: ArgumentPreview; known: boolean }) {
  const def = getEnemyDef(battle.enemy.id)
  const move = currentMove(battle)
  const willDie = preview.damage - preview.healedBack >= battle.enemy.health
  return (
    <section aria-label="Opponent" className="grid gap-2 rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-2.5 sm:grid-cols-[1fr_15rem] sm:gap-3 sm:p-4">
      <div className="flex gap-3">
        <BiasPortrait enemyId={def.id} tier={def.tier} className="h-14 w-14 shrink-0 sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] uppercase tracking-wider text-[var(--tp-muted)]">{TIER_LABELS[def.tier]}</p>
          <h2 className="font-serif text-lg font-semibold leading-tight text-[var(--tp-text)] sm:text-xl" data-testid="enemy-name">
            {def.name}
          </h2>
          <p className="mt-0.5 text-[0.8rem] leading-snug text-[var(--tp-text)] sm:text-sm" data-testid="enemy-rule">
            {def.ruleText}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 sm:row-start-2">
        <div className="flex items-center gap-2 text-sm text-[var(--tp-text)]">
          <span className="whitespace-nowrap">
            <Term word="Resolve" /> <span data-testid="enemy-resolve">{battle.enemy.health}</span>/{battle.enemy.maxHealth}
          </span>
          <Bar value={battle.enemy.health} max={battle.enemy.maxHealth} color="var(--tp-enemy-bar)" label={`${def.name} Resolve`} />
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
              You have named this one before, so it starts Unsettled {KNOWN_UNSETTLE}.
            </span>
          )}
        </div>
      </div>
      <div
        className="flex flex-wrap items-baseline gap-x-2 rounded-md border border-[var(--tp-line)] bg-[var(--tp-ink)] px-2.5 py-1.5 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:block sm:p-3"
        data-testid="intent"
      >
        <p className="text-[0.68rem] uppercase tracking-wider text-[var(--tp-muted)]">Next, it will</p>
        <p className="font-serif text-base font-semibold text-[var(--tp-text)] sm:text-lg">{intentText(move, battle).join(' · ') || 'Wait'}</p>
        <p className="w-full text-sm text-[var(--tp-text)]" data-testid="incoming">
          {willDie
            ? 'Your argument will end this before it acts.'
            : preview.postpone
              ? 'Postponed: it will not act this round.'
              : preview.incoming === 0
                ? 'No attack this round.'
                : preview.incomingAfterGuard === 0
                  ? `As it stands, your Guard blocks all ${preview.incoming}.`
                  : `As it stands, you will lose ${preview.incomingAfterGuard}${preview.guard > 0 ? ` (Guard absorbs ${Math.min(preview.guard, preview.incoming)})` : ''}.`}
        </p>
        {!willDie && preview.incomingAfterGuard + preview.selfLoss >= battle.player.resolve && (
          <p className="mt-1 text-sm font-semibold text-[var(--tp-warn)]" data-testid="lethal-warning">
            That is all your Resolve. Guard, hold back Focus, or end it first.
          </p>
        )}
      </div>
    </section>
  )
}

function ArgumentPanel({ battle, preview }: { battle: BattleState; preview: ArgumentPreview }) {
  const empty = battle.played.length === 0
  return (
    <section aria-label="Your argument" className="rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-2.5 sm:p-4" data-testid="argument">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-base font-semibold text-[var(--tp-text)] sm:text-lg">Your argument</h2>
        <p className="hidden text-xs text-[var(--tp-muted)] sm:block">
          <Term word="Weight" /> × <Term word="Multiplier" />, last card is the <Term word="Conclusion" />
        </p>
      </div>
      {empty && battle.lastRound ? (
        <LastRound report={battle.lastRound} />
      ) : (
        <>
          <ol className="mt-1.5 flex min-h-[2rem] flex-wrap gap-1.5" aria-label="Cards in your argument, in order">
            {preview.carriedWeight > 0 && (
              <li className="rounded-sm border border-dashed border-[var(--tp-line)] px-2 py-1 text-xs text-[var(--tp-text)]">Leftover Guard +{preview.carriedWeight} Weight</li>
            )}
            {preview.doubtWeight > 0 && (
              <li className="rounded-sm border border-dashed border-[var(--tp-line)] px-2 py-1 text-xs text-[var(--tp-text)]">Doubts in hand +{preview.doubtWeight} Weight</li>
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
      {preview.pierce && <Chip tone="good">Pierce: ignores Guard</Chip>}
      {preview.blocked > 0 && <Chip tone="guard">Its Guard absorbs {preview.blocked}</Chip>}
      <span aria-hidden="true">→</span>
      <span className="text-base">
        <strong data-testid="damage-preview">{preview.damage}</strong> damage
      </span>
      {preview.healedBack > 0 && <Chip tone="warn">It recovers {preview.healedBack}</Chip>}
      {preview.selfLoss > 0 && <Chip tone="warn">You lose {preview.selfLoss}</Chip>}
      {preview.growth > 0 && <Chip tone="warn">Its attacks +{preview.growth}</Chip>}
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

function LastRound({ report }: { report: RoundReport }) {
  const reduced = useReducedMotion()
  const delay = (i: number) => (reduced ? undefined : `${i * REVEAL_STEP_MS}ms`)
  const runningWeight = report.steps.map((_, i) => report.steps.slice(0, i + 1).reduce((sum, s) => sum + s.weight, 0))
  return (
    <div key={report.turn} className="mt-1.5 text-sm text-[var(--tp-text)]" data-testid="last-round">
      <p className="text-[0.68rem] uppercase tracking-wider text-[var(--tp-muted)]">Last round</p>
      <ol className="mt-1 flex flex-wrap gap-1.5">
        {report.steps.map((step, i) => (
          <li
            key={step.uid}
            className="tp-reveal rounded-sm border-l-4 bg-[var(--tp-paper)] px-2 py-1 text-xs text-[var(--tp-paper-ink)]"
            style={{ borderLeftColor: TYPE_COLORS[step.type], animationDelay: delay(i) }}
          >
            <span className="font-semibold">{step.name}</span> {stepValue(step)}
            {step.weight > 0 && <span className="text-[var(--tp-paper-muted)]"> (Weight {runningWeight[i]})</span>}
          </li>
        ))}
      </ol>
      <p className="tp-reveal mt-1.5" style={{ animationDelay: delay(report.steps.length) }}>
        {report.steps.length === 0 ? (
          'You made no argument.'
        ) : (
          <>
            {report.weight} × {format(report.multiplier)} = {report.product}
            {report.modifiers.length > 0 && <> ({report.modifiers.join('; ')}) = {report.raw}</>}
            {report.blocked > 0 && (
              <>
                , its Guard absorbed {report.blocked}
                {report.guardBroken && <strong className="ml-1 rounded-sm border border-[var(--tp-guard)] px-1 text-[var(--tp-guard)]">Guard broken</strong>}
              </>
            )}
            {' → '}
            <strong className="text-lg text-[var(--tp-accent)]">{report.damage} damage</strong>
            {report.healedBack > 0 && <> (it recovered {report.healedBack})</>}
            {report.selfLoss > 0 && <>; you lost {report.selfLoss} to Backfire</>}
            {report.growth > 0 && <>; repeating yourself made its attacks +{report.growth}</>}
          </>
        )}
      </p>
      <p className="tp-reveal mt-1" style={{ animationDelay: delay(report.steps.length + 1) }}>
        {report.postponed
          ? 'It was postponed and did nothing.'
          : report.enemyAttack > 0
            ? `It attacked for ${report.enemyAttack}${report.enemyBlocked > 0 ? `, your Guard absorbed ${report.enemyBlocked}` : ''}: you lost ${report.playerLoss}.`
            : 'It did not attack.'}
        {report.enemyGuardGained > 0 && ` It raised ${report.enemyGuardGained} Guard.`}
        {report.doubtsAdded > 0 && ' A Doubt went into your draw pile.'}
        {report.unsettleLoss > 0 && ` Unsettled, it lost ${report.unsettleLoss}.`}
      </p>
    </div>
  )
}

function tutorialHint(battle: BattleState, preview: ArgumentPreview): string | null {
  const defs = battle.played.map(resolveCard)
  const playable = battle.hand.filter((c) => canPlay(battle, c.uid)).map(resolveCard)
  if (battle.turn === 1 && defs.length === 0) return 'Play an Evidence card: tap it, or press its number. It adds Weight to your argument.'
  if (battle.turn === 1 && !defs.some((d) => d.type === 'logic') && playable.some((d) => d.type === 'logic'))
    return 'Now add a Logic card. It raises the Multiplier, and the damage preview updates.'
  if (preview.incomingAfterGuard > 0 && playable.some((d) => d.type === 'guard'))
    return `It will hit you for ${preview.incoming}. A Guard card absorbs that this round.`
  if (preview.incomingAfterGuard > 0 && battle.focus > 0)
    return `No Guard card in hand? Each Focus you leave unspent becomes ${COMPOSURE_GUARD} Guard. Holding back is a choice too.`
  if (battle.turn === 2 && defs.length === 0) return 'Your last card is your Conclusion: its number counts twice. Finish with your strongest card.'
  if (playable.length === 0 || battle.focus === 0) return 'Press End turn. Your argument lands, then it acts.'
  return null
}

export function BattleScreen({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const tutorialDone = useInsightStore((s) => s.tutorialDone)
  const [inspected, setInspected] = useState<number | null>(null)
  const battle = run.battle as BattleState
  const preview = previewArgument(battle)
  const showHints = !tutorialDone && battle.enemy.id === TUTORIAL_ENEMY
  const hint = showHints ? tutorialHint(battle, preview) : null

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
          apply((r) => battleAction(r, (b) => playCard(b, card.uid)))
        }
      } else if (key === 'u' || key === 'backspace') {
        event.preventDefault()
        apply((r) => battleAction(r, undoPlay))
      } else if (key === 'e') {
        event.preventDefault()
        apply((r) => battleAction(r, endTurn))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const inspectedCard = battle.hand.find((c) => c.uid === inspected)
  const inspectedDef = inspectedCard ? resolveCard(inspectedCard) : null
  const report = battle.lastRound
  const nothingPlayed = preview.steps.length === 0 && preview.carriedWeight + preview.doubtWeight === 0

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <style>{`
        @keyframes tp-reveal { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: no-preference) { html:not([data-reduce-motion="true"]) .tp-reveal { animation: tp-reveal 260ms ease-out both; } }
      `}</style>
      <ThreatPanel battle={battle} preview={preview} known={run.known.includes(battle.enemy.id)} />
      <ArgumentPanel battle={battle} preview={preview} />

      {hint && (
        <p role="status" className="rounded-md border border-[var(--tp-accent)] bg-[var(--tp-ink-2)] px-3 py-1.5 text-sm text-[var(--tp-text)]" data-testid="hint">
          {hint}
        </p>
      )}

      <section aria-label="Your hand">
        <h2 className="sr-only">Your hand</h2>
        <div className="grid grid-cols-3 justify-items-center gap-2 sm:flex sm:flex-wrap sm:justify-center" data-testid="hand">
          {battle.hand.map((card, i) => {
            const def = resolveCard(card)
            return (
              <CardFace
                key={card.uid}
                card={def}
                freeNote={cardCost(battle, card) < def.cost ? 'Free as first Logic' : undefined}
                hotkey={i < 9 ? i + 1 : undefined}
                disabled={!canPlay(battle, card.uid)}
                onActivate={() => act((r) => battleAction(r, (b) => playCard(b, card.uid)))}
                onInspect={() => setInspected(card.uid)}
              />
            )
          })}
          {battle.hand.length === 0 && <p className="col-span-3 py-6 text-sm text-[var(--tp-muted)]">Your hand is empty.</p>}
        </div>
        <p className="mt-2 min-h-[1.25rem] text-center text-xs text-[var(--tp-muted)]" aria-live="polite">
          {inspectedDef && keywordsOnCard(inspectedDef).length > 0
            ? keywordsOnCard(inspectedDef)
                .map((word) => `${word}: ${KEYWORDS[word]}`)
                .join('  ')
            : (
              <>
                <span className="hidden sm:inline">Keys: 1–9 play a card, U undoes, E ends the turn.</span>
                <span className="sm:hidden">Tap a card to play it. Hold a card to read its keywords.</span>
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
            type="button"
            onClick={() => act((r) => battleAction(r, endTurn))}
            className="rounded-md bg-[var(--tp-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--tp-on-accent)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)] sm:px-4"
            data-testid="end-turn"
          >
            End turn <span className="hidden text-xs sm:inline">(E)</span>
            <span className="block text-xs font-normal">{nothingPlayed ? (preview.composure > 0 ? `Hold: ${preview.composure} Guard` : 'No argument') : `Argue for ${preview.damage}`}</span>
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {report
          ? `Last round: you dealt ${report.damage} damage. ${report.enemyAttack > 0 ? `It attacked for ${report.enemyAttack}, you lost ${report.playerLoss}.` : ''}`
          : ''}
      </p>
    </div>
  )
}
