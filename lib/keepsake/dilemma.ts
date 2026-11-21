import { THEMES, THEME_TITLE, readingLine, type ChosenValue, type Theme } from '@/lib/games/hard-choices/reading'
import { KEEPSAKE_WIDTH, MARGIN, framedKeepsake, hashString, keepsakeDay, keepsakeFileName, seededRandom, type KeepsakeOp, type KeepsakePlan } from './plan'

// The chart is a night sky in both themes, as a star chart is.
const NIGHT = '#17223b'
const NIGHT_EDGE = '#24345a'
const STAR = '#f6d78f'
const GLOW = '#f6ad55'
const THREAD = '#c9d3ea'
const LABEL = '#ece6d6'
const HEADING = '#aeb9d1'

const SKY = { top: 220, bottom: 960 }
const STARS = { top: 360, bottom: 900 }

export interface DilemmaStar {
  value: string
  theme: Theme
  x: number
  y: number
  r: number
  /** Where the value's name sits, under its star. */
  labelY: number
  labelSize: number
}

export interface DilemmaCluster {
  theme: Theme
  title: string
  x: number
  stars: DilemmaStar[]
}

/** One column of stars per theme the player reached for, wandering down so each reads as a constellation. */
export function dilemmaConstellation(chosen: readonly ChosenValue[]): DilemmaCluster[] {
  const themes = THEMES.filter((theme) => chosen.some((c) => c.theme === theme))
  const left = MARGIN
  const width = KEEPSAKE_WIDTH - MARGIN * 2
  const column = width / Math.max(1, themes.length)
  return themes.map((theme, i) => {
    const values = chosen.filter((c) => c.theme === theme).map((c) => c.value)
    const random = seededRandom(hashString(values.join('|')))
    const x = left + column * (i + 0.5)
    const span = STARS.bottom - STARS.top
    const step = values.length > 1 ? Math.min(118, span / (values.length - 1)) : 0
    const start = STARS.top + (span - step * (values.length - 1)) / 2
    const sway = Math.min(column * 0.2, 130)
    const labelSize = step > 0 && step < 78 ? 22 : 26
    const stars = values.map((value, j) => {
      const side = values.length === 1 ? 0 : j % 2 === 0 ? -1 : 1
      const y = start + step * j + (random() - 0.5) * Math.min(14, step * 0.2)
      return {
        value,
        theme,
        x: x + side * sway * (0.55 + 0.45 * random()),
        y,
        r: 6 + 3 * random(),
        labelY: y + labelSize + 12,
        labelSize,
      }
    })
    return { theme, title: THEME_TITLE[theme], x, stars }
  })
}

function dust(seed: number): KeepsakeOp[] {
  const random = seededRandom(seed)
  return Array.from({ length: 70 }, () => ({
    kind: 'disc' as const,
    x: MARGIN + 12 + random() * (KEEPSAKE_WIDTH - MARGIN * 2 - 24),
    y: SKY.top + 12 + random() * (SKY.bottom - SKY.top - 24),
    r: 1.5 + random() * 2.5,
    ink: THREAD,
    alpha: 0.18 + random() * 0.35,
  }))
}

function moon(): KeepsakeOp[] {
  const x = KEEPSAKE_WIDTH / 2
  const y = (SKY.top + SKY.bottom) / 2
  return [
    { kind: 'disc', x, y, r: 70, ink: GLOW, alpha: 0.12 },
    { kind: 'disc', x, y, r: 48, ink: STAR },
    { kind: 'disc', x: x + 22, y: y - 12, r: 44, ink: NIGHT },
  ]
}

export interface DilemmaKeepsakeInput {
  chosen: readonly ChosenValue[]
  day: Date
}

export function dilemmaKeepsake({ chosen, day }: DilemmaKeepsakeInput): KeepsakePlan {
  const clusters = dilemmaConstellation(chosen)
  const reading = readingLine(chosen)
  const art: KeepsakeOp[] = [
    { kind: 'rect', x: MARGIN, y: SKY.top, w: KEEPSAKE_WIDTH - MARGIN * 2, h: SKY.bottom - SKY.top, ink: NIGHT_EDGE },
    { kind: 'rect', x: MARGIN + 12, y: SKY.top + 12, w: KEEPSAKE_WIDTH - MARGIN * 2 - 24, h: SKY.bottom - SKY.top - 24, ink: NIGHT },
    ...dust(hashString(chosen.map((c) => c.value).join('|') || 'empty')),
  ]
  if (clusters.length === 0) art.push(...moon())
  for (const cluster of clusters) {
    if (cluster.stars.length > 1) {
      art.push({ kind: 'line', points: cluster.stars.map((s) => [s.x, s.y] as const), ink: THREAD, width: 3, alpha: 0.45 })
    }
    art.push({ kind: 'text', x: cluster.x, y: SKY.top + 82, text: cluster.title, size: 24, ink: HEADING, font: 'sans', align: 'center', weight: 600, maxWidth: 220 })
    for (const star of cluster.stars) {
      art.push(
        { kind: 'disc', x: star.x, y: star.y, r: star.r * 2.8, ink: GLOW, alpha: 0.16 },
        { kind: 'rect', x: star.x - star.r * 2, y: star.y - 3, w: star.r * 4, h: 6, ink: STAR, alpha: 0.7 },
        { kind: 'rect', x: star.x - 3, y: star.y - star.r * 2, w: 6, h: star.r * 4, ink: STAR, alpha: 0.7 },
        { kind: 'disc', x: star.x, y: star.y, r: star.r, ink: STAR },
        { kind: 'text', x: star.x, y: star.labelY, text: star.value, size: star.labelSize, ink: LABEL, font: 'sans', align: 'center', weight: 500 },
      )
    }
  }
  art.push({
    kind: 'text',
    x: KEEPSAKE_WIDTH / 2,
    y: SKY.bottom + 84,
    text: reading,
    size: 40,
    ink: 'ink',
    font: 'serif',
    align: 'center',
    italic: true,
    maxWidth: 860,
    lineHeight: 56,
    maxLines: 3,
  })

  const groups = clusters.map((cluster) => `${cluster.title}: ${cluster.stars.map((s) => s.value).join(', ')}`)
  const alt = clusters.length
    ? `A star chart with one star for each value you reached for, gathered by theme. ${groups.join('. ')}. Beneath it: ${reading}`
    : `A night sky with a crescent moon and no stars yet. Beneath it: ${reading}`
  const text = clusters.length ? ['What I reached for today', '', ...groups, '', reading].join('\n') : reading

  return framedKeepsake({
    title: 'The Dilemma',
    subtitle: keepsakeDay(day),
    art,
    alt,
    text,
    fileName: keepsakeFileName('The Dilemma', day),
  })
}
