import Image from 'next/image'
import Link from 'next/link'
import type { GameConfig } from '@/lib/games/config'

interface GameCardShowcaseProps {
  game: GameConfig
  priority?: boolean
  isFeatured?: boolean
  showCategory?: boolean
  headingLevel?: 'h2' | 'h3'
}

const CATEGORY_TINTS: Record<GameConfig['category'], string> = {
  Calm: 'bg-success/25',
  Reflect: 'bg-[var(--melon-purple)]/20',
  Play: 'bg-accent/15',
}

const BORDER_HOVER: Record<GameConfig['accentColor'], string> = {
  accent: 'hover:border-accent/40',
  success: 'hover:border-success/40',
  warning: 'hover:border-warm/40',
  purple: 'hover:border-[var(--melon-purple)]/40',
}

export function GameCardShowcase({
  game,
  priority = false,
  isFeatured = false,
  showCategory = true,
  headingLevel: Heading = 'h3',
}: GameCardShowcaseProps) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className={`
        block h-full relative group rounded-2xl
        bg-card-bg border border-card-border
        ${BORDER_HOVER[game.accentColor]}
        hover:shadow-lg
        transition-[box-shadow,border-color] duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
      `}
      aria-label={`${game.title}${isFeatured ? ', featured today' : ''}. ${game.hook}.`}
    >
      {isFeatured && (
        <span
          className="absolute -top-2.5 right-4 z-10 bg-warm text-[#1a1a1a] text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm"
          aria-hidden="true"
        >
          Today
        </span>
      )}

      <div className="flex items-center gap-4 p-4 sm:p-5 h-full">
        <div className="relative flex-shrink-0 w-14 h-[84px] sm:w-16 sm:h-24 overflow-hidden rounded-lg">
          <Image
            src={game.cardImage}
            alt=""
            width={64}
            height={96}
            className="w-full h-full object-cover motion-safe:group-hover:scale-105 transition-transform duration-300 ease-out"
            priority={priority}
            aria-hidden="true"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {showCategory && (
            <span
              className={`self-start text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-foreground ${CATEGORY_TINTS[game.category]}`}
            >
              {game.category}
            </span>
          )}
          <Heading className="text-base sm:text-lg font-semibold text-foreground leading-tight group-hover:text-accent transition-colors">
            {game.title}
          </Heading>
          <p className="text-sm text-primary-light leading-snug">
            {game.hook}
          </p>
        </div>
      </div>
    </Link>
  )
}
