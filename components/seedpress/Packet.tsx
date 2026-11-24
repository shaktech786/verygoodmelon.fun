import NextLink from 'next/link'
import { useId } from 'react'
import { TILTS } from '@/lib/design/tokens'
import { SHOWCASE_GROUPS, type GameConfig } from '@/lib/games/config'
import { cn } from '@/lib/utils/cn'
import { Icon } from './icons/Icon'
import { PRINTS } from './packets/art'
import { PACKET_INKS, SHELF_STYLE } from './shelves'

export type PacketSize = 'rack' | 'counter' | 'small'

interface PacketArtProps {
  gameId: string
  /** `packet` is the 3:4 print on the rack; `feature` is the square plate on the counter, set on a printed sunburst. */
  framing?: 'packet' | 'feature'
  className?: string
}

const RAYS = Array.from({ length: 12 }, (_, i) => i * 30)

/** A packet's two-ink print. */
export function PacketArt({ gameId, framing = 'packet', className }: PacketArtProps) {
  const id = useId().replace(/:/g, '')
  const [a, b] = PACKET_INKS[gameId] ?? ['ink', 'ink']
  const print = PRINTS[gameId]?.({ a: `url(#${id}a)`, b: `url(#${id}b)` })
  const feature = framing === 'feature'
  return (
    <svg
      viewBox={feature ? '-20 40 280 280' : '0 0 240 320'}
      className={cn('sp-print', className)}
      style={{ ['--ink-a' as string]: `var(--${a})`, ['--ink-b' as string]: `var(--${b})` }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={`${id}a`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
          <circle cx="3" cy="3" r="1.7" className="sp-print__dot-a" />
        </pattern>
        <pattern id={`${id}b`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
          <circle cx="3" cy="3" r="1.7" className="sp-print__dot-b" />
        </pattern>
      </defs>
      {print && (
        <>
          {feature && (
            <g className="sp-print__burst">
              {RAYS.map((turn) => (
                <path key={turn} d="M120 180 L104 40 L136 40 Z" transform={`rotate(${turn} 120 180)`} fill={`url(#${id}b)`} />
              ))}
            </g>
          )}
          <g className="ink-a">{print.a}</g>
          <g className="ink-b">{print.b}</g>
        </>
      )}
    </svg>
  )
}

interface PacketProps {
  game: GameConfig
  /** Position on the rack; fixes the packet's tilt so a returning visitor sees the same shelf. */
  order: number
  size?: PacketSize
  /** Prints the shelf name on the packet's top, for packets seen away from their shelf. */
  shelfTab?: boolean
}

/** A game as a seed packet: two-ink print, flap line, title and hook. The whole packet is one link. */
export function Packet({ game, order, size = 'rack', shelfTab = false }: PacketProps) {
  const titleId = useId()
  const hookId = useId()
  const shelf = SHELF_STYLE[game.category]
  return (
    <NextLink
      href={`/games/${game.slug}`}
      className={cn('sp-packet', `sp-packet--${size}`)}
      style={{ ['--tilt-base' as string]: `${TILTS[order % TILTS.length]}deg`, ['--shelf-ink' as string]: `var(--${shelf.ink})` }}
      aria-labelledby={titleId}
      aria-describedby={hookId}
    >
      {shelfTab && (
        <span className="sp-packet__tab" aria-hidden="true">
          <Icon name={shelf.glyph} />
          {SHOWCASE_GROUPS.find((group) => group.category === game.category)?.title}
        </span>
      )}
      <span className="sp-packet__window">
        <PacketArt gameId={game.id} />
      </span>
      <span className="sp-packet__title" id={titleId}>
        {game.title}
      </span>
      <span className="sp-packet__hook" id={hookId}>
        {game.hook}
      </span>
    </NextLink>
  )
}
