/**
 * Seedpress tokens: the one source for colour, type, space, shape, motion, layers and sound.
 * `scripts/build-tokens.mjs` writes `app/styles/tokens.css` from this file, and
 * `__tests__/lib/design/tokens.test.ts` holds every colour pair to its contrast minimum.
 * Plain data only, so Node can load it without a build step.
 */

export const COLOR_ROLES = [
  'paper',
  'sheet',
  'well',
  'ink',
  'ink-soft',
  'rule',
  'rule-strong',
  'rind',
  'rind-wash',
  'flesh',
  'flesh-press',
  'on-flesh',
  'flesh-wash',
  'seed',
  'moss',
  'dusk',
  'clay',
] as const

export type ColorRole = (typeof COLOR_ROLES)[number]
export type Palette = Readonly<Record<ColorRole, string>>
export type PaletteName = 'light' | 'dark' | 'lightQuiet' | 'darkQuiet' | 'lightHigh' | 'darkHigh'

export const PALETTES: Readonly<Record<PaletteName, Palette>> = {
  light: {
    paper: '#F5EFE4',
    sheet: '#FFFAF2',
    well: '#EAE1D1',
    ink: '#1D2721',
    'ink-soft': '#4A574F',
    rule: '#D5CBB8',
    'rule-strong': '#6F7A6F',
    rind: '#1E5A3A',
    'rind-wash': '#DFE4D8',
    flesh: '#C23A4E',
    'flesh-press': '#A52F42',
    'on-flesh': '#FFFAF2',
    'flesh-wash': '#F8E3DE',
    seed: '#5E3B4C',
    moss: '#2C6656',
    dusk: '#4A4785',
    clay: '#9A4A26',
  },
  dark: {
    paper: '#151D18',
    sheet: '#1D2822',
    well: '#0F1511',
    ink: '#F0E9DD',
    'ink-soft': '#B9B3A7',
    rule: '#33413A',
    'rule-strong': '#7E8C83',
    rind: '#86CFA4',
    'rind-wash': '#2C3F34',
    flesh: '#F48A99',
    'flesh-press': '#F9A7B3',
    'on-flesh': '#22100F',
    'flesh-wash': '#373430',
    seed: '#DDB0C4',
    moss: '#7CC6B3',
    dusk: '#B1AEF2',
    clay: '#EEA27F',
  },
  lightQuiet: {
    paper: '#F2EEE8',
    sheet: '#FAF8F4',
    well: '#E7E2DA',
    ink: '#24292A',
    'ink-soft': '#4F5655',
    rule: '#D3CEC6',
    'rule-strong': '#727977',
    rind: '#3A5A4A',
    'rind-wash': '#DFE2DC',
    flesh: '#8E4F58',
    'flesh-press': '#784249',
    'on-flesh': '#FAF8F4',
    'flesh-wash': '#EDE4E1',
    seed: '#5C4A52',
    moss: '#45625B',
    dusk: '#55546F',
    clay: '#7A5444',
  },
  darkQuiet: {
    paper: '#1A1D1C',
    sheet: '#222625',
    well: '#141716',
    ink: '#E6E2DB',
    'ink-soft': '#ADA9A2',
    rule: '#373C3A',
    'rule-strong': '#7E8582',
    rind: '#9DBDAC',
    'rind-wash': '#333B38',
    flesh: '#D9A3AA',
    'flesh-press': '#E5BAC0',
    'on-flesh': '#1E1415',
    'flesh-wash': '#383535',
    seed: '#CDB7C0',
    moss: '#9EBDB5',
    dusk: '#B4B3CF',
    clay: '#D3B1A2',
  },
  lightHigh: {
    paper: '#FFFFFF',
    sheet: '#FFFFFF',
    well: '#F2F2F2',
    ink: '#000000',
    'ink-soft': '#2B2B2B',
    rule: '#4A4A4A',
    'rule-strong': '#000000',
    rind: '#0A3A20',
    'rind-wash': '#DDE3E0',
    flesh: '#9E1730',
    'flesh-press': '#7E1024',
    'on-flesh': '#FFFFFF',
    'flesh-wash': '#F3E3E6',
    seed: '#4A1F33',
    moss: '#0F4A3C',
    dusk: '#2E2B6B',
    clay: '#6E2E10',
  },
  darkHigh: {
    paper: '#000000',
    sheet: '#0D0D0D',
    well: '#000000',
    ink: '#FFFFFF',
    'ink-soft': '#DADADA',
    rule: '#BDBDBD',
    'rule-strong': '#FFFFFF',
    rind: '#A9EEC6',
    'rind-wash': '#232D27',
    flesh: '#FFB3BE',
    'flesh-press': '#FFD0D7',
    'on-flesh': '#000000',
    'flesh-wash': '#2A2122',
    seed: '#F0CFDD',
    moss: '#A6EBDA',
    dusk: '#D2D0FF',
    clay: '#FFC6AA',
  },
}

/** Lamplight for the care block: a little clay warmed into the sheet. */
export const CARE_PAPER = { ink: 'clay', weight: 0.06, over: 'sheet' } as const

