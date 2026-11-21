'use client'

import { ALL_GAMES, type GameConfig } from '@/lib/games/config'
import { useCareMode } from '@/components/games/CareMode'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'

/** Thematic neighbours: every game suggests two others and is suggested by at least one. */
const RELATED_GAMES: Record<string, [string, string]> = {
  'last-words': ['first-words', 'timeless-minds'],
  'first-words': ['last-words', 'the-unrusher'],
  'timeless-minds': ['mind-debate', 'hard-choices'],
  'mind-debate': ['timeless-minds', 'hard-choices'],
  'hard-choices': ['thought-pockets', 'mind-debate'],
  'the-unrusher': ['breathing-patterns', 'hard-talk'],
  'hope-daily': ['idea-lab', 'worry-capsule'],
  'idea-lab': ['cascade', 'timeless-minds'],
  'thought-pockets': ['hard-choices', 'idea-lab'],
  'cascade': ['thought-pockets', 'idea-lab'],
  'breathing-patterns': ['the-unrusher', 'calm-garden'],
  'calm-garden': ['breathing-patterns', 'hope-daily'],
  'worry-capsule': ['the-unrusher', 'hope-daily'],
  'hard-talk': ['breathing-patterns', 'worry-capsule'],
}

/** The games about death, never pushed toward someone who may be in danger. */
export const HEAVY_GAMES: ReadonlySet<string> = new Set(['last-words', 'first-words'])

// After words that suggest someone may be in danger, point only at the calmest games
const CARE_GAME_IDS = ['breathing-patterns', 'calm-garden'] as const

const findGames = (ids: readonly string[]) =>
  ids.map((id) => ALL_GAMES.find((game) => game.id === id)).filter((game): game is GameConfig => game !== undefined)

export const CARE_GAMES: readonly GameConfig[] = findGames(CARE_GAME_IDS)

const GENTLE_HEADING = 'Something gentle, if it helps'

function SuggestionRow({ heading, games, className }: { heading: string; games: readonly GameConfig[]; className: string }) {
  return (
    <section aria-labelledby="related-games-heading" className={className}>
      <h2 id="related-games-heading" className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
        {heading}
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {games.map((game) => (
          <li key={game.id}>
            <GameCardShowcase game={game} showCategory={false} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Leads the game lists while care mode lasts. */
export function GentleGames({ className = '' }: { className?: string }) {
  return <SuggestionRow heading={GENTLE_HEADING} games={CARE_GAMES} className={className} />
}

interface CrossGameSuggestionsProps {
  currentGameId: string
}

export function CrossGameSuggestions({ currentGameId }: CrossGameSuggestionsProps) {
  const { care } = useCareMode()
  const className = 'mt-12 pt-8 border-t border-card-border'

  if (care) return <GentleGames className={className} />

  const suggestions = findGames(RELATED_GAMES[currentGameId] ?? [])
  if (suggestions.length === 0) return null
  return <SuggestionRow heading="Continue your journey" games={suggestions} className={className} />
}
