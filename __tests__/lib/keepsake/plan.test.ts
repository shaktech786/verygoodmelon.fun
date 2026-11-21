import { framedKeepsake, hashString, keepsakeDay, keepsakeFileName, seededRandom, SITE_NAME, KEEPSAKE_HEIGHT, KEEPSAKE_WIDTH } from '@/lib/keepsake/plan'
import { inkColour, wrapLines } from '@/lib/keepsake/render'

describe('framedKeepsake: the paper every keepsake is drawn on', () => {
  const plan = framedKeepsake({
    title: 'The Dilemma',
    subtitle: 'Saturday 21 November',
    art: [{ kind: 'disc', x: 540, y: 600, r: 40, ink: 'gold' }],
    alt: 'A single star.',
    text: 'One star tonight.',
    fileName: 'the-dilemma-2026-11-21.png',
  })

  it('starts with paper the size of the canvas, then draws the art over it', () => {
    expect(plan.width).toBe(KEEPSAKE_WIDTH)
    expect(plan.height).toBe(KEEPSAKE_HEIGHT)
    expect(plan.ops[0]).toEqual({ kind: 'rect', x: 0, y: 0, w: KEEPSAKE_WIDTH, h: KEEPSAKE_HEIGHT, ink: 'paper' })
    expect(plan.ops).toContainEqual({ kind: 'disc', x: 540, y: 600, r: 40, ink: 'gold' })
  })

  it('names the game, the day and the site in words on the picture', () => {
    const words = plan.ops.flatMap((op) => (op.kind === 'text' ? [op.text] : []))
    expect(words).toEqual(['THE DILEMMA', 'Saturday 21 November', SITE_NAME])
  })

  it('signs the copied words with the game and the site', () => {
    expect(plan.text).toBe(`One star tonight.\n\nThe Dilemma · ${SITE_NAME}`)
    expect(plan.alt).toBe('A single star.')
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

  it('follows the theme for named inks and keeps a fixed colour as it is', () => {
    expect(inkColour('paper', 'light')).not.toBe(inkColour('paper', 'dark'))
    expect(inkColour('#17223b', 'dark')).toBe('#17223b')
  })
})