export const SURFACES = ['paper', 'sheet', 'well'] as const

/** Every pair a reader depends on, with its WCAG minimum. Surfaces expand to paper, sheet and well. */
export const CONTRAST_PAIRS: readonly { fg: ColorRole; bg: ColorRole | 'surface'; min: number; why: string }[] = [
  { fg: 'ink', bg: 'surface', min: 4.5, why: 'body text' },
  { fg: 'ink-soft', bg: 'surface', min: 4.5, why: 'secondary text' },
  { fg: 'rind', bg: 'surface', min: 4.5, why: 'rind as text' },
  { fg: 'seed', bg: 'surface', min: 4.5, why: 'have-a-look notes' },
  { fg: 'moss', bg: 'surface', min: 4.5, why: 'Slow down shelf label' },
  { fg: 'dusk', bg: 'surface', min: 4.5, why: 'Reflect shelf label' },
  { fg: 'clay', bg: 'surface', min: 4.5, why: 'Play shelf label' },
  { fg: 'on-flesh', bg: 'flesh', min: 4.5, why: 'the go label' },
  { fg: 'on-flesh', bg: 'flesh-press', min: 4.5, why: 'the go label, pressed' },
  { fg: 'ink', bg: 'rind-wash', min: 4.5, why: 'a chosen item' },
  { fg: 'ink-soft', bg: 'rind-wash', min: 4.5, why: 'a chosen item, secondary text' },
  { fg: 'ink', bg: 'flesh-wash', min: 4.5, why: 'the print tray' },
  { fg: 'seed', bg: 'flesh-wash', min: 4.5, why: 'a note on the print tray' },
  { fg: 'rule-strong', bg: 'surface', min: 3, why: 'control edges' },
  { fg: 'flesh', bg: 'surface', min: 3, why: 'the go fill' },
  { fg: 'rind', bg: 'rind-wash', min: 3, why: 'the chosen edge' },
]

/** Sizes are rem so the text-size setting scales them. */
export const TYPE = {
  meta: { size: '0.875rem', leading: 1.45 },
  small: { size: '1rem', leading: 1.55 },
  body: { size: '1.125rem', leading: 1.6 },
  lead: { size: '1.375rem', leading: 1.5 },
  h3: { size: '1.5rem', leading: 1.3 },
  h2: { size: 'clamp(1.75rem, 1.45rem + 1vw, 2.25rem)', leading: 1.15 },
  h1: { size: 'clamp(2.25rem, 1.75rem + 2vw, 3.5rem)', leading: 1.1 },
  hero: { size: 'clamp(2.5rem, 1.6rem + 3.4vw, 4.5rem)', leading: 1.05 },
} as const

export const FONTS = {
  body: 'var(--font-atkinson), system-ui, sans-serif',
  display: 'var(--font-bricolage), var(--font-atkinson), system-ui, sans-serif',
} as const

/** The 4px scale, --s-1 to --s-9. */
export const SPACE = [4, 8, 12, 16, 24, 32, 48, 64, 96] as const

export const WIDTHS = { prose: '40rem', stage: '60rem', shop: '90rem' } as const

export const RADII = { sheet: '14px', stamp: '10px', slice: '999px' } as const

export const DURATIONS = { instant: 0, tap: 90, quick: 160, settle: 280, flourish: 700, print: 1600 } as const

export const EASES = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  stamp: 'cubic-bezier(0.3, 1.35, 0.5, 1)',
} as const

export const Z = { base: 0, raised: 1, tray: 20, header: 30, disclosure: 40, scrim: 50, dialog: 60, skip: 80 } as const

export type Sense = 'quiet' | 'gentle' | 'lively'
export const SENSES: readonly Sense[] = ['quiet', 'gentle', 'lively']
export const DEFAULT_SENSE: Sense = 'gentle'

/** What each stop of the dial allows. Tilt scales the packet angles below; lively reaches ±2°. */
export const SENSE_VALUES: Readonly<Record<Sense, { motion: number; grain: number; misreg: number; misregHover: number; tilt: number; lift: number }>> = {
  quiet: { motion: 0, grain: 0, misreg: 0, misregHover: 0, tilt: 0, lift: 0 },
  gentle: { motion: 1, grain: 0.04, misreg: 1, misregHover: 0, tilt: 1, lift: 3 },
  lively: { motion: 1, grain: 0.06, misreg: 1, misregHover: 2, tilt: 2 / 1.2, lift: 3 },
}

/** Packet angles in degrees, cycled by a packet's order so a returning visitor sees the same shelf. */
export const TILTS = [-1.2, 0.8, -0.4, 1.1, -0.9, 0.5] as const

/** UI sounds, made with WebAudio, only in Lively and only after the visitor turns sound on. */
export const SOUNDS = {
  press: { lengthMs: 40, peakDbfs: -30 },
  stamp: { lengthMs: 90, peakDbfs: -28 },
  feed: { lengthMs: 900, peakDbfs: -30 },
  ring: { lengthMs: 1200, peakDbfs: -26 },
} as const
