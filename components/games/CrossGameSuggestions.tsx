'use client'

import { ALL_GAMES, type GameConfig } from '@/lib/games/config'
import { useCareMode } from '@/components/games/CareMode'
import { useOwnSupportShown } from '@/components/games/OwnSupport'
import { CareBlock } from '@/components/seedpress/CareBlock'
import { GentleRow } from '@/components/seedpress/GentleRow'
import { Packet } from '@/components/seedpress/Packet'

/** Each game's closest neighbour, offered once at the foot of its page. */
const RELATED_GAME: Record<string, string> = {
  'last-words': 'first-words',
  'first-words': 'last-words',
  'timeless-minds': 'mind-debate',
  'mind-debate': 'timeless-minds',
  'hard-choices': 'thought-pockets',
  'the-unrusher': 'breathing-patterns',
  'hope-daily': 'idea-lab',
  'idea-lab': 'cascade',
  'thought-pockets': 'hard-choices',
  'cascade': 'thought-pockets',
  'breathing-patterns': 'the-unrusher',
  'calm-garden': 'breathing-patterns',
  'worry-capsule': 'the-unrusher',
  'hard-talk': 'breathing-patterns',
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

interface SuggestionRowProps {
  games: readonly GameConfig[]
  className: string
}

function ContinueRow({ games, className }: SuggestionRowProps) {
  return (
    <section aria-labelledby="related-games-heading" className={className}>
      <h2 id="related-games-heading" className="sp-h3">
        Continue your journey
      </h2>
      <ul className="sp-shelf__packets mt-5" style={{ maxWidth: `${games.length * 15}rem` }}>
        {games.map((game, index) => (
          <li key={game.id}>
            <Packet game={game} order={index} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Leads the game lists while care mode lasts: the helplines first, then the calmest games. */
export function GentleGames({ className = '', helplines = true }: { className?: string; helplines?: boolean }) {
  return (
    <div className={className}>
      {helplines && <CareBlock lead="If things feel too heavy right now, you can talk to someone." />}
      <GentleRow games={CARE_GAMES} className={helplines ? 'mt-10' : undefined} />
    </div>
  )
}

interface CrossGameSuggestionsProps {
  currentGameId: string
}

export function CrossGameSuggestions({ currentGameId }: CrossGameSuggestionsProps) {
  const { care, awaitingJudgement } = useCareMode()
  const ownSupport = useOwnSupportShown()
  const className = 'mt-12 pt-8 border-t border-rule'

  if (care) return <GentleGames className={className} helplines={!ownSupport} />
  if (awaitingJudgement) return null

  const related = RELATED_GAME[currentGameId]
  const suggestions = findGames(related ? [related] : [])
  if (suggestions.length === 0) return null
  return <ContinueRow games={suggestions} className={className} />
}
