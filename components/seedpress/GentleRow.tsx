import type { GameConfig } from '@/lib/games/config'
import { cn } from '@/lib/utils/cn'
import { Packet } from './Packet'

const GENTLE_HEADING = 'Something gentle, if it helps'

interface GentleRowProps {
  games: readonly GameConfig[]
  className?: string
}

/** The calmest games, offered after the helplines, never before. Still: no tilt in care. */
export function GentleRow({ games, className }: GentleRowProps) {
  return (
    <section aria-labelledby="related-games-heading" className={cn('sp-gentle', className)}>
      <h2 id="related-games-heading" className="sp-gentle__heading">
        {GENTLE_HEADING}
      </h2>
      <ul className="sp-shelf__packets sp-gentle__packets" style={{ maxWidth: `${games.length * 15}rem` }}>
        {games.map((game, index) => (
          <li key={game.id}>
            <Packet game={game} order={index} />
          </li>
        ))}
      </ul>
    </section>
  )
}
