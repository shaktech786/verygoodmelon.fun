import type { Metadata } from 'next'
import { CareHelpline } from '@/components/games/CareHelpline'
import { Go } from '@/components/seedpress/Go'
import { Packet } from '@/components/seedpress/Packet'
import { Stamp } from '@/components/seedpress/Stamp'
import { SHOWCASE_GAMES } from '@/lib/games/config'

export const metadata: Metadata = {
  title: 'Page not found | VeryGoodMelon.Fun',
}

const CALM_GAMES = SHOWCASE_GAMES.filter((game) => game.category === 'Calm')

export default function NotFound() {
  return (
    <div className="sp-shop sp-home">
      <div className="sp-sign">
        <p className="sp-soft">404</p>
        <h1 className="sp-h1 mt-2 max-w-[20ch]">This path leads nowhere, and that&apos;s okay</h1>
        <p className="sp-sign__motto max-w-prose">The page you were looking for isn&apos;t here. Take a breath, then pick somewhere to go.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Go href="/">Back home</Go>
          <Stamp href="/games">All games</Stamp>
        </div>
      </div>

      <section aria-labelledby="calm-games-heading">
        <h2 id="calm-games-heading" className="sp-h3">
          Or slow down for a minute
        </h2>
        <CareHelpline className="mt-2" />
        <ul className="sp-shelf__packets mt-5" style={{ maxWidth: `${CALM_GAMES.length * 15}rem` }}>
          {CALM_GAMES.map((game, index) => (
            <li key={game.id}>
              <Packet game={game} order={index} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
