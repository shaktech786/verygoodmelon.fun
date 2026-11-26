import { test, expect, type Page, type Route } from '@playwright/test'
import { readFileSync } from 'fs'
import path from 'path'
import { getWordOfDay, wordList } from '../../lib/games/hope-daily/words'
import { puzzleFor, revealFor } from '../../lib/games/hope-daily/daily'
import { fallbackCommentary } from '../../lib/games/hope-daily/commentary'
import { buildLadder, lettersInPlace, nextLetter, storyText } from '../../lib/games/hope-daily/puzzle'
import { expectKeepsakeSaves } from './helpers/keepsake'
import { setAmbientSound } from './helpers/ambient-sound'
import { expectOneGo } from './helpers/design'

/**
 * The Optimist: a true piece of good news with one word missing. The story unfolds a part
 * at a time, with every guess or on request, then the clue, then letters, until the word is
 * found or arrives by itself. There is no limit and no losing.
 *
 * The daily word is pinned by answering /api/hope-daily from the test with a real entry,
 * so every run plays the same puzzle. One test plays today's word against the real routes.
 */

const ENTRY = wordList.find(entry => entry.word === 'SOLAR')!
const PUZZLE = puzzleFor(ENTRY)
const REVEAL = revealFor(ENTRY)
const FACT = ENTRY.fact
const LADDER = buildLadder(PUZZLE.story.length)
const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')

interface Seen {
  guesses: string[]
  commentary: number
}

async function pinDailyWord(page: Page): Promise<Seen> {
  const seen: Seen = { guesses: [], commentary: 0 }

  await page.route('**/api/hope-daily', async (route: Route) => {
    const request = route.request()
    if (request.method() === 'GET') return route.fulfill({ json: PUZZLE })
    if (request.method() === 'PUT') return route.fulfill({ json: REVEAL })
    const body = request.postDataJSON()
    const guess = String(body.guess).toUpperCase()
    seen.guesses.push(guess)
    const inPlace = lettersInPlace(guess, ENTRY.word)
    if (guess === ENTRY.word) return route.fulfill({ json: { isCorrect: true, inPlace, reveal: REVEAL } })
    const letter = body.wantLetter ? nextLetter(ENTRY.word, [...body.known, ...inPlace.map(([position]) => position)]) : undefined
    return route.fulfill({ json: { isCorrect: false, inPlace, ...(body.wantLetter ? { letter } : {}) } })
  })

  await page.route('**/api/hope-daily/hint', route => {
    const letter = nextLetter(ENTRY.word, route.request().postDataJSON().known)
    return route.fulfill(letter ? { json: letter } : { status: 400, json: { error: 'Every letter is already known' } })
  })

  await page.route('**/api/hope-daily/commentary', route => {
    seen.commentary++
    const { guessNumber } = route.request().postDataJSON()
    return route.fulfill({ json: { commentary: `A thought about guess ${guessNumber}.` } })
  })

  return seen
}

// Answer the site-wide counters the way they fail while the database is unreachable.
async function quietBackground(page: Page) {
  await page.route(/\/api\/(game-events|site-visits)/, route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
}

const input = (page: Page) => page.getByRole('textbox', { name: 'Your guess' })
const status = (page: Page) => page.getByRole('status').first()
const story = (page: Page) => page.getByTestId('story')
const ending = (page: Page) => page.getByRole('region', { name: ENTRY.word })
const secondPart = storyText([PUZZLE.story[1]]).trim()

async function openGame(page: Page) {
  await page.goto('/games/the-silver-lining')
  await expect(input(page)).toBeVisible()
}

async function guess(page: Page, word: string) {
  await input(page).fill(word)
  await input(page).press('Enter')
}

async function expectFinished(page: Page) {
  await expect(page.getByTestId('good-news')).toContainText(FACT.slice(0, 30))
  await expect(page.getByRole('link', { name: /en\.wikipedia\.org/ })).toHaveAttribute('href', ENTRY.source)
  await expect(page.getByText(REVEAL.reflection, { exact: true })).toBeVisible()
  await expect(page.getByText("That is today's puzzle, complete.")).toBeVisible()
  await expect(input(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Read on|Show a letter|Start over/ })).toHaveCount(0)
}

test.beforeEach(async ({ page }) => {
  await quietBackground(page)
})

