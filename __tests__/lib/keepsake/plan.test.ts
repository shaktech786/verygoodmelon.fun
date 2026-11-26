import { framedKeepsake, hashString, keepsakeDay, keepsakeFileName, seededRandom, SITE_NAME, KEEPSAKE_HEIGHT, KEEPSAKE_WIDTH } from '@/lib/keepsake/plan'
import { inkColour, lookFor, wrapLines } from '@/lib/keepsake/render'
import { PALETTES } from '@/lib/design/tokens'

describe('framedKeepsake: the paper every keepsake is drawn on', () => {
  const plan = framedKeepsake({
    title: 'The Dilemma',
    subtitle: 'Saturday 21 November',
    art: [{ kind: 'disc', x: 540, y: 600, r: 40, ink: 'brass' }],
    alt: 'A single star.',
    text: 'One star tonight.',
    fileName: 'the-dilemma-2026-11-21.png',
  })

  it('starts with paper the size of the canvas, then draws the art over it', () => {
    expect(plan.width).toBe(KEEPSAKE_WIDTH)
    expect(plan.height).toBe(KEEPSAKE_HEIGHT)
    expect(plan.ops[0]).toEqual({ kind: 'rect', x: 0, y: 0, w: KEEPSAKE_WIDTH, h: KEEPSAKE_HEIGHT, ink: 'paper' })
    expect(plan.ops).toContainEqual({ kind: 'disc', x: 540, y: 600, r: 40, ink: 'brass' })
  })

  it('names the game, the day and the site in words on the picture', () => {
    const words = plan.ops.flatMap((op) => (op.kind === 'text' ? [op.text] : []))
    expect(words).toEqual(['The Dilemma', 'Saturday 21 November', SITE_NAME])
  })

  it('signs the copied words with the game and the site', () => {
    expect(plan.text).toBe(`One star tonight.\n\nThe Dilemma · ${SITE_NAME}`)
    expect(plan.alt).toBe('A single star.')
  })

  it('keeps the game’s name, so the picture can be named after it', () => {
    expect(plan.title).toBe('The Dilemma')
  })
})

describe('keepsake names and days', () => {
  it('names the file after the game and the local day', () => {
    expect(keepsakeFileName('The Final Word', new Date(2026, 0, 5, 23, 30))).toBe('the-final-word-2026-01-05.png')
  })

  it('writes the day the way a letter would', () => {
    expect(keepsakeDay(new Date(2026, 10, 21))).toBe('Saturday 21 November')
  })
})

describe('repeatable randomness', () => {
  it('draws the same sequence from the same words', () => {
    const a = seededRandom(hashString('Rest|Peace'))
    const b = seededRandom(hashString('Rest|Peace'))
    const first = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(first)
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true)
  })

  it('draws a different sequence from different words', () => {
    expect(seededRandom(hashString('Rest'))()).not.toBe(seededRandom(hashString('Peace'))())
  })
})

describe('drawing helpers', () => {
  it('wraps words onto lines no wider than asked, keeping line breaks', () => {
    const measure = (line: string) => line.length * 10
    expect(wrapLines(measure, 'one two three four\nfive', 90)).toEqual(['one two', 'three', 'four', 'five'])
  })

  it('takes every named ink from the Seedpress palette the page is in', () => {
    expect(inkColour('paper', lookFor('light'))).toBe(PALETTES.light.paper)
    expect(inkColour('paper', lookFor('dark'))).toBe(PALETTES.dark.paper)
    expect(inkColour('rind', lookFor('dark', 'quiet'))).toBe(PALETTES.darkQuiet.rind)
    expect(inkColour('paper', lookFor('light', 'gentle', 'high'))).toBe(PALETTES.lightHigh.paper)
  })

  it('keeps a glass ink on the dark palette whichever paper it is printed on', () => {
    expect(inkColour('glass-well', lookFor('light'))).toBe(PALETTES.dark.well)
    expect(inkColour('glass-well', lookFor('dark'))).toBe(PALETTES.dark.well)
    expect(inkColour('glass-brass', lookFor('light', 'quiet'))).toBe(PALETTES.darkQuiet.brass)
  })

  it('mixes two inks, the first at the weight given', () => {
    const look = lookFor('light')
    expect(inkColour(['ink', 1, 'paper'], look)).toBe(PALETTES.light.ink.toUpperCase())
    expect(inkColour(['ink', 0.5, 'paper'], look)).not.toBe(inkColour('ink', look))
  })

  it('prints flat in Quiet and high contrast, and with grain and a second-ink offset otherwise', () => {
    expect(lookFor('light').plain).toBe(false)
    expect(lookFor('dark', 'quiet').plain).toBe(true)
    expect(lookFor('light', 'gentle', 'high').plain).toBe(true)
  })
})
