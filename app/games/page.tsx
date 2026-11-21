import type { Metadata } from 'next'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'
import { SHOWCASE_GAMES } from '@/lib/games/config'

export const metadata: Metadata = {
  title: 'Games | VeryGoodMelon.Fun',
  description: 'Thoughtful games to play at your own pace.',
}

export default function GamesPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="mb-10 animate-fade">
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-3">
          Games
        </h1>
        <p className="text-lg text-primary-light">
          Thoughtful games to play at your own pace.
        </p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {SHOWCASE_GAMES.map((game, index) => (
          <li key={game.id}>
            <GameCardShowcase game={game} priority={index < 4} headingLevel="h2" />
          </li>
        ))}
      </ul>
    </div>
  )
}