test('a first-time player reads the first part of the good news and finds the word in one guess', async ({ page }) => {
  await pinDailyWord(page)
  await openGame(page)

  await expect(page.getByText('Name the missing word, or just read on.')).toBeVisible()
  await expect(story(page)).toContainText('The first practical silicon')
  await expect(story(page)).not.toContainText(secondPart)
  await expect(page.getByText('(missing word)')).toBeAttached()

  await guess(page, 'solar')

  await expect(page.getByRole('heading', { name: 'SOLAR' })).toBeFocused()
  await expect(ending(page)).toContainText('You found it')
  await expect(page.getByTestId('good-news')).toHaveText(FACT)
  await expect(page.getByTestId('good-news').locator('strong')).toHaveText('solar')
  await expectFinished(page)

  // The faint focus mark around the word keeps clear of the label above it
  const label = (await ending(page).getByText('You found it', { exact: true }).boundingBox())!
  const word = (await page.getByRole('heading', { name: 'SOLAR' }).boundingBox())!
  expect(word.y - (label.y + label.height)).toBeGreaterThanOrEqual(8)

  // The day's clipping to keep, with the word inked into its gap
  await expect(ending(page).getByRole('heading', { name: 'Today’s clipping, to keep' })).toBeVisible()
  await expectKeepsakeSaves(page, {
    within: ending(page),
    fileName: /^the-optimist-\d{4}-\d{2}-\d{2}\.png$/,
    describedAs: /^A newspaper clipping of today’s good news.*The missing word, SOLAR, is inked into its place by hand\..*SOLAR/,
  })
})

test('a wrong guess is summed up in the words the page uses, and the story unfolds', async ({ page }) => {
  await pinDailyWord(page)
  await openGame(page)

  await guess(page, 'SOLID')
  await expect(status(page)).toHaveText('SOLID is not today’s word. Letter 1 is S, letter 2 is O and letter 3 is L. The story unfolds a little more.')
  await expect(page.getByText('Known so far: letter 1 is S, letter 2 is O, letter 3 is L.')).toBeAttached()
  await expect(page.getByTestId('word-slots')).toContainText('SOL')
  await expect(story(page)).toContainText(secondPart)
  await expect(page.getByText('A thought about guess 1.')).toBeVisible()
  await expect(page.getByText('Tried: SOLID')).toBeVisible()

  await guess(page, 'SOLID')
  await expect(status(page)).toHaveText('You tried SOLID already.')
})

test('reading on unfolds the story, then the clue, then letters, and the player says the last word themselves', async ({ page }) => {
  const seen = await pinDailyWord(page)
  await openGame(page)

  for (const step of LADDER.slice(1)) {
    await page.getByRole('button', { name: 'Read on' }).click()
    await expect(status(page)).toHaveText(step.kind === 'clue' ? 'The clue is now showing.' : 'The story unfolds a little more.')
  }
  await expect(page.getByText(`Clue: ${ENTRY.clue}`)).toBeVisible()
  await expect(story(page)).toContainText(storyText([PUZZLE.story[PUZZLE.story.length - 1]]).trim())
  await expect(page.getByText(/still folded/)).toHaveCount(0)

  for (const [position, letter] of [...ENTRY.word].entries()) {
    if (position === ENTRY.word.length - 1) break
    await page.getByRole('button', { name: 'Show a letter' }).click()
    await expect(status(page)).toHaveText(`Letter ${position + 1} is ${letter}.`)
  }
  await page.getByRole('button', { name: 'Show a letter' }).click()

  // The last letter does not end the game for them: the word waits in the box to be tried.
  await expect(status(page)).toHaveText('Letter 5 is R. Every letter is showing. Press Try it to finish.')
  await expect(input(page)).toHaveValue('SOLAR')
  await expect(input(page)).toBeFocused()
  await expect(page.getByRole('button', { name: 'Show a letter' })).toHaveCount(0)
  await input(page).press('Enter')

  await expect(page.getByRole('heading', { name: 'SOLAR' })).toBeFocused()
  await expect(ending(page)).toContainText('You found it')
  await expectFinished(page)
  expect(seen.guesses).toEqual(['SOLAR'])
})

test('once the story is all unfolded, a wrong guess also brings a letter', async ({ page }) => {
  await pinDailyWord(page)
  await openGame(page)
  for (let step = 1; step < LADDER.length; step++) await page.getByRole('button', { name: 'Read on' }).click()

  await guess(page, 'QUIET')
  await expect(status(page)).toHaveText('QUIET is not today’s word. Letter 1 is S.')
})

