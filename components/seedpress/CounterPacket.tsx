'use client'

import { useRef, useSyncExternalStore } from 'react'
import { dailyPick, PICK_REASONS } from '@/lib/games/daily-pick'
import { SHOWCASE_GAMES } from '@/lib/games/config'
import { Go } from './Go'
import { PacketArt } from './Packet'

const noop = () => () => {}

/**
 * Today's packet on the counter: the one game offered today, why, and the page's one Go.
 * The server prints the pick for its own date so the counter is there without JavaScript; the
 * browser then swaps in the visitor's own day, which differs only around midnight.
 */
export function CounterPacket({ serverGameId }: { serverGameId: string }) {
  const gameId = useSyncExternalStore(noop, () => dailyPick(new Date())?.game.id ?? serverGameId, () => serverGameId)
  const game = SHOWCASE_GAMES.find((candidate) => candidate.id === gameId)
  const plate = useRef<HTMLDivElement>(null)

  // S2 (PLAN.md §4.2): the plate's second ink settles into register once, the first time the
  // counter is hovered or focused. Nothing runs when --motion is 0 (Quiet, reduced motion).
  const settle = () => {
    const el = plate.current
    if (!el || el.dataset.settled !== undefined) return
    el.dataset.settled = ''
    if (getComputedStyle(el).getPropertyValue('--motion').trim() !== '0') el.classList.add('is-settling')
  }

  if (!game) return null
  const pick = { game, reason: PICK_REASONS[game.id] ?? game.hook }
  return (
    <section className="sp-counter" aria-labelledby="todays-packet" onPointerEnter={settle} onFocus={settle}>
      <div className="sp-counter__face">
        <div ref={plate} className="sp-plate" aria-hidden="true">
          <PacketArt gameId={pick.game.id} framing="feature" />
        </div>
        <div className="sp-counter__words">
          <p className="sp-counter__label" id="todays-packet">
            Today&rsquo;s packet
          </p>
          <h2 className="sp-counter__title">{pick.game.title}</h2>
          <p className="sp-counter__reason">{pick.reason}</p>
        </div>
      </div>
      <Go href={`/games/${pick.game.slug}`} onward className="sp-counter__go">
        Open today&rsquo;s packet
      </Go>
    </section>
  )
}
