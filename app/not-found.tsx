import type { Metadata } from 'next'
import Link from 'next/link'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'
import { SHOWCASE_GAMES } from '@/lib/games/config'

export const metadata: Metadata = {
  title: 'Page not found | VeryGoodMelon.Fun',
}

const CALM_GAMES = SHOWCASE_GAMES.filter((game) => game.category === 'Calm')

export default function NotFound() {
  return (
    <div className="container mx-auto px-6 py-16 max-w-3xl">
      <div className="text-center mb-12 animate-fade">
        <p className="text-sm uppercase tracking-widest text-primary-light mb-3">404</p>
        <h1 className="text-3xl sm:text-4xl font-light text-foreground mb-4">
          This path leads nowhere, and that&apos;s okay
        </h1>
        <p className="text-primary-light max-w-md mx-auto">
          The page you were looking for isn&apos;t here. Take a breath, then pick somewhere to go.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Back home
          </Link>
          <Link
            href="/games"
            className="px-5 py-2.5 rounded-lg border border-card-border text-foreground font-medium hover:bg-hover-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            All games
          </Link>
        </div>
      </div>

      <section aria-labelledby="calm-games-heading">
        <h2 id="calm-games-heading" className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
          Or slow down for a minute
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {CALM_GAMES.map((game) => (
            <li key={game.id}>
              <GameCardShowcase game={game} showCategory={false} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