test('someone who would rather be told is asked once, can change their mind, and still gets the good news', async ({ page }) => {
  await pinDailyWord(page)
  await openGame(page)
  await expect(page.getByRole('button', { name: 'Tell me the word' })).toHaveCount(0)
  for (let step = 1; step < LADDER.length; step++) await page.getByRole('button', { name: 'Read on' }).click()

  await page.getByRole('button', { name: 'Tell me the word' }).click()
  await expect(page.getByText("This ends today's puzzle and shows the word with its good news.")).toBeVisible()
  await page.getByRole('button', { name: 'Keep playing' }).click()
  await expect(input(page)).toBeVisible()

  await page.getByRole('button', { name: 'Tell me the word' }).click()
  await page.getByRole('button', { name: 'Yes, show me' }).click()
  await expect(page.getByRole('heading', { name: 'SOLAR' })).toBeFocused()
  await expectFinished(page)

  await page.reload()
  await expectFinished(page)
})

test('reloading mid-game keeps every guess, letter and unfolded part, and there is no starting over', async ({ page }) => {
  await pinDailyWord(page)
  await openGame(page)
  await guess(page, 'SOLID')
  await expect(story(page)).toContainText(secondPart)
  await page.getByRole('button', { name: 'Read on' }).click()
  await expect(page.getByText(`Clue: ${ENTRY.clue}`)).toBeVisible()

  await page.reload()
  await expect(page.getByText('Tried: SOLID')).toBeVisible()
  await expect(page.getByText(`Clue: ${ENTRY.clue}`)).toBeVisible()
  await expect(page.getByTestId('word-slots')).toContainText('SOL')
  await expect(page.getByRole('button', { name: /start over/i })).toHaveCount(0)
})

test('a player mid-way through the earlier letter-grid version keeps their place', async ({ page }) => {
  await pinDailyWord(page)
  await page.addInitScript(today => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem('hope-daily-state', JSON.stringify({
      date: today,
      guesses: [['S', 'H', 'I', 'N', 'E'].map((letter, i) => ({ letter, state: i === 0 ? 'correct' : 'absent' }))],
      gameState: 'playing',
      revealedData: null,
      hintsUsed: 2,
      currentHint: 'Power from our nearest star',
      revealedLetters: [[4, 'R']],
    }))
  }, new Date().toISOString().slice(0, 10))
  await openGame(page)

  await expect(page.getByText('Tried: SHINE')).toBeVisible()
  await expect(page.getByText('Known so far: letter 1 is S, letter 5 is R.')).toBeAttached()
  await expect(page.getByText(`Clue: ${ENTRY.clue}`)).toBeVisible()

  await page.reload()
  await expect(page.getByText('Tried: SHINE')).toBeVisible()
})

test('a player who finished the earlier version today sees the finished good news', async ({ page }) => {
  await pinDailyWord(page)
  await page.addInitScript(today => {
    localStorage.setItem('hope-daily-state', JSON.stringify({
      date: today,
      guesses: [],
      gameState: 'lost',
      revealedData: { word: 'SOLAR', fact: 'old', category: 'Energy' },
    }))
  }, new Date().toISOString().slice(0, 10))
  await page.goto('/games/the-silver-lining')
  await expectFinished(page)
})

test('a saved game from an earlier day is set aside for the new word', async ({ page }) => {
  await pinDailyWord(page)
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem('hope-daily-state', JSON.stringify({
      version: 2, date: '2001-01-01', guesses: ['OLDER'], known: [], unfolded: 3, status: 'shown', reveal: null,
    }))
  })
  await openGame(page)

  await expect(page.getByText('Tried:')).toHaveCount(0)
  await expect(story(page)).not.toContainText(secondPart)
})

test('typing while focus is on a link never fills the game, and Enter belongs to whatever has focus', async ({ page }) => {
  const seen = await pinDailyWord(page)
  await openGame(page)

  await page.getByRole('link', { name: 'VeryGoodMelon.Fun home' }).focus()
  await page.keyboard.type('solar')
  await expect(input(page)).toHaveValue('')

  await page.getByRole('button', { name: 'Read on' }).focus()
  await page.keyboard.press('Enter')
  await expect(status(page)).toHaveText('The story unfolds a little more.')
  expect(seen.guesses).toEqual([])
  await expect(page).toHaveURL(/the-silver-lining/)
})

