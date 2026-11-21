'use client'

import { useCareMode } from '@/components/games/CareMode'
import { GentleGames, HEAVY_GAMES } from '@/components/games/CrossGameSuggestions'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'
import { SHOWCASE_GROUPS } from '@/lib/games/config'

const ABOVE_THE_FOLD = new Set(
  SHOWCASE_GROUPS.flatMap((group) => group.games)
    .slice(0, 4)
    .map((game) => game.id)
)

/** Every game by category; while care mode lasts, calm games lead and the games about death step aside. */
export function GameDirectory() {
  const { care } = useCareMode()

  return (
    <div className="space-y-10 sm:space-y-14">
      {care && <GentleGames />}
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
            {games
              .filter((game) => !(care && HEAVY_GAMES.has(game.id)))
              .map((game) => (
                <li key={game.id}>
                  <GameCardShowcase game={game} priority={ABOVE_THE_FOLD.has(game.id)} showCategory={false} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
