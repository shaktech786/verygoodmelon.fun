import type { GameConfig } from '@/lib/games/config'
import type { IconName } from './icons/glyphs'

export type Ink = 'moss' | 'dusk' | 'clay' | 'rind' | 'flesh' | 'seed' | 'ink'

/** Each shelf's spot ink and stamp. The shelf names and lines come from lib/games/config. */
export const SHELF_STYLE: Readonly<Record<GameConfig['category'], { ink: Ink; glyph: IconName }>> = {
  Calm: { ink: 'moss', glyph: 'slow' },
  Reflect: { ink: 'dusk', glyph: 'reflect' },
  Play: { ink: 'clay', glyph: 'play-shelf' },
}

/** The two inks each packet is printed in: its spot ink first (docs/design-system/PLAN.md §9). */
export const PACKET_INKS: Readonly<Record<string, readonly [Ink, Ink]>> = {
  'the-unrusher': ['moss', 'seed'],
  'breathing-patterns': ['moss', 'dusk'],
  'calm-garden': ['moss', 'clay'],
  'timeless-minds': ['dusk', 'seed'],
  'hard-choices': ['dusk', 'clay'],
  'last-words': ['dusk', 'clay'],
  'first-words': ['clay', 'dusk'],
  'mind-debate': ['dusk', 'clay'],
  'hard-talk': ['moss', 'ink'],
  'worry-capsule': ['clay', 'rind'],
  'hope-daily': ['clay', 'rind'],
  'idea-lab': ['clay', 'seed'],
  'thought-pockets': ['dusk', 'flesh'],
  cascade: ['clay', 'dusk'],
}