test('short guesses and other characters are explained or kept out without being sent', async ({ page }) => {
  const seen = await pinDailyWord(page)
  await openGame(page)

  await guess(page, 'sun')
  await expect(status(page)).toHaveText('Today’s word has 5 letters.')
  await input(page).fill('so1ar!')
  await expect(input(page)).toHaveValue('SOAR')
  await input(page).fill('')
  await input(page).press('Enter')
  await expect(status(page)).toHaveText('Type a word first.')
  expect(seen.guesses).toEqual([])
})

test('a guess that cannot reach the server asks to try again without revealing why', async ({ page }) => {
  const seen = await pinDailyWord(page)
  let failNext = true
  await page.route('**/api/hope-daily', async route => {
    if (route.request().method() !== 'POST' || !failNext) return route.fallback()
    failNext = false
    return route.fulfill({ status: 500, body: 'Internal Server Error' })
  })
  await openGame(page)

  await guess(page, 'solar')
  await expect(status(page)).toHaveText('That guess did not go through. Give it another try in a moment.')
  await expect(input(page)).toHaveValue('SOLAR')

  await input(page).press('Enter')
  await expect(page.getByTestId('good-news')).toHaveText(FACT)
  expect(seen.guesses).toEqual(['SOLAR'])
})

test('an unavailable letter is not counted and can be asked for again', async ({ page }) => {
  await pinDailyWord(page)
  let failNext = true
  await page.route('**/api/hope-daily/hint', async route => {
    if (!failNext) return route.fallback()
    failNext = false
    return route.fulfill({ status: 500, json: {} })
  })
  await openGame(page)
  for (let step = 1; step < LADDER.length; step++) await page.getByRole('button', { name: 'Read on' }).click()

  await page.getByRole('button', { name: 'Show a letter' }).click()
  await expect(status(page)).toHaveText('No letter just now. Try again in a moment.')
  await page.getByRole('button', { name: 'Show a letter' }).click()
  await expect(status(page)).toHaveText('Letter 1 is S.')
})

test('the line after a guess answers the newest guess, and only the first three are answered live', async ({ page }) => {
  const seen = await pinDailyWord(page)
  await page.route('**/api/hope-daily/commentary', async route => {
    seen.commentary++
    const { guessNumber } = route.request().postDataJSON()
    if (guessNumber === 1) await new Promise(resolve => setTimeout(resolve, 1500))
    return route.fulfill({ json: { commentary: `About guess ${guessNumber}.` } })
  })
  await openGame(page)

  await guess(page, 'TRAIN')
  await expect(page.getByText('Tried: TRAIN')).toBeVisible()
  await guess(page, 'HOUSE')
  await expect(page.getByText('About guess 2.')).toBeVisible()
  await page.waitForTimeout(2000)
  await expect(page.getByText('About guess 1.')).toHaveCount(0)

  for (const word of ['PLANT', 'CORAL', 'QUIET']) {
    await guess(page, word)
    await expect(page.getByText(new RegExp(`Tried: .*${word}`))).toBeVisible()
  }
  expect(seen.commentary).toBe(3)
  await expect(page.getByText(fallbackCommentary('QUIET', 5))).toBeVisible()
})

test('if the good news cannot be fetched at the end, it arrives on the next visit', async ({ page }) => {
  await pinDailyWord(page)
  let failReveal = true
  await page.route('**/api/hope-daily', async route => {
    if (route.request().method() !== 'PUT' || !failReveal) return route.fallback()
    return route.fulfill({ status: 500, body: '' })
  })
  await openGame(page)
  for (let step = 1; step < LADDER.length; step++) await page.getByRole('button', { name: 'Read on' }).click()
  await page.getByRole('button', { name: 'Tell me the word' }).click()
  await page.getByRole('button', { name: 'Yes, show me' }).click()
  await expect(page.getByText('The good news is on its way.')).toBeVisible()

  failReveal = false
  await page.reload()
  await expectFinished(page)
})

test('when the puzzle cannot load, a calm retry brings it back', async ({ page }) => {
  await pinDailyWord(page)
  let failing = true
  await page.route('**/api/hope-daily', async route => {
    if (route.request().method() !== 'GET' || !failing) return route.fallback()
    return route.fulfill({ status: 500, body: '' })
  })
  await page.goto('/games/the-silver-lining')

  await expect(page.getByText("Today's good news is taking a moment to arrive.")).toBeVisible()
  failing = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(input(page)).toBeVisible()
})

