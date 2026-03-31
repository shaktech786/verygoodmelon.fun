/**
 * GameCardShowcase Component
 *
 * Redesigned: horizontal card layout with always-visible game info.
 * Card image as visual accent, title + category + description + hook all visible at a glance.
 * Maintains hover polish, accessibility, and the calm aesthetic.
 */

import Image from 'next/image'
import Link from 'next/link'
import type { GameConfig } from '@/lib/games/config'

interface GameCardShowcaseProps {
  game: GameConfig
  priority?: boolean
  isFeatured?: boolean
}

/** Map category to color classes for the pill */
const CATEGORY_STYLES: Record<GameConfig['category'], { bg: string; text: string }> = {
  Action: { bg: 'bg-accent/10 dark:bg-accent/20', text: 'text-accent' },
  Puzzle: { bg: 'bg-success/10 dark:bg-success/20', text: 'text-success' },
  Wisdom: { bg: 'bg-warm/10 dark:bg-warm/20', text: 'text-warm' },
  Thought: { bg: 'bg-[var(--melon-purple)]/10', text: 'text-[var(--melon-purple)]' },
  Creative: { bg: 'bg-warm/10 dark:bg-warm/20', text: 'text-warm' },
}

export function GameCardShowcase({ game, priority = false, isFeatured = false }: GameCardShowcaseProps) {
  const categoryStyle = CATEGORY_STYLES[game.category]

  // Map accent colors to border-hover classes
  const borderHoverClass = {
    accent: 'hover:border-accent/30',
    success: 'hover:border-success/30',
    warning: 'hover:border-warm/30',
    purple: 'hover:border-[var(--melon-purple)]/30',
  }[game.accentColor]

  // Map accent colors to shadow classes
  const shadowColorClass = {
    accent: 'hover:shadow-accent/8',
    success: 'hover:shadow-success/8',
    warning: 'hover:shadow-warm/8',
    purple: 'hover:shadow-[var(--melon-purple)]/8',
  }[game.accentColor]

  return (
    <Link
      href={`/games/${game.slug}`}
      className={`
        block relative group rounded-2xl
        bg-card-bg border border-card-border
        ${borderHoverClass} ${shadowColorClass}
        hover:shadow-lg
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
      `}
      aria-label={`Play ${game.title}: ${game.description}. ${game.hook}`}
    >
      {/* Daily featured badge */}
      {isFeatured && (
        <div
          className="
            absolute -top-2.5 -right-2.5 z-10
            bg-warm text-white text-[10px] font-semibold
            px-2.5 py-0.5 rounded-full shadow-md
            animate-bounce-in
          "
          aria-label="Today's featured game"
        >
          Today
        </div>
      )}

      <div className="flex gap-4 p-4 sm:p-5">
        {/* Card image -- smaller visual accent */}
        <div className="relative flex-shrink-0 w-16 h-24 sm:w-20 sm:h-[120px] overflow-hidden rounded-xl">
          <Image
            src={game.cardImage}
            alt=""
            width={80}
            height={120}
            className="
              w-full h-full object-cover
              group-hover:scale-105
              transition-transform duration-300 ease-out
            "
            priority={priority}
            aria-hidden="true"
          />
          {/* Subtle shine on hover */}
          <div
            className="
              absolute inset-0 opacity-0 group-hover:opacity-100
              transition-opacity duration-300 ease-out
              bg-gradient-to-br from-white/0 via-white/15 to-white/0
              pointer-events-none
            "
            aria-hidden="true"
          />
        </div>

        {/* Game info -- always visible */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          {/* Top row: category pill */}
          <div className="flex items-center gap-2">
            <span
              className={`
                inline-block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider
                px-2 py-0.5 rounded-full
                ${categoryStyle.bg} ${categoryStyle.text}
              `}
            >
              {game.category}
            </span>
            {game.difficulty !== 'easy' && (
              <span className="text-[10px] text-primary-light/40 uppercase tracking-wider">
                {game.difficulty}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight truncate">
            {game.title}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-primary-light/70 leading-snug line-clamp-1">
            {game.description}
          </p>

          {/* Hook -- what you'll actually do */}
          <p className="text-[11px] sm:text-xs text-primary-light/50 leading-snug line-clamp-2">
            {game.hook}
          </p>
        </div>

        {/* Play arrow -- visible on hover */}
        <div
          className="
            hidden sm:flex items-center justify-center
            flex-shrink-0 w-8
            opacity-0 group-hover:opacity-100
            translate-x-0 group-hover:translate-x-0.5
            transition-all duration-200 ease-out
          "
          aria-hidden="true"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="text-primary-light/40"
          >
            <path
              d="M7 4l8 6-8 6V4z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
    </Link>
  )
}

/**
 * Placeholder card for games when card image doesn't exist
 * Fallback to gradient design with icon
 */
interface GameCardPlaceholderProps {
  game: GameConfig
}

export function GameCardPlaceholder({ game }: GameCardPlaceholderProps) {
  const categoryStyle = CATEGORY_STYLES[game.category]

  const gradientClass = {
    accent: 'from-accent to-accent/80',
    success: 'from-success to-success/80',
    warning: 'from-warm to-warm/80',
    purple: 'from-[var(--melon-purple)] to-[var(--melon-purple)]/80',
  }[game.accentColor]

  return (
    <Link
      href={`/games/${game.slug}`}
      className="
        block relative group rounded-2xl
        bg-card-bg border border-card-border
        hover:border-foreground/20 hover:shadow-lg
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background
      "
      aria-label={`Play ${game.title}: ${game.description}. ${game.hook}`}
    >
      <div className="flex gap-4 p-4 sm:p-5">
        {/* Gradient placeholder for missing image */}
        <div
          className={`
            relative flex-shrink-0 w-16 h-24 sm:w-20 sm:h-[120px]
            overflow-hidden rounded-xl
            bg-gradient-to-br ${gradientClass}
            flex items-center justify-center
          `}
        >
          <span className="text-2xl text-white" aria-hidden="true">
            {game.slug === 'hard-choices' ? '⚖️' : '🎮'}
          </span>
        </div>

        {/* Game info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`
                inline-block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider
                px-2 py-0.5 rounded-full
                ${categoryStyle.bg} ${categoryStyle.text}
              `}
            >
              {game.category}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
            {game.title}
          </h3>
          <p className="text-xs sm:text-sm text-primary-light/70 leading-snug">
            {game.description}
          </p>
          <p className="text-[11px] sm:text-xs text-primary-light/50 leading-snug">
            {game.hook}
          </p>
        </div>
      </div>
    </Link>
  )
}
