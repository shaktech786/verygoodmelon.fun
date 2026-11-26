import localFont from 'next/font/local'

export const atkinson = localFont({
  src: '../../app/fonts/AtkinsonHyperlegibleNext-wght.woff2',
  weight: '200 800',
  variable: '--font-atkinson',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
})

// Titles only. Preloaded because the home sign, the largest text on the page, is set in it.
export const bricolage = localFont({
  src: '../../app/fonts/BricolageGrotesque-display.woff2',
  weight: '600 800',
  variable: '--font-bricolage',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
})
