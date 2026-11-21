import { ALL_GAMES, type GameConfig } from '@/lib/games/config'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'

/** Thematic neighbours: every game suggests two others and is suggested by at least one. */
const RELATED_GAMES: Record<string, [string, string]> = {
  'last-words': ['first-words', 'timeless-minds'],
  'first-words': ['last-words', 'the-unrusher'],
  'timeless-minds': ['mind-debate', 'hard-choices'],
  'mind-debate': ['timeless-minds', 'hard-choices'],
  'hard-choices': ['thought-pockets', 'mind-debate'],
  'the-unrusher': ['breathing-patterns', 'first-words'],
  'hope-daily': ['idea-lab', 'the-unrusher'],
  'idea-lab': ['cascade', 'timeless-minds'],
  'thought-pockets': ['hard-choices', 'idea-lab'],
  'cascade': ['thought-pockets', 'idea-lab'],
  'breathing-patterns': ['the-unrusher', 'calm-garden'],
  'calm-garden': ['breathing-patterns', 'hope-daily'],
}

interface CrossGameSuggestionsProps {
  currentGameId: string
}

export function CrossGameSuggestions({ currentGameId }: CrossGameSuggestionsProps) {
  const suggestions = (RELATED_GAMES[currentGameId] ?? [])
    .map((id) => ALL_GAMES.find((game) => game.id === id))
    .filter((game): game is GameConfig => game !== undefined)

  if (suggestions.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="related-games-heading" className="mt-12 pt-8 border-t border-card-border">
      <h2 id="related-games-heading" className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
        Continue your journey
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {suggestions.map((game) => (
          <li key={game.id}>
            <GameCardShowcase game={game} showCategory={false} />
          </li>
        ))}
      </ul>
    </section>
  )
}
