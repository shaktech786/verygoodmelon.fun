/**
 * GameLayout Component
 *
 * Reusable layout wrapper for all game pages
 * Provides consistent structure, accessibility, and responsive design
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

interface GameLayoutProps {
  /**
   * Game title displayed in H1
   */
  title: string

  /**
   * Game description/subtitle
   */
  description: string

  /**
   * Game component to render
   */
  children: ReactNode

  /**
   * Maximum container width
   * @default '4xl'
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full'

  /**
   * Whether to show "Back to Games" link
   * @default true
   */
  showBackLink?: boolean

  /**
   * Custom back link URL
   * @default '/'
   */
  backLinkHref?: string

  /**
   * Custom back link text
   * @default '← Back to Games'
   */
  backLinkText?: string

  /**
   * Additional CSS classes for container
   */
  className?: string
}

export function GameLayout({
  title,
  description,
  children,
  maxWidth = '4xl',
  showBackLink = true,
  backLinkHref = '/',
  backLinkText = '← Back to Games',
  className = '',
}: GameLayoutProps) {
  // Map maxWidth to complete Tailwind classes for JIT compilation
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  }[maxWidth]

  return (
    <div className={`container mx-auto px-4 py-4 sm:py-6 ${maxWidthClasses} ${className}`}>
      <div className="animate-fade">
        {/* Header Section */}
        <header className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
            {title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
            {description}
          </p>
        </header>

        {/* Game Component */}
        <main role="application" aria-label={`${title} game`}>
          {children}
        </main>

        {/* Back Link */}
        {showBackLink && (
          <nav className="mt-6 text-center" aria-label="Game navigation">
            <Link
              href={backLinkHref}
              className="
                inline-block px-4 py-2 sm:px-6 sm:py-3
                bg-card-bg text-foreground border border-card-border rounded-lg font-medium
                hover:bg-hover-bg transition-colors
                text-sm sm:text-base
                focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
              "
            >
              {backLinkText}
            </Link>
          </nav>
        )}
      </div>
    </div>
  )
}

/**
 * Metadata helper for game pages
 * Generates consistent metadata with site branding
 */
export function createGameMetadata(title: string, description: string) {
  return {
    title: `${title} | VeryGoodMelon.Fun`,
    description,
  }
}
