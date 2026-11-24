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
  className?: string
}

/** A packet's two-ink print. */
export function PacketArt({ gameId, className }: PacketArtProps) {
  const id = useId().replace(/:/g, '')
  const [a, b] = PACKET_INKS[gameId] ?? ['ink', 'ink']
  const print = PRINTS[gameId]?.({ a: `url(#${id}a)`, b: `url(#${id}b)` })
  return (
    <svg
      viewBox="0 0 240 320"
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
}

/** A game as a seed packet: shelf tab, two-ink print, flap line, title and hook. The whole packet is one link. */
export function Packet({ game, order, size = 'rack' }: PacketProps) {
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
      <span className="sp-packet__tab" aria-hidden="true">
        <Icon name={shelf.glyph} />
        {SHOWCASE_GROUPS.find((group) => group.category === game.category)?.title}
      </span>
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
