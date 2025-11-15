/**
 * Typography Design System
 * Standardized font sizes, weights, and line heights
 */

export const TYPOGRAPHY = {
  // Display (Hero sections, large headlines)
  display: {
    xl: 'text-6xl font-bold leading-tight tracking-tight', // 60px
    lg: 'text-5xl font-bold leading-tight tracking-tight', // 48px
    md: 'text-4xl font-bold leading-tight tracking-tight', // 36px
    sm: 'text-3xl font-bold leading-tight tracking-tight', // 30px
  },

  // Headings (Section titles, card headers)
  heading: {
    h1: 'text-4xl font-semibold leading-tight', // 36px
    h2: 'text-3xl font-semibold leading-tight', // 30px
    h3: 'text-2xl font-semibold leading-snug',  // 24px
    h4: 'text-xl font-semibold leading-snug',   // 20px
    h5: 'text-lg font-semibold leading-normal', // 18px
    h6: 'text-base font-semibold leading-normal', // 16px
  },

  // Body (Paragraphs, descriptions)
  body: {
    xl: 'text-xl leading-relaxed',    // 20px
    lg: 'text-lg leading-relaxed',    // 18px
    md: 'text-base leading-relaxed',  // 16px (default)
    sm: 'text-sm leading-relaxed',    // 14px
    xs: 'text-xs leading-normal',     // 12px
  },

  // Labels (Form labels, tags, badges)
  label: {
    lg: 'text-sm font-medium leading-none',
    md: 'text-xs font-medium leading-none',
    sm: 'text-[10px] font-medium leading-none uppercase tracking-wide',
  },

  // Code (Inline code, code blocks)
  code: {
    inline: 'text-sm font-mono bg-hover-bg px-1.5 py-0.5 rounded',
    block: 'text-sm font-mono leading-relaxed',
  },

  // Special (Quotes, captions)
  special: {
    quote: 'text-lg italic leading-relaxed text-foreground/80',
    caption: 'text-xs leading-normal text-foreground/60',
    overline: 'text-xs uppercase tracking-wider font-medium text-foreground/70',
  },
} as const

// Font weights for manual application
export const FONT_WEIGHTS = {
  light: 'font-light',      // 300
  normal: 'font-normal',    // 400
  medium: 'font-medium',    // 500
  semibold: 'font-semibold', // 600
  bold: 'font-bold',        // 700
} as const

// Line heights for manual application
export const LINE_HEIGHTS = {
  none: 'leading-none',       // 1
  tight: 'leading-tight',     // 1.25
  snug: 'leading-snug',       // 1.375
  normal: 'leading-normal',   // 1.5
  relaxed: 'leading-relaxed', // 1.625
  loose: 'leading-loose',     // 2
} as const

// Letter spacing for manual application
export const LETTER_SPACING = {
  tighter: 'tracking-tighter', // -0.05em
  tight: 'tracking-tight',     // -0.025em
  normal: 'tracking-normal',   // 0em
  wide: 'tracking-wide',       // 0.025em
  wider: 'tracking-wider',     // 0.05em
  widest: 'tracking-widest',   // 0.1em
} as const

// Text utilities
export const TEXT_UTILS = {
  // Alignment
  align: {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  },

  // Truncation
  truncate: {
    single: 'truncate',
    lines: (lines: number) => `line-clamp-${lines}`,
  },

  // Transform
  transform: {
    uppercase: 'uppercase',
    lowercase: 'lowercase',
    capitalize: 'capitalize',
    normal: 'normal-case',
  },

  // Decoration
  decoration: {
    underline: 'underline',
    overline: 'overline',
    lineThrough: 'line-through',
    none: 'no-underline',
  },
} as const

/**
 * Helper function to combine typography classes
 * @example getTypography('heading.h1', 'text-accent')
 */
export function getTypography(
  variant: keyof typeof TYPOGRAPHY | string,
  additionalClasses?: string
): string {
  const parts = variant.split('.')
  let baseClasses = ''

  if (parts.length === 2) {
    const [category, size] = parts
    const typographyCategory = TYPOGRAPHY[category as keyof typeof TYPOGRAPHY]
    if (typographyCategory && typeof typographyCategory === 'object') {
      baseClasses = typographyCategory[size as keyof typeof typographyCategory] || ''
    }
  }

  return additionalClasses ? `${baseClasses} ${additionalClasses}`.trim() : baseClasses
}
