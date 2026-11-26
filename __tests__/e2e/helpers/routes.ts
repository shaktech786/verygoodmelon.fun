import { ALL_GAMES } from '@/lib/games/config'

/** The content pages, then every game. Driven from the game config, so a new game is covered without editing a spec. */
export const CONTENT_ROUTES = ['/', '/games', '/about', '/support', '/privacy', '/terms', '/thoughts', '/offline'] as const
export const GAME_ROUTES = ALL_GAMES.map((game) => `/games/${game.slug}`)
export const ALL_ROUTES: string[] = [...CONTENT_ROUTES, ...GAME_ROUTES]
export const SETTINGS_KEY = 'verygoodmelon:accessibility:settings'

export const LOOKS = {
  light: { theme: 'light' },
  dark: { theme: 'dark' },
  'light-quiet': { theme: 'light', sense: 'quiet' },
  high: { theme: 'light', contrast: 'high' },
} as const
