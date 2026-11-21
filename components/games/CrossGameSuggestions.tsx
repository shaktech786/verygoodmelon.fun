'use client'

import { ALL_GAMES, type GameConfig } from '@/lib/games/config'
import { useCareMode } from '@/components/games/CareMode'
import { GameCardShowcase } from '@/components/games/GameCardShowcase'
import { HelplineSentence } from '@/components/games/HelplineSentence'

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
const HEAVY_GAMES: ReadonlySet<string> = new Set(['last-words', 'first-words'])

// After words that suggest someone may be in danger, point only at the calmest games
const CARE_GAME_IDS = ['breathing-patterns', 'calm-garden'] as const

const findGames = (ids: readonly string[]) =>
  ids.map((id) => ALL_GAMES.find((game) => game.id === id)).filter((game): game is GameConfig => game !== undefined)

export const CARE_GAMES: readonly GameConfig[] = findGames(CARE_GAME_IDS)

/** Whether a game leaves the ordinary lists while care lasts: the heavy ones go, and the gentle ones already lead. */
export function stepsAsideInCare(gameId: string): boolean {
  return HEAVY_GAMES.has(gameId) || CARE_GAMES.some((game) => game.id === gameId)
}

const GENTLE_HEADING = 'Something gentle, if it helps'

interface SuggestionRowProps {
  heading: string
  games: readonly GameConfig[]
  className: string
  helplines?: boolean
}

function SuggestionRow({ heading, games, className, helplines = false }: SuggestionRowProps) {
  return (
    <section aria-labelledby="related-games-heading" className={className}>
      <h2 id="related-games-heading" className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
        {heading}
      </h2>
      {helplines && (
        <p className="-mt-2 mb-4 text-sm text-foreground/80 leading-relaxed">
          <HelplineSentence lead="If things feel too heavy right now, you can talk to someone." />
        </p>
      )}
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

/** Leads the game lists while care mode lasts; where no support panel is on the page, the helplines come with it. */
export function GentleGames({ className = '', helplines = false }: { className?: string; helplines?: boolean }) {
  return <SuggestionRow heading={GENTLE_HEADING} games={CARE_GAMES} className={className} helplines={helplines} />
}

interface CrossGameSuggestionsProps {
  currentGameId: string
}

export function CrossGameSuggestions({ currentGameId }: CrossGameSuggestionsProps) {
  const { care, awaitingJudgement } = useCareMode()
  const className = 'mt-12 pt-8 border-t border-card-border'

  if (care) return <GentleGames className={className} />
  if (awaitingJudgement) return null

  const suggestions = findGames(RELATED_GAMES[currentGameId] ?? [])
  if (suggestions.length === 0) return null
  return <SuggestionRow heading="Continue your journey" games={suggestions} className={className} />
}