test('the good news, not a score, can be passed on with its source', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await pinDailyWord(page)
  await openGame(page)
  await guess(page, 'solar')

  await page.getByRole('button', { name: 'Pass the good news on' }).click()
  await expect(page.getByText('Copied. Thank you for passing it on.')).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain(FACT)
  expect(copied).toContain(ENTRY.source)
  expect(copied).not.toMatch(/guess|tries|\d\/\d/i)
})

test('with reduced motion the good news appears without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await pinDailyWord(page)
  await openGame(page)
  await guess(page, 'solar')
  await expect(page.getByTestId('good-news')).toHaveText(FACT)
  await expect(page.getByTestId('good-news').locator('.animate-fade')).toHaveCount(0)
  // The found word is simply in its slots
  await expect(page.getByTestId('solved-word')).toHaveText('SOLAR')
  expect(await letterDrops(page)).toEqual([])
})

/** Start delays of the letters dropping into the found word's slots, in order. */
function letterDrops(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter(a => (a as CSSAnimation).animationName === 'optimist-letter-drop')
      .map(a => Math.round(Number(a.effect?.getComputedTiming().delay ?? 0)))
      .sort((a, b) => a - b)
  )
}

/** Records every tone the page starts, so a chime can be heard without speakers. */
async function listenForTones(page: Page) {
  await page.addInitScript(() => {
    const heard: number[] = []
    Object.assign(window, { __heard: heard })
    const Real = window.AudioContext
    window.AudioContext = class extends Real {
      createOscillator() {
        const oscillator = super.createOscillator()
        const start = oscillator.start.bind(oscillator)
        oscillator.start = (when?: number) => {
          heard.push(oscillator.frequency.value)
          start(when)
        }
        return oscillator
      }
    }
  })
}

const SOLVED_CHIME_HZ = 659.25
const chimes = (page: Page) => page.evaluate((hz) => (window as unknown as { __heard: number[] }).__heard.filter(f => f === hz).length, SOLVED_CHIME_HZ)

test('when the word is found, its letters drop into their slots one by one, about 60ms apart', async ({ page }) => {
  await pinDailyWord(page)
  await openGame(page)
  await guess(page, 'solar')
  await expect(page.getByRole('heading', { name: 'SOLAR' })).toBeFocused()
  await expect(page.getByTestId('solved-word')).toHaveText('SOLAR')
  expect(await letterDrops(page)).toEqual([0, 60, 120, 180, 240])
})

test('the found word stays silent unless the page sound was turned on, then rings one soft chime', async ({ page }) => {
  await listenForTones(page)
  await pinDailyWord(page)
  await openGame(page)
  await guess(page, 'solar')
  await expect(page.getByTestId('solved-word')).toHaveText('SOLAR')
  await page.waitForTimeout(800)
  expect(await chimes(page)).toBe(0)

  await page.evaluate(() => localStorage.removeItem('hope-daily-state'))
  await page.reload()
  await expect(input(page)).toBeVisible()
  await setAmbientSound(page, true)
  await guess(page, 'solar')
  await expect(page.getByTestId('solved-word')).toHaveText('SOLAR')
  await expect.poll(() => chimes(page)).toBe(1)
})

