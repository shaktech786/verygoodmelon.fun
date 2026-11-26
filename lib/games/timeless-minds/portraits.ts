import type { InkTheme } from '@/lib/design/inks'

const PORTRAITS = '/games/timeless-minds/portraits'

/**
 * The thinker's duotone portrait in the page's theme (made by scripts/duotone-avatars.mjs): the ink plate,
 * and the spot ink that prints over it. The spot plate is a separate picture so it can settle into register.
 */
export function portraitPlates(thinkerId: string, theme: InkTheme): { ink: string; spot: string } {
  return {
    ink: [PORTRAITS, theme, `${thinkerId}.webp`].join('/'),
    spot: [PORTRAITS, theme, `${thinkerId}-spot.webp`].join('/'),
  }
}
