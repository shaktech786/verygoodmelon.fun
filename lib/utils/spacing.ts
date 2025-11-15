/**
 * Spacing Design System
 * Standardized spacing scale for consistent layouts
 * Base unit: 4px (0.25rem)
 */

export const SPACING = {
  // Micro spacing (for tight elements)
  micro: {
    '0': 'gap-0',      // 0px
    '1': 'gap-1',      // 4px
    '2': 'gap-2',      // 8px
    '3': 'gap-3',      // 12px
  },

  // Component spacing (internal padding/gaps)
  component: {
    xs: 'gap-1',   // 4px
    sm: 'gap-2',   // 8px
    md: 'gap-3',   // 12px
    lg: 'gap-4',   // 16px
    xl: 'gap-6',   // 24px
  },

  // Section spacing (between major sections)
  section: {
    xs: 'gap-6',   // 24px
    sm: 'gap-8',   // 32px
    md: 'gap-12',  // 48px
    lg: 'gap-16',  // 64px
    xl: 'gap-24',  // 96px
  },

  // Container padding
  container: {
    xs: 'p-4',   // 16px
    sm: 'p-6',   // 24px
    md: 'p-8',   // 32px
    lg: 'p-12',  // 48px
    xl: 'p-16',  // 64px
  },

  // Card padding
  card: {
    xs: 'p-3',   // 12px
    sm: 'p-4',   // 16px
    md: 'p-6',   // 24px
    lg: 'p-8',   // 32px
  },
} as const

// Padding utilities
export const PADDING = {
  // All sides
  all: {
    '0': 'p-0',
    '1': 'p-1',   // 4px
    '2': 'p-2',   // 8px
    '3': 'p-3',   // 12px
    '4': 'p-4',   // 16px
    '6': 'p-6',   // 24px
    '8': 'p-8',   // 32px
    '12': 'p-12', // 48px
    '16': 'p-16', // 64px
  },

  // X-axis (left/right)
  x: {
    '0': 'px-0',
    '1': 'px-1',
    '2': 'px-2',
    '3': 'px-3',
    '4': 'px-4',
    '6': 'px-6',
    '8': 'px-8',
    '12': 'px-12',
  },

  // Y-axis (top/bottom)
  y: {
    '0': 'py-0',
    '1': 'py-1',
    '2': 'py-2',
    '3': 'py-3',
    '4': 'py-4',
    '6': 'py-6',
    '8': 'py-8',
    '12': 'py-12',
  },

  // Individual sides
  top: {
    '0': 'pt-0',
    '1': 'pt-1',
    '2': 'pt-2',
    '3': 'pt-3',
    '4': 'pt-4',
    '6': 'pt-6',
    '8': 'pt-8',
    '12': 'pt-12',
  },

  right: {
    '0': 'pr-0',
    '1': 'pr-1',
    '2': 'pr-2',
    '3': 'pr-3',
    '4': 'pr-4',
    '6': 'pr-6',
    '8': 'pr-8',
    '12': 'pr-12',
  },

  bottom: {
    '0': 'pb-0',
    '1': 'pb-1',
    '2': 'pb-2',
    '3': 'pb-3',
    '4': 'pb-4',
    '6': 'pb-6',
    '8': 'pb-8',
    '12': 'pb-12',
  },

  left: {
    '0': 'pl-0',
    '1': 'pl-1',
    '2': 'pl-2',
    '3': 'pl-3',
    '4': 'pl-4',
    '6': 'pl-6',
    '8': 'pl-8',
    '12': 'pl-12',
  },
} as const

