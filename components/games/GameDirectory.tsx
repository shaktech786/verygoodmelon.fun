'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useCareMode } from '@/components/games/CareMode'
import { GentleGames, stepsAsideInCare } from '@/components/games/CrossGameSuggestions'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'
import { MoodGlyph } from '@/components/home/MoodDoors'
import { SHOWCASE_GROUPS, type GameConfig } from '@/lib/games/config'
import { MOODS, gamesForMood, getMood, moodHref, type MoodId } from '@/lib/games/moods'

const ABOVE_THE_FOLD = new Set(
  SHOWCASE_GROUPS.flatMap((group) => group.games)
    .slice(0, 4)
    .map((game) => game.id)
)

const CHIP = `
  inline-flex items-center gap-2 min-h-11 px-4 rounded-full border text-sm sm:text-base
  border-card-border bg-card-bg text-foreground hover:bg-hover-bg transition-colors duration-150
  aria-[current=page]:bg-chosen aria-[current=page]:border-chosen-line aria-[current=page]:font-medium
  focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
`

function MoodFilter({ mood }: { mood: MoodId | undefined }) {
  return (
    <nav aria-label="Games by mood" className="mb-8 sm:mb-10">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link href="/games" scroll={false} aria-current={mood ? undefined : 'page'} className={CHIP}>
            All games
          </Link>
        </li>
        {MOODS.map((m) => (
          <li key={m.id}>
            <Link href={moodHref(m.id)} scroll={false} aria-current={mood === m.id ? 'page' : undefined} className={CHIP}>
              <MoodGlyph mood={m.id} className="w-4 h-4 text-melon-green" />
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function GameList({ games }: { games: readonly GameConfig[] }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {games.map((game) => (
        <li key={game.id}>
          <GameCardShowcase game={game} priority={ABOVE_THE_FOLD.has(game.id)} showCategory={false} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Every game by category, or only the games for one mood when the address names one.
 * While care mode lasts, calm games lead (once) and the games about death step aside.
 */
export function GameDirectory({ mood }: { mood?: MoodId }) {
  const { care } = useCareMode()
  const visible = (games: readonly GameConfig[]) => games.filter((game) => !(care && stepsAsideInCare(game.id)))
  const chosen = mood ? getMood(mood) : undefined

  return (
    <div>
      <MoodFilter mood={mood} />
      <p role="status" className="sr-only">
        {chosen ? `${chosen.heading}. ${chosen.line}` : 'Every game'}
      </p>

      <div className="space-y-10 sm:space-y-14">
        {care && <GentleGames />}
        {chosen ? (
          <section aria-labelledby="mood-heading">
            <div className="mb-4 sm:mb-5">
              <h2 id="mood-heading" className="text-sm font-semibold uppercase tracking-wider text-foreground">
                {chosen.heading}
              </h2>
              <p className="text-sm text-primary-light mt-0.5">{chosen.line}</p>
            </div>
            <GameList games={visible(gamesForMood(chosen.id))} />
            <p className="mt-8">
              <Link
                href="/games"
                scroll={false}
                className="inline-flex items-center gap-2 min-h-11 px-1 text-sm sm:text-base text-primary-light hover:text-foreground hover:underline underline-offset-4 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Show all games
              </Link>
            </p>
          </section>
        ) : (
          SHOWCASE_GROUPS.map(({ category, title, description, games }) => (
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
              <GameList games={visible(games)} />
            </section>
          ))
        )}
      </div>
    </div>
  )
}
