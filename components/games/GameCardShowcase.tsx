/**
 * GameCardShowcase Component
 *
 * Balatro-style joker card display for game showcase
 * Unified hover effects, animations, and accessibility
 */

import Image from 'next/image'
import Link from 'next/link'
import type { GameConfig } from '@/lib/games/config'

interface GameCardShowcaseProps {
  game: GameConfig
  priority?: boolean
}

export function GameCardShowcase({ game, priority = false }: GameCardShowcaseProps) {
  // Map accent colors to Tailwind shadow classes
  const shadowColorClass = {
    accent: 'hover:shadow-accent/20',
    success: 'hover:shadow-success/20',
    warning: 'hover:shadow-warning/20',
    purple: 'hover:shadow-purple-600/20',
  }[game.accentColor]

  // Map accent colors to glow gradient classes
  const glowColorClass = {
    accent: 'from-accent/10',
    success: 'from-success/10',
    warning: 'from-warning/10',
    purple: 'from-purple-600/10',
  }[game.accentColor]

  // Map accent colors to play button classes
  const playButtonClass = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    purple: 'bg-purple-600',
  }[game.accentColor]

  return (
    <Link
      href={`/games/${game.slug}`}
      className="block relative group"
      aria-label={`Play ${game.title}: ${game.description}`}
    >
      {/* Card container with hover effects */}
      <div
        className={`
          relative overflow-hidden card-organic card-hover-organic
          transition-all duration-300 ease-out
          hover:shadow-2xl ${shadowColorClass}
          transform-gpu will-change-transform
        `}
      >
        {/* Game card image */}
        <Image
          src={game.cardImage}
          alt={game.cardAlt}
          width={1024}
          height={1792}
          className="
            w-full h-auto object-contain
            transition-all duration-300 ease-out
            group-hover:brightness-110
          "
          priority={priority}
        />

        {/* Subtle glow overlay on hover */}
        <div
          className={`
            absolute inset-0 opacity-0 group-hover:opacity-100
            transition-opacity duration-300 ease-out
            bg-gradient-to-t ${glowColorClass} via-transparent to-transparent
            pointer-events-none
          `}
          aria-hidden="true"
        />

        {/* Shine effect on hover */}
        <div
          className="
            absolute inset-0 opacity-0 group-hover:opacity-100
            transition-all duration-500 ease-out
            bg-gradient-to-br from-white/0 via-white/20 to-white/0
            translate-x-[-100%] group-hover:translate-x-[100%]
            pointer-events-none
          "
          aria-hidden="true"
        />
      </div>

      {/* Play indicator that appears on hover */}
      <div
        className={`
          absolute bottom-3 left-1/2 -translate-x-1/2
          opacity-0 group-hover:opacity-100
          transform translate-y-2 group-hover:translate-y-0
          transition-all duration-300 ease-out
          ${playButtonClass} text-white px-4 py-2 rounded-full
          font-semibold text-xs shadow-lg
          pointer-events-none
        `}
        aria-hidden="true"
      >
        Play →
      </div>
    </Link>
  )
}

/**
 * Placeholder card for Hard Choices when card.png doesn't exist
 * Fallback to gradient design with icon
 */
interface GameCardPlaceholderProps {
  game: GameConfig
}

export function GameCardPlaceholder({ game }: GameCardPlaceholderProps) {
  const gradientClass = {
    accent: 'from-accent to-accent/80',
    success: 'from-success to-success/80',
    warning: 'from-warning to-warning/80',
    purple: 'from-purple-600 to-purple-800',
  }[game.accentColor]

  const shadowColorClass = {
    accent: 'hover:shadow-accent/20',
    success: 'hover:shadow-success/20',
    warning: 'hover:shadow-warning/20',
    purple: 'hover:shadow-purple-600/20',
  }[game.accentColor]

  const playButtonClass = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    purple: 'bg-purple-600',
  }[game.accentColor]

  return (
    <Link
      href={`/games/${game.slug}`}
      className="block relative group"
      aria-label={`Play ${game.title}: ${game.description}`}
    >
      <div
        className={`
          relative overflow-hidden card-organic card-hover-organic
          transition-all duration-300 ease-out
          hover:shadow-2xl ${shadowColorClass}
          transform-gpu will-change-transform
          bg-gradient-to-br ${gradientClass}
          aspect-[1024/1792]
          flex flex-col items-center justify-center p-6 text-white
        `}
      >
        <div className="text-6xl mb-4" aria-hidden="true">
          {game.slug === 'hard-choices' ? '⚖️' : '🎮'}
        </div>
        <h3 className="text-xl font-bold text-center mb-2">{game.title}</h3>
        <p className="text-sm text-center text-white/80">{game.description}</p>

        {/* Subtle glow overlay on hover */}
        <div
          className="
            absolute inset-0 opacity-0 group-hover:opacity-100
            transition-opacity duration-300 ease-out
            bg-gradient-to-t from-white/10 via-transparent to-transparent
            pointer-events-none
          "
          aria-hidden="true"
        />

        {/* Shine effect on hover */}
        <div
          className="
            absolute inset-0 opacity-0 group-hover:opacity-100
            transition-all duration-500 ease-out
            bg-gradient-to-br from-white/0 via-white/20 to-white/0
            translate-x-[-100%] group-hover:translate-x-[100%]
            pointer-events-none
          "
          aria-hidden="true"
        />
      </div>

      {/* Play indicator */}
      <div
        className={`
          absolute bottom-3 left-1/2 -translate-x-1/2
          opacity-0 group-hover:opacity-100
          transform translate-y-2 group-hover:translate-y-0
          transition-all duration-300 ease-out
          ${playButtonClass} text-white px-4 py-2 rounded-full
          font-semibold text-xs shadow-lg
          pointer-events-none
        `}
        aria-hidden="true"
      >
        Play →
      </div>
    </Link>
  )
}
