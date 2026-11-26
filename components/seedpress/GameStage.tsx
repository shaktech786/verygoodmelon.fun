import NextLink from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { CrossGameSuggestions } from '@/components/games/CrossGameSuggestions'
import { OwnSupportProvider } from '@/components/games/OwnSupport'
import { GameVisitTracker } from '@/components/games/GameVisitTracker'
import { AmbientSoundscape } from '@/components/ui/AmbientSoundscape'
import { ALL_GAMES } from '@/lib/games/config'
import { Icon } from './icons/Icon'
import { KeyHints } from './KeyHints'
import { SHELF_STYLE } from './shelves'

interface GameStageProps {
  gameId: string
  title: string
  /** One line, two sentences at most. */
  lead: string
  /** The three canvas games take the wide stage, and on a phone run edge to edge. */
  wide?: boolean
  /** The game's keyboard controls, as words. Shown behind a "Keys" stamp. */
  keys?: ReactNode
  /** Shows the "Sound" stamp. The soundscape itself is always on offer from the settings panel. */
  sound?: boolean
  children: ReactNode
}

/**
 * A game's page: the strip with its title, the stage the game plays on, and what follows it.
 * Visit counting, the ambient soundscape and the suggested next game belong to the page, so they live here.
 */
export function GameStage({ gameId, title, lead, wide = false, keys, sound = false, children }: GameStageProps) {
  const category = ALL_GAMES.find((game) => game.id === gameId)?.category ?? 'Calm'
  const shelf = SHELF_STYLE[category]
  return (
    <div className={wide ? 'sp-game sp-game--wide' : 'sp-game'}>
      <OwnSupportProvider>
      <GameVisitTracker gameId={gameId} />
      <header className="sp-strip" style={{ ['--shelf-ink' as string]: `var(--${shelf.ink})` } as CSSProperties}>
        <NextLink href="/games" className="sp-quiet sp-strip__back">
          <Icon name="back" />
          <span className="sp-strip__back-words">The shop</span>
        </NextLink>
        <h1 className="sp-h1 sp-strip__title">
          <Icon name={shelf.glyph} size={36} className="sp-strip__glyph" />
          {title}
        </h1>
        <p className="sp-lead sp-strip__lead">{lead}</p>
        <div className="sp-strip__tools">
          {keys && <KeyHints>{keys}</KeyHints>}
          <AmbientSoundscape gameId={gameId} stamp={sound} />
        </div>
      </header>
      <div className="sp-stage">{children}</div>
      <div className="sp-after">
        <CrossGameSuggestions currentGameId={gameId} />
      </div>
      </OwnSupportProvider>
    </div>
  )
}
