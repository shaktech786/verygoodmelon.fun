import type { Metadata } from 'next'
import { CareHelpline } from '@/components/games/CareHelpline'
import { Icon } from '@/components/seedpress/icons/Icon'
import { Go } from '@/components/seedpress/Go'
import { Packet } from '@/components/seedpress/Packet'
import { Stamp } from '@/components/seedpress/Stamp'
import { SHOWCASE_GAMES } from '@/lib/games/config'

export const metadata: Metadata = {
  title: 'Page not found | VeryGoodMelon.Fun',
}

const CALM_GAMES = SHOWCASE_GAMES.filter((game) => game.category === 'Calm').slice(0, 3)

export default function NotFound() {
  return (
    <div className="sp-shop sp-home">
      <div className="sp-sign">
        <Icon name="packet" size={48} className="sp-lost__stamp" />
        <h1 className="sp-h1 max-w-[20ch]">This packet is empty</h1>
        <p className="sp-sign__motto max-w-prose">Nothing grew here, and that&apos;s okay. Pick somewhere to go.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Go href="/">Back to the shop</Go>
          <Stamp href="/games">All games</Stamp>
        </div>
      </div>

      <section aria-labelledby="calm-games-heading">
        <h2 id="calm-games-heading" className="sp-h3">
          Or slow down for a minute
        </h2>
        <CareHelpline className="mt-2" />
        <ul className="sp-shelf__packets sp-lost__packets mt-5">
          {CALM_GAMES.map((game, index) => (
            <li key={game.id}>
              <Packet game={game} order={index} size="small" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