test("plays today's real word against the real routes, and a returning player sees the finished good news", async ({ page }) => {
  await page.route('**/api/hope-daily/commentary', route => route.fulfill({ json: { commentary: 'Lovely.' } }))
  const today = getWordOfDay()
  const todayReveal = revealFor(today)

  await openGame(page)
  await expect(page.getByRole('heading', { name: `Today's good news · ${today.category}` })).toBeVisible()
  await guess(page, 'Q'.repeat(today.word.length))
  await expect(status(page)).toContainText('is not today’s word.')

  await guess(page, today.word)
  await expect(page.getByTestId('good-news')).toHaveText(today.fact)
  await expect(page.getByText(todayReveal.reflection, { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('good-news')).toHaveText(today.fact)
  await expect(input(page)).toHaveCount(0)
})

async function axeViolations(page: Page) {
  await page.waitForTimeout(600)
  await page.addScriptTag({ content: AXE_SOURCE })
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe
    const result = await axe.run({ include: [['main']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
    return result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)
  })
}

test('the folded parts of the story stay visible under the highest contrast in dark', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('verygoodmelon:accessibility:settings', JSON.stringify({ theme: 'dark', contrast: 'extra-high' }))
  )
  await pinDailyWord(page)
  await openGame(page)
  const contrast = await page.getByTestId('folded-word').first().evaluate(bar => {
    // Paint the card, then the bar over it, and read back what the eye gets.
    const ctx = document.createElement('canvas').getContext('2d')!
    const paint = (...colours: string[]) => {
      for (const colour of colours) {
        ctx.fillStyle = colour
        ctx.fillRect(0, 0, 1, 1)
      }
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
    }
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map(c => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const card = getComputedStyle(bar.closest('article')!).backgroundColor
    const [a, b] = [luminance(paint(card)), luminance(paint(card, getComputedStyle(bar).backgroundColor))]
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  })
  expect(contrast).toBeGreaterThanOrEqual(3)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`playing and the ending have no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await pinDailyWord(page)
    await openGame(page)
    await guess(page, 'SOLID')
    for (let step = 2; step < LADDER.length; step++) await page.getByRole('button', { name: 'Read on' }).click()
    await page.getByRole('button', { name: 'Tell me the word' }).click()
    expect(await axeViolations(page)).toEqual([])
    await expectOneGo(page)

    await guess(page, 'solar')
    await expect(page.getByTestId('good-news')).toHaveText(FACT)
    expect(await axeViolations(page)).toEqual([])
    await expectOneGo(page)
  })
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('nothing blank is left reserved under the guess box before anything has been said', async ({ page }) => {
    await pinDailyWord(page)
    await openGame(page)
    const hint = await page.getByText('5 letters. No limit on guesses.').boundingBox()
    const game = await page.locator('.sp-stage').boundingBox()
    const gameBottom = (game?.y ?? 0) + (game?.height ?? 0)
    expect(gameBottom - ((hint?.y ?? 0) + (hint?.height ?? 0))).toBeLessThanOrEqual(48)
  })

  test('the instructions, the story and the guess box are all on the first screen', async ({ page }) => {
    await pinDailyWord(page)
    await openGame(page)

    for (const locator of [page.getByText('Name the missing word, or just read on.'), story(page), input(page), page.getByRole('button', { name: 'Try it' })]) {
      const box = await locator.boundingBox()
      expect(box && box.y + box.height).toBeLessThanOrEqual(844)
    }
  })

  test('tapping Try it keeps focus in the guess box after every attempt, right or short', async ({ page }) => {
    await pinDailyWord(page)
    await openGame(page)
    const tryIt = page.getByRole('button', { name: 'Try it' })

    await input(page).fill('PLANT')
    await tryIt.tap()
    await expect(status(page)).not.toHaveText('')
    await expect(input(page)).toBeFocused()

    await input(page).fill('ABC')
    await tryIt.tap()
    await expect(status(page)).toHaveText('Today’s word has 5 letters.')
    await expect(input(page)).toBeFocused()
  })

  test('a long found word stays on one line in its slots, without sideways scrolling', async ({ page }) => {
    await page.route('**/api/hope-daily', route => {
      const request = route.request()
      if (request.method() === 'GET') return route.fulfill({ json: { ...PUZZLE, wordLength: 12 } })
      return route.fulfill({ json: { isCorrect: true, inPlace: [], reveal: { ...REVEAL, word: 'RENEWABILITY' } } })
    })
    await openGame(page)
    await guess(page, 'renewability')
    const word = page.getByTestId('solved-word')
    await expect(word).toHaveText('RENEWABILITY')
    const box = await word.boundingBox()
    const slot = await word.locator(':scope > span').first().boundingBox()
    expect(box && box.x + box.width).toBeLessThanOrEqual(390)
    expect(box!.height).toBeLessThan(slot!.height * 1.5)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })

  test('the longest word fits without sideways scrolling and the controls are easy to tap', async ({ page }) => {
    await page.route('**/api/hope-daily', route =>
      route.request().method() === 'GET' ? route.fulfill({ json: { ...PUZZLE, wordLength: 12 } }) : route.fallback()
    )
    await openGame(page)

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    const slots = await page.getByTestId('word-slots').boundingBox()
    expect(slots && slots.x + slots.width).toBeLessThanOrEqual(390)
    for (const name of ['Try it', 'Read on']) {
      const button = await page.getByRole('button', { name }).boundingBox()
      // Sub-pixel layout can land a hair under 44
      expect(button?.height).toBeGreaterThanOrEqual(43.9)
    }
  })
})
