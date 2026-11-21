import type { Metadata } from 'next'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'
import { SHOWCASE_GROUPS } from '@/lib/games/config'

export const metadata: Metadata = {
  title: 'Games | VeryGoodMelon.Fun',
  description: 'Small, quiet games for a busy mind, to play at your own pace.',
}

const ABOVE_THE_FOLD = new Set(
  SHOWCASE_GROUPS.flatMap((group) => group.games)
    .slice(0, 4)
    .map((game) => game.id)
)

export default function GamesPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="mb-10 animate-fade">
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-3">
          Games
        </h1>
        <p className="text-lg text-primary-light">
          Small, quiet games for a busy mind, to play at your own pace.
        </p>
      </div>

      <div className="space-y-10 sm:space-y-14">
        {SHOWCASE_GROUPS.map(({ category, title, description, games }) => (
          <section key={category} aria-labelledby={`category-${category.toLowerCase()}`}>
            <div className="mb-4 sm:mb-5">
              <h2
                id={`category-${category.toLowerCase()}`}
                className="text-sm font-semibold uppercase tracking-wider text-foreground"
              >
                {title}
              </h2>
              <p className="text-sm text-primary-light mt-0.5">{description}</p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {games.map((game) => (
                <li key={game.id}>
                  <GameCardShowcase game={game} priority={ABOVE_THE_FOLD.has(game.id)} showCategory={false} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
