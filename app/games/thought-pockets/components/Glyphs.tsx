import { CardType, NodeType } from '@/types/thought-pockets'

interface GlyphProps {
  className?: string
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Svg({ className, children }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export function TypeGlyph({ type, className }: GlyphProps & { type: CardType }) {
  switch (type) {
    case 'evidence':
      return (
        <Svg className={className}>
          <circle cx="10.5" cy="10.5" r="5.5" {...stroke} />
          <path d="M15 15l5 5" {...stroke} />
        </Svg>
      )
    case 'logic':
      return (
        <Svg className={className}>
          <circle cx="12" cy="6.5" r="2" fill="currentColor" />
          <circle cx="6.5" cy="16.5" r="2" fill="currentColor" />
          <circle cx="17.5" cy="16.5" r="2" fill="currentColor" />
        </Svg>
      )
    case 'guard':
      return (
        <Svg className={className}>
          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" {...stroke} />
        </Svg>
      )
    case 'rhetoric':
      return (
        <Svg className={className}>
          <path d="M4 5h16v10H10l-5 4v-4H4z" {...stroke} />
        </Svg>
      )
    case 'doubt':
      return (
        <Svg className={className}>
          <path d="M4 12c2-3 4-3 6 0s4 3 6 0 3-2 4-1" {...stroke} />
          <path d="M4 17c2-3 4-3 6 0s4 3 6 0 3-2 4-1" {...stroke} opacity="0.5" />
        </Svg>
      )
  }
}

export function NodeGlyph({ type, className }: GlyphProps & { type: NodeType }) {
  switch (type) {
    case 'battle':
      return (
        <Svg className={className}>
          <circle cx="12" cy="12" r="7" {...stroke} />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </Svg>
      )
    case 'elite':
      return (
        <Svg className={className}>
          <circle cx="12" cy="12" r="7" {...stroke} />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" {...stroke} />
        </Svg>
      )
    case 'boss':
      return (
        <Svg className={className}>
          <circle cx="12" cy="12" r="9" {...stroke} />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.7" {...stroke} />
          <circle cx="12" cy="17" r="1.1" fill="currentColor" />
        </Svg>
      )
    case 'rest':
      return (
        <Svg className={className}>
          <path d="M12 3c2 3 3 4.5 3 6.5a3 3 0 0 1-6 0C9 7.5 10 6 12 3z" {...stroke} />
          <path d="M9 13h6v8H9z" {...stroke} />
        </Svg>
      )
    case 'shop':
      return (
        <Svg className={className}>
          <path d="M4 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-5a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h5z" {...stroke} />
        </Svg>
      )
    case 'event':
      return (
        <Svg className={className}>
          <path d="M5 20V4M5 4h11l-2 4 2 4H5" {...stroke} />
        </Svg>
      )
    case 'treasure':
      return (
        <Svg className={className}>
          <path d="M4 10h16v10H4zM4 10l2-5h12l2 5M12 10v4" {...stroke} />
        </Svg>
      )
  }
}

export const NODE_LABELS: Record<NodeType, string> = {
  battle: 'Fight',
  elite: 'Hard fight',
  boss: 'Boss',
  rest: 'Rest',
  shop: 'Shop',
  event: 'Encounter',
  treasure: 'Treasure',
}
