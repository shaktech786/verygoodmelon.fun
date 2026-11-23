'use client'

import { useEffect, useState } from 'react'
import { CardInstance, CardType, EnemyDef, EventId, RelicId, RunState } from '@/types/thought-pockets'
import { TYPE_LABELS, canUpgrade, getCardDef, resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { getRelicDef } from '@/lib/games/thought-pockets/data/relics'
import { getEventDef } from '@/lib/games/thought-pockets/data/events'
import { getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { fitsLabel } from '@/lib/games/thought-pockets/data/synergy'
import { finalRoundWords } from '@/lib/games/thought-pockets/data/turnText'
import {
  buyCard,
  buyRelic,
  buyTea,
  cancelPick,
  chooseEvent,
  eventChoiceAvailable,
  isLastFloor,
  leaveEvent,
  leaveReward,
  leaveShop,
  pickCard,
  restAmount,
  restHeal,
  skipCards,
  startRestRemoval,
  startRestUpgrade,
  startShopRemoval,
  takeCard,
  takeRelic,
} from '@/lib/games/thought-pockets/engine/run'
import { TEA_HEAL } from '@/lib/games/thought-pockets/engine/economy'
import { COPY_PRICE } from '@/lib/games/thought-pockets/data/events'
import { Lesson, lessonsOnCards } from '@/lib/games/thought-pockets/engine/lessons'
import { useInsightStore, useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { CardFace } from './CardFace'
import { LessonNote } from './Term'
import { NodeGlyph } from './Glyphs'
import { BiasPortrait } from './Sprites'
import { RoundShow, breakBeat, showProgress, useRoundShow } from './RoundShow'
import { SHOW_CSS } from './BattleScreen'

const PICKER_TEXT = {
  upgrade: { title: 'Choose one card to improve', note: 'Only this copy changes. The preview shows the improved version.', verb: 'Improve' },
  remove: { title: 'Choose one card to let go', note: 'Only this copy leaves your deck.', verb: 'Remove' },
  copy: { title: 'Choose one card to copy', note: `A copy joins your deck for ${COPY_PRICE} gold.`, verb: 'Copy' },
} as const

/** Encounter choices that take one of the cards on offer. */
const CARD_CHOICES: Partial<Record<EventId, string>> = { lecture: 'attend', archive: 'dig', study_group: 'learn' }

const panel = 'rounded-lg border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-4 text-[var(--tp-text)]'
export const primaryButton =
  'rounded-md bg-[var(--tp-accent)] px-4 py-2 text-sm font-semibold text-[var(--tp-on-accent)] hover:brightness-110 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)]'
export const quietButton =
  'rounded-md border border-[var(--tp-line)] px-4 py-2 text-sm text-[var(--tp-text)] hover:bg-[var(--tp-ink)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-focus)]'

export function RelicTile({ relicId, children }: { relicId: RelicId; children?: React.ReactNode }) {
  const relic = getRelicDef(relicId)
  return (
    <div className="flex w-full max-w-xs flex-col gap-1 rounded-md border-2 border-[var(--tp-logic)] bg-[var(--tp-paper)] p-3 text-[var(--tp-paper-ink)] shadow-[3px_3px_0_0_var(--tp-shadow)]">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--tp-paper-muted)]">{relic.ruleBending ? 'Relic · bends a rule' : 'Relic'}</p>
      <p className="font-serif text-base font-semibold">{relic.name}</p>
      <p className="text-sm leading-snug">{relic.text}</p>
      <p className="text-xs italic text-[var(--tp-paper-muted)]">{relic.flavor}</p>
      {children}
    </div>
  )
}

/** Shown in place of a screen while you choose one specific card copy to upgrade or remove. */
function DeckPicker({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const purpose = run.pick ?? 'remove'
  const upgrading = purpose === 'upgrade'
  const text = PICKER_TEXT[purpose]
  const cards = run.deck.filter((c) => (upgrading ? canUpgrade(c) : purpose === 'copy' ? resolveCard(c).type !== 'doubt' : true))
  return (
    <section className={panel} aria-labelledby="picker-title">
      <h2 id="picker-title" className="font-serif text-xl font-semibold">
        {text.title}
      </h2>
      <p className="mt-1 text-sm text-[var(--tp-muted)]">{text.note}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2" data-testid="deck-picker">
        {cards.map((card: CardInstance) => {
          const shown = upgrading ? resolveCard({ ...card, upgraded: true }) : resolveCard(card)
          return (
            <CardFace
              key={card.uid}
              card={shown}
              size="compact"
              label={`${text.verb} ${resolveCard(card).name}${upgrading ? `, becoming ${shown.name}` : ''}`}
              onActivate={() => act((r) => pickCard(r, card.uid))}
            />
          )
        })}
      </div>
      <button type="button" className={`${quietButton} mt-4`} onClick={() => act(cancelPick)}>
        Never mind
      </button>
    </section>
  )
}

function deckMix(run: RunState): string {
  const counts = new Map<CardType, number>()
  for (const card of run.deck) {
    const type = resolveCard(card).type
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }
  return [...counts.entries()].map(([type, n]) => `${n} ${TYPE_LABELS[type]}`).join(', ')
}

/** Every crack the portrait has: a bias that has given way shows them all. */
const ALL_CRACKS = 3

/**
 * The argument that won the fight, played once more, and the bias giving way to it: as the winning hit lands its portrait
 * cracks through, settles and sinks, and what it taught you comes up. Then the biases named so far on this walk, the newest
 * last. With reduced motion the replay is one still frame, so the portrait is already broken and everything shows at once.
 * The words are on the page from the start, quieter until it gives way (a screen reader reads them where they are, once).
 */
function FightEnd({ run, foe }: { run: RunState; foe: EnemyDef }) {
  const reduced = useReducedMotion()
  const report = run.reward?.finalRound ?? null
  const show = useRoundShow(report ? `final-${run.stats.fights}` : null, report, reduced)
  const { reached } = showProgress(show)
  const beat = report ? breakBeat(report) : null
  const broken = show.done || (beat !== null && show.beats.includes(beat) && reached(beat))
  const moving = broken && !show.done
  const words = report ? finalRoundWords(report) : null
  const named = run.beaten.map(getEnemyDef)
  return (
    <>
      {report && words && (
        <div className="mt-2 rounded-md border border-[var(--tp-line)] p-2.5" data-testid="final-argument">
          <RoundShow report={report} show={show} reduced={reduced} aftermath={[`${foe.name} has no answer left.`]} title={words.title} noArgument={words.noArgument} />
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 rounded-md bg-[var(--tp-ink)] p-2" data-testid="insight" data-broken={broken || undefined}>
        <span className="relative shrink-0">
          <span key={broken ? 'broken' : 'whole'} className={`block ${moving ? 'tp-break' : ''}`}>
            <BiasPortrait enemyId={foe.id} tier={foe.tier} mood={broken ? 'gives' : 'shaken'} cracks={broken ? ALL_CRACKS : 0} className="h-12 w-12" />
          </span>
          {moving && <span className="tp-ring pointer-events-none absolute inset-0 border-2 border-[var(--tp-good)]" aria-hidden="true" />}
        </span>
        <p className={`text-sm ${broken ? (moving ? 'tp-appear' : '') : 'text-[var(--tp-muted)]'}`}>
          <span className="font-semibold">What {foe.name} taught you:</span> {foe.insight}
        </p>
      </div>
      {named.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--tp-muted)]" data-testid="named-so-far">
          <span>Named on this walk</span>
          <ul className="flex flex-wrap gap-1" aria-label="Biases named on this walk">
            {named.map((def) => {
              const newest = def.id === foe.id
              return (
                <li key={def.id} className={newest && moving ? 'tp-arrive' : newest && !broken ? 'opacity-0' : ''}>
                  <BiasPortrait enemyId={def.id} tier={def.tier} mood="gives" className="h-6 w-6" />
                  <span className="sr-only">{def.name}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}

/**
 * In a Gentle walk, the first new word among the offered cards, explained in one line. It is the same word for as long as this
 * screen is open, and counts as explained from then on.
 */
function useCardLesson(run: RunState, cardIds: string[]): Lesson | null {
  const learn = useInsightStore((s) => s.learn)
  const [lesson] = useState(() => {
    if (run.mode !== 'gentle') return null
    const { seen } = useInsightStore.getState()
    return lessonsOnCards(cardIds.map(getCardDef)).find((l) => !seen.includes(l)) ?? null
  })
  useEffect(() => {
    if (lesson) learn(lesson)
  }, [lesson, learn])
  return lesson
}

const REWARD_TITLES = { battle: 'You made your point', elite: 'A hard argument, won', boss: 'Floor complete', treasure: 'Treasure', rest: 'A quiet place' } as const

export function RewardScreen({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const reward = run.reward
  const lesson = useCardLesson(run, reward && !reward.cardTaken ? reward.cardChoices : [])
  if (!reward) return null
  const last = reward.source === 'boss' && isLastFloor(run)
  const enemyId = reward.source === 'treasure' || reward.source === 'rest' ? undefined : run.map.find((n) => n.id === run.position)?.enemyId
  const foe = enemyId ? getEnemyDef(enemyId) : null
  const lastTitle = run.length === 'short' && foe ? `${foe.name} lets you go, for now` : 'The last question, answered for now'
  const title = last ? lastTitle : REWARD_TITLES[reward.source]
  const study = reward.source === 'rest'
  return (
    <section className={panel} aria-labelledby="reward-title">
      <h2 id="reward-title" className={`font-serif text-2xl font-semibold ${study ? 'flex items-center gap-2' : ''}`}>
        {study && <NodeGlyph type="rest" className="h-7 w-7 text-[var(--tp-logic)]" />}
        {title}
      </h2>
      {study && (
        <p className="mt-1 text-sm" data-testid="study-note">
          Before you rest, a moment to think. The problem ahead ends the walk, so this is your last card to build on. Then you rest.
        </p>
      )}
      <style>{SHOW_CSS}</style>
      {foe && <FightEnd run={run} foe={foe} />}
      {reward.gold > 0 && <p className="mt-2">+{reward.gold} gold.</p>}
      {reward.relicChoices.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">{reward.relicChoices.length > 1 ? 'Choose a relic' : 'A relic'}</h3>
          {reward.source === 'boss' && reward.relicChoices.some((id) => getRelicDef(id).ruleBending) && (
            <p className="text-sm text-[var(--tp-muted)]" data-testid="rule-bending-note">
              A philosophical problem leaves something stranger behind: relics that bend a rule of the game, for better and for worse.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3">
            {reward.relicChoices.map((relicId) => (
              <RelicTile key={relicId} relicId={relicId}>
                <button
                  type="button"
                  className={`${primaryButton} mt-2`}
                  disabled={reward.relicTaken}
                  onClick={() => act((r) => takeRelic(r, relicId))}
                >
                  {run.relics.includes(relicId) ? 'Taken' : 'Take'}
                </button>
              </RelicTile>
            ))}
          </div>
        </div>
      )}
      {reward.cardChoices.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">{reward.cardTaken ? 'Card chosen' : 'Add one card to your deck, or skip'}</h3>
          {lesson && (
            <div className="mt-1">
              <LessonNote lesson={lesson} />
            </div>
          )}
          <p className="text-sm text-[var(--tp-muted)]">
            Your deck: {deckMix(run)}. Logic only multiplies the Weight that Evidence brings, and a smaller deck draws its best cards more often, so skipping is a real choice.
          </p>
          <div className="mt-2 flex flex-wrap gap-2" data-testid="card-choices">
            {reward.cardChoices.map((cardId) => (
              <CardFace
                key={cardId}
                card={getCardDef(cardId)}
                disabled={reward.cardTaken}
                label={`Take ${getCardDef(cardId).name}`}
                fits={fitsLabel(cardId, run)}
                onActivate={() => act((r) => takeCard(r, cardId))}
              />
            ))}
          </div>
          {!reward.cardTaken && (
            <button type="button" className={`${quietButton} mt-3`} onClick={() => act(skipCards)}>
              Skip the card
            </button>
          )}
        </div>
      )}
      {reward.source === 'boss' && !last && (
        <p className="mt-4 text-sm text-[var(--tp-muted)]" data-testid="pause-note">
          This stretch of the walk is done. Your walk is saved, so this is a good place to stop and come back another day.
        </p>
      )}
      <button type="button" className={`${primaryButton} mt-5`} onClick={() => act(leaveReward)} data-testid="continue">
        {last ? 'Finish the walk' : reward.source === 'boss' ? 'On to the next floor' : study ? 'On to rest' : 'Continue'}
        {(!reward.cardTaken || !reward.relicTaken) && (study ? ' without a card' : ' (leave the rest)')}
      </button>
    </section>
  )
}

export function ShopScreen({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const shop = run.shop
  if (run.pick) return <DeckPicker run={run} />
  if (!shop) return null
  return (
    <section className={panel} aria-labelledby="shop-title">
      <h2 id="shop-title" className="flex items-center gap-2 font-serif text-2xl font-semibold">
        <NodeGlyph type="shop" className="h-7 w-7 text-[var(--tp-logic)]" />
        The Bookshop
      </h2>
      <p className="mt-1 text-sm">You have {run.gold} gold. You will not afford everything.</p>
      <div className="mt-3 flex flex-wrap gap-3" data-testid="shop-cards">
        {shop.cards.map((item, i) => {
          const def = getCardDef(item.cardId)
          return (
            <div key={item.cardId} className="flex flex-col items-center gap-1">
              <CardFace
                card={def}
                disabled={item.sold || run.gold < item.price}
                label={item.sold ? `${def.name}, sold` : `Buy ${def.name} for ${item.price} gold`}
                fits={item.sold ? null : fitsLabel(item.cardId, run)}
                onActivate={() => act((r) => buyCard(r, i))}
              />
              <span className="text-sm">{item.sold ? 'Sold' : `${item.price} gold`}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {shop.relics.map((item, i) => (
          <RelicTile key={item.relicId} relicId={item.relicId}>
            <button type="button" className={`${primaryButton} mt-2`} disabled={item.sold || run.gold < item.price} onClick={() => act((r) => buyRelic(r, i))}>
              {item.sold ? 'Sold' : `Buy for ${item.price} gold`}
            </button>
          </RelicTile>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={quietButton}
          disabled={shop.teaTaken || run.gold < shop.teaPrice || run.resolve >= run.maxResolve}
          onClick={() => act(buyTea)}
          data-testid="shop-tea"
        >
          {shop.teaTaken ? 'Tea finished' : `Reading room tea: restore ${Math.min(TEA_HEAL, run.maxResolve - run.resolve)} Resolve, ${shop.teaPrice} gold`}
        </button>
        <button
          type="button"
          className={quietButton}
          disabled={shop.removed || run.gold < shop.removePrice}
          onClick={() => act(startShopRemoval)}
          data-testid="shop-remove"
        >
          {shop.removed ? 'Card removed' : `Remove a card: ${shop.removePrice} gold`}
        </button>
        <button type="button" className={primaryButton} onClick={() => act(leaveShop)} data-testid="continue">
          Leave the shop
        </button>
      </div>
    </section>
  )
}

export function RestScreen({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  if (run.pick) return <DeckPicker run={run} />
  const heal = restAmount(run)
  return (
    <section className={panel} aria-labelledby="rest-title">
      <h2 id="rest-title" className="flex items-center gap-2 font-serif text-2xl font-semibold">
        <NodeGlyph type="rest" className="h-7 w-7 text-[var(--tp-logic)]" />
        A quiet place
      </h2>
      <p className="mt-1 text-sm">Choose one.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={primaryButton} onClick={() => act(restHeal)} disabled={heal === 0} data-testid="rest-heal">
          {heal === 0 ? `Rest: no Resolve back at Rigorous ${run.rigor}` : `Rest: restore ${Math.min(heal, run.maxResolve - run.resolve)} Resolve`}
        </button>
        <button type="button" className={quietButton} onClick={() => act(startRestUpgrade)} disabled={!run.deck.some(canUpgrade)} data-testid="rest-upgrade">
          Study: improve one card
        </button>
        <button type="button" className={quietButton} onClick={() => act(startRestRemoval)} disabled={run.deck.length <= 1} data-testid="rest-remove">
          Let go: remove one card
        </button>
      </div>
    </section>
  )
}

export function EventScreen({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const event = run.event
  if (run.pick) return <DeckPicker run={run} />
  if (!event) return null
  const def = getEventDef(event.eventId)
  return (
    <section className={panel} aria-labelledby="event-title">
      <h2 id="event-title" className="flex items-center gap-2 font-serif text-2xl font-semibold">
        <NodeGlyph type="event" className="h-7 w-7 text-[var(--tp-logic)]" />
        {def.name}
      </h2>
      <p className="mt-2 max-w-prose leading-relaxed">{def.text}</p>
      {event.relicOffer && !event.result && (
        <div className="mt-3">
          <RelicTile relicId={event.relicOffer} />
        </div>
      )}
      {event.result ? (
        <>
          <p className="mt-4 font-semibold" role="status">
            {event.result}
          </p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => act(leaveEvent)} data-testid="continue">
            Continue
          </button>
        </>
      ) : (
        <ul className="mt-4 space-y-3">
          {def.choices.map((choice) => {
            const available = eventChoiceAvailable(run, choice.id)
            if (CARD_CHOICES[event.eventId] === choice.id) {
              return (
                <li key={choice.id}>
                  <p className="font-semibold">{choice.label}</p>
                  <p className="text-sm text-[var(--tp-muted)]">{choice.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {event.cardOffer.map((cardId) => (
                      <CardFace
                        key={cardId}
                        card={getCardDef(cardId)}
                        label={`${choice.label}: take ${getCardDef(cardId).name}`}
                        fits={fitsLabel(cardId, run)}
                        disabled={!available}
                        onActivate={() => act((r) => chooseEvent(r, choice.id, cardId))}
                      />
                    ))}
                  </div>
                </li>
              )
            }
            return (
              <li key={choice.id}>
                <button
                  type="button"
                  className={`${quietButton} w-full text-left sm:w-auto`}
                  disabled={!available}
                  onClick={() => act((r) => chooseEvent(r, choice.id))}
                  data-testid={`choice-${choice.id}`}
                >
                  <span className="block font-semibold">{choice.label}</span>
                  <span className="block text-xs text-[var(--tp-muted)]">{choice.detail}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
