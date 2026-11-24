'use client'

import { useSyncExternalStore } from 'react'
import { dailyPick } from '@/lib/games/daily-pick'
import { Go } from './Go'
import { PacketArt } from './Packet'

const noop = () => () => {}

/** Today's packet on the counter: the one game offered today, why, and the page's one Go. */
export function CounterPacket() {
  // Picked in the browser so the server's date can never disagree with the visitor's
  const onClient = useSyncExternalStore(noop, () => true, () => false)
  const pick = onClient ? dailyPick(new Date()) : undefined

  return (
    <section className="sp-counter" aria-labelledby="todays-packet">
      {pick && (
        <>
          <div className="sp-counter__face">
            <div className="sp-packet sp-packet--counter" aria-hidden="true">
              <span className="sp-packet__window">
                <PacketArt gameId={pick.game.id} />
              </span>
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
        </>
      )}
    </section>
  )
}
