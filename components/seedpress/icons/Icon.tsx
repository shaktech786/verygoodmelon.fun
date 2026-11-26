import { GLYPHS, type IconName } from './glyphs'

function toPath(rows: readonly string[]): string {
  return rows.flatMap((row, y) => Array.from(row, (cell, x) => (cell === 'X' ? `M${x} ${y}h1v1h-1z` : ''))).join('')
}

const PATHS = Object.fromEntries(Object.entries(GLYPHS).map(([name, rows]) => [name, toPath(rows)])) as Record<IconName, string>

interface IconProps {
  name: IconName
  /** Whole multiples of the 12-cell grid keep every cell crisp. */
  size?: 16 | 24 | 36 | 48
  className?: string
}

/** A seed stamp. Always decorative: the words beside it, or its button's label, carry the meaning. */
export function Icon({ name, size = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={PATHS[name]} fill="currentColor" />
    </svg>
  )
}
