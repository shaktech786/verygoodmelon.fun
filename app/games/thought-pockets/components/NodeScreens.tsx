'use client'

import { CardInstance, RelicId, RunState } from '@/types/thought-pockets'
import { canUpgrade, getCardDef, resolveCard } from '@/lib/games/thought-pockets/data/cards'
import { getRelicDef } from '@/lib/games/thought-pockets/data/relics'
import { getEventDef } from '@/lib/games/thought-pockets/data/events'
import {
  REST_HEAL_PERCENT,
  buyCard,
  buyRelic,
  cancelPick,
  chooseEvent,
  eventChoiceAvailable,
  leaveEvent,
  leaveReward,
  leaveShop,
  pickCard,
  restHeal,
  skipCards,
  startRestUpgrade,
  startShopRemoval,
  takeCard,
  takeRelic,
} from '@/lib/games/thought-pockets/engine/run'
import { useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { CardFace } from './CardFace'

const panel = 'rounded-xl border border-[var(--tp-line)] bg-[var(--tp-ink-2)] p-4 text-[var(--tp-text)]'
export const primaryButton =
  'rounded-lg bg-[var(--tp-accent)] px-4 py-2 text-sm font-semibold text-[var(--tp-ink)] hover:brightness-110 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tp-text)]'
export const quietButton =
  'rounded-lg border border-[var(--tp-line)] px-4 py-2 text-sm text-[var(--tp-text)] hover:bg-white/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[var(--tp-accent)]'

export function RelicTile({ relicId, children }: { relicId: RelicId; children?: React.ReactNode }) {
  const relic = getRelicDef(relicId)
  return (
    <div className="flex w-full max-w-xs flex-col gap-1 rounded-lg border-2 border-[var(--tp-accent)] bg-[var(--tp-paper)] p-3 text-[var(--tp-paper-ink)]">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#6b5326]">Relic</p>
      <p className="font-serif text-base font-semibold">{relic.name}</p>
      <p className="text-sm leading-snug">{relic.text}</p>
      <p className="text-xs italic text-[#5a4c3a]">{relic.flavor}</p>
      {children}
    </div>
  )
}

/** Shown in place of a screen while you choose one specific card copy to upgrade or remove. */
function DeckPicker({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const upgrading = run.pick === 'upgrade'
  const cards = run.deck.filter((c) => (upgrading ? canUpgrade(c) : true))
  return (
    <section className={panel} aria-labelledby="picker-title">
      <h2 id="picker-title" className="font-serif text-xl font-semibold">
        {upgrading ? 'Choose one card to improve' : 'Choose one card to remove'}
      </h2>
      <p className="mt-1 text-sm text-[var(--tp-muted)]">
        {upgrading ? 'Only this copy changes. The preview shows the improved version.' : 'Only this copy leaves your deck.'}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2" data-testid="deck-picker">
        {cards.map((card: CardInstance) => {
          const shown = upgrading ? resolveCard({ ...card, upgraded: true }) : resolveCard(card)
          return (
            <CardFace
              key={card.uid}
              card={shown}
              compact
              label={`${upgrading ? 'Improve' : 'Remove'} ${resolveCard(card).name}${upgrading ? `, becoming ${shown.name}` : ''}`}
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

export function RewardScreen({ run }: { run: RunState }) {
  const act = useRunStore((s) => s.act)
  const reward = run.reward
  if (!reward) return null
  const title = { battle: 'You made your point', elite: 'A hard argument, won', boss: 'Floor complete', treasure: 'Treasure' }[reward.source]
  return (
    <section className={panel} aria-labelledby="reward-title">
      <h2 id="reward-title" className="font-serif text-2xl font-semibold">
        {title}
      </h2>
      {reward.gold > 0 && <p className="mt-1">+{reward.gold} gold.</p>}
      {reward.relicChoices.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">{reward.relicChoices.length > 1 ? 'Choose a relic' : 'A relic'}</h3>
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
          <p className="text-sm text-[var(--tp-muted)]">A smaller deck draws its best cards more often. Skipping is a real choice.</p>
          <div className="mt-2 flex flex-wrap gap-2" data-testid="card-choices">
            {reward.cardChoices.map((cardId) => (
              <CardFace
                key={cardId}
                card={getCardDef(cardId)}
                disabled={reward.cardTaken}
                label={`Take ${getCardDef(cardId).name}`}
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
      <button type="button" className={`${primaryButton} mt-5`} onClick={() => act(leaveReward)} data-testid="continue">
        {reward.source === 'boss' ? (run.floor === 3 ? 'Finish the run' : 'On to the next floor') : 'Continue'}
        {(!reward.cardTaken || !reward.relicTaken) && ' (leave the rest)'}
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
      <h2 id="shop-title" className="font-serif text-2xl font-semibold">
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
  const heal = Math.floor((run.maxResolve * REST_HEAL_PERCENT) / 100)
  return (
    <section className={panel} aria-labelledby="rest-title">
      <h2 id="rest-title" className="font-serif text-2xl font-semibold">
        A quiet place
      </h2>
      <p className="mt-1 text-sm">Choose one.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={primaryButton} onClick={() => act(restHeal)} data-testid="rest-heal">
          Rest: restore {Math.min(heal, run.maxResolve - run.resolve)} Resolve
        </button>
        <button type="button" className={quietButton} onClick={() => act(startRestUpgrade)} disabled={!run.deck.some(canUpgrade)} data-testid="rest-upgrade">
          Study: improve one card
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
      <h2 id="event-title" className="font-serif text-2xl font-semibold">
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
            if (event.eventId === 'lecture' && choice.id === 'attend') {
              return (
                <li key={choice.id}>
                  <p className="font-semibold">{choice.label}</p>
                  <p className="text-sm text-[var(--tp-muted)]">{choice.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {event.cardOffer.map((cardId) => (
                      <CardFace
                        key={cardId}
                        card={getCardDef(cardId)}
                        label={`Sit in the front row and take ${getCardDef(cardId).name}`}
                        onActivate={() => act((r) => chooseEvent(r, 'attend', cardId))}
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