// Margin utilities
export const MARGIN = {
  // All sides
  all: {
    '0': 'm-0',
    '1': 'm-1',
    '2': 'm-2',
    '3': 'm-3',
    '4': 'm-4',
    '6': 'm-6',
    '8': 'm-8',
    '12': 'm-12',
    '16': 'm-16',
    'auto': 'm-auto',
  },

  // X-axis (left/right)
  x: {
    '0': 'mx-0',
    '1': 'mx-1',
    '2': 'mx-2',
    '3': 'mx-3',
    '4': 'mx-4',
    '6': 'mx-6',
    '8': 'mx-8',
    '12': 'mx-12',
    'auto': 'mx-auto',
  },

  // Y-axis (top/bottom)
  y: {
    '0': 'my-0',
    '1': 'my-1',
    '2': 'my-2',
    '3': 'my-3',
    '4': 'my-4',
    '6': 'my-6',
    '8': 'my-8',
    '12': 'my-12',
    'auto': 'my-auto',
  },

  // Individual sides
  top: {
    '0': 'mt-0',
    '1': 'mt-1',
    '2': 'mt-2',
    '3': 'mt-3',
    '4': 'mt-4',
    '6': 'mt-6',
    '8': 'mt-8',
    '12': 'mt-12',
    'auto': 'mt-auto',
  },

  right: {
    '0': 'mr-0',
    '1': 'mr-1',
    '2': 'mr-2',
    '3': 'mr-3',
    '4': 'mr-4',
    '6': 'mr-6',
    '8': 'mr-8',
    '12': 'mr-12',
    'auto': 'mr-auto',
  },

  bottom: {
    '0': 'mb-0',
    '1': 'mb-1',
    '2': 'mb-2',
    '3': 'mb-3',
    '4': 'mb-4',
    '6': 'mb-6',
    '8': 'mb-8',
    '12': 'mb-12',
    'auto': 'mb-auto',
  },

  left: {
    '0': 'ml-0',
    '1': 'ml-1',
    '2': 'ml-2',
    '3': 'ml-3',
    '4': 'ml-4',
    '6': 'ml-6',
    '8': 'ml-8',
    '12': 'ml-12',
    'auto': 'ml-auto',
  },
} as const

// Gap utilities (for flex/grid)
export const GAP = {
  '0': 'gap-0',
  '1': 'gap-1',   // 4px
  '2': 'gap-2',   // 8px
  '3': 'gap-3',   // 12px
  '4': 'gap-4',   // 16px
  '6': 'gap-6',   // 24px
  '8': 'gap-8',   // 32px
  '12': 'gap-12', // 48px
  '16': 'gap-16', // 64px
} as const

// Space between utilities (for flex children)
export const SPACE = {
  x: {
    '0': 'space-x-0',
    '1': 'space-x-1',
    '2': 'space-x-2',
    '3': 'space-x-3',
    '4': 'space-x-4',
    '6': 'space-x-6',
    '8': 'space-x-8',
  },

  y: {
    '0': 'space-y-0',
    '1': 'space-y-1',
    '2': 'space-y-2',
    '3': 'space-y-3',
    '4': 'space-y-4',
    '6': 'space-y-6',
    '8': 'space-y-8',
  },
} as const

/**
 * Layout presets for common patterns
 */
export const LAYOUT_PRESETS = {
  // Page containers
  page: 'container mx-auto px-6 py-12 max-w-7xl',
  pageNarrow: 'container mx-auto px-6 py-12 max-w-4xl',
  pageWide: 'container mx-auto px-6 py-12 max-w-[1400px]',

  // Content sections
  section: 'py-12 md:py-16 lg:py-24',
  sectionCompact: 'py-8 md:py-12',

  // Cards
  card: 'p-6 space-y-4',
  cardCompact: 'p-4 space-y-3',
  cardGenerous: 'p-8 space-y-6',

  // Stacks (vertical spacing)
  stackTight: 'space-y-2',
  stackNormal: 'space-y-4',
  stackRelaxed: 'space-y-6',
  stackGenerous: 'space-y-8',

  // Inline (horizontal spacing)
  inlineTight: 'space-x-2',
  inlineNormal: 'space-x-4',
  inlineRelaxed: 'space-x-6',
} as const
