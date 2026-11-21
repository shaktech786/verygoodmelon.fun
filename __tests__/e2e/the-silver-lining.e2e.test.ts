import { test, expect, type Page, type Route } from '@playwright/test'
import { getWordOfDay } from '../../lib/games/hope-daily/words'

/**
 * The Optimist (Hope Daily): a daily word guess that ends with a hopeful fact.
 *
 * The daily word is pinned by answering /api/hope-daily from the test, so every
 * run plays the same puzzle. One test plays against the real routes using the
 * same word list the server reads.
 */

const WORD = 'SOLAR'
const FACT = 'Solar power costs have dropped 90% since 2010.'
const CATEGORY = 'Energy'
const CLUE = 'Power that comes from our nearest star'

type TileState = 'correct' | 'present' | 'absent'

function score(guess: string, target: string) {
  const states: TileState[] = guess.split('').map((letter, i) => (letter === target[i] ? 'correct' : 'absent'))
  const remaining = target.split('').filter((letter, i) => guess[i] !== letter)
  guess.split('').forEach((letter, i) => {
    const at = remaining.indexOf(letter)
    if (states[i] === 'absent' && at !== -1) {
      states[i] = 'present'
      remaining.splice(at, 1)
    }
  })
  return guess.split('').map((letter, i) => ({ letter, state: states[i] }))
}

interface PinnedWord {
  guesses: string[]
  hintRequests: Array<{ hintNumber: number; revealedPositions: number[] }>
}

async function pinDailyWord(page: Page): Promise<PinnedWord> {
  const seen: PinnedWord = { guesses: [], hintRequests: [] }

  await page.route('**/api/hope-daily', async (route: Route) => {
    const request = route.request()
    if (request.method() === 'GET') {
      return route.fulfill({ json: { wordLength: WORD.length, category: CATEGORY } })
    }
    if (request.method() === 'PUT') {
      return route.fulfill({ json: { word: WORD, fact: FACT, category: CATEGORY } })
    }
    const guess = String(request.postDataJSON().guess).toUpperCase()
    seen.guesses.push(guess)
    const isCorrect = guess === WORD
    return route.fulfill({
      json: {
        letterStates: score(guess, WORD),
        isCorrect,
        ...(isCorrect ? { word: WORD, fact: FACT, category: CATEGORY } : {}),
      },
    })
  })

  await page.route('**/api/hope-daily/hint', async (route: Route) => {
    const body = route.request().postDataJSON()
    seen.hintRequests.push(body)
    if (body.hintNumber === 1) {
      return route.fulfill({ json: { hint: CLUE, revealedLetter: null, hintNumber: 1 } })
    }
    const position = [0, 1, 2, 3, 4].find(p => !body.revealedPositions.includes(p)) ?? 0
    return route.fulfill({
      json: {
        hint: `The letter at ${position + 1} is "${WORD[position]}"`,
        revealedLetter: { position, letter: WORD[position] },
        hintNumber: body.hintNumber,
      },
    })
  })

  await page.route('**/api/hope-daily/commentary', route =>
    route.fulfill({ json: { commentary: route.request().postDataJSON().isCorrect ? 'Sunny!' : 'Keep going!' } })
  )

  return seen
}

// Answer the site-wide counters the way they fail while the database is unreachable.
async function quietBackground(page: Page) {
  await page.route(/\/api\/(game-events|site-visits)/, route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
}

async function openGame(page: Page) {
  await page.goto('/games/the-silver-lining')
  await expect(page.getByRole('button', { name: 'Q', exact: true })).toBeVisible()
}

function row(page: Page, index: number) {
  return page.getByRole('application', { name: /Hope Daily/ }).locator(':scope > div').nth(index)
}

async function typeGuess(page: Page, guess: string) {
  await page.keyboard.type(guess)
  await page.keyboard.press('Enter')
}

const factCard = (page: Page) => page.getByRole('region', { name: 'Educational fact' })

test.beforeEach(async ({ page }) => {
  await quietBackground(page)
})

test('a first-time player reads the theme and wins on the first guess', async ({ page }) => {
  await pinDailyWord(page)
  await openGame(page)

  await expect(page.getByText("Today's theme:")).toContainText(`${CATEGORY} · 5 letters`)
  await expect(page.getByText('Guess the 5-letter word about global progress in 6 tries.')).toBeVisible()

  await typeGuess(page, 'solar')

  await expect(page.getByRole('gridcell', { name: 'S - correct' })).toBeVisible()
  await expect(factCard(page)).toContainText(FACT)
  await expect(page.getByText('Come back tomorrow for a new word!')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start over' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /hint/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Q', exact: true })).toBeDisabled()
})

test('colours each letter and wins on the sixth and last guess using the on-screen keyboard', async ({ page }) => {
  const seen = await pinDailyWord(page)
  await openGame(page)

  const misses = ['TRAIN', 'HOUSE', 'PLANT', 'CORAL', 'POLAR']
  for (const [index, guess] of misses.entries()) {
    for (const letter of guess) await page.getByRole('button', { name: letter, exact: true }).click()
    await page.getByRole('button', { name: 'ENTER' }).click()
    await expect(row(page, index).getByRole('gridcell').first()).toHaveAttribute('aria-label', / - /)
  }
  await expect(page.getByText('Keep going!')).toBeVisible()

  await expect(row(page, 0).getByRole('gridcell')).toHaveText(['T', 'R', 'A', 'I', 'N'])
  await expect(page.getByRole('gridcell', { name: 'A - correct' }).first()).toBeVisible()
  await expect(page.getByRole('gridcell', { name: 'R - present' }).first()).toBeVisible()
  await expect(page.getByRole('gridcell', { name: 'T - absent' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'T', exact: true })).toHaveClass(/bg-foreground\/60/)

  // A tapped key keeps focus, and a physical Enter must submit rather than press it again.
  for (const letter of WORD) await page.getByRole('button', { name: letter, exact: true }).click()
  await page.keyboard.press('Enter')

  await expect(factCard(page)).toContainText(FACT)
  expect(seen.guesses).toEqual(['TRAIN', 'HOUSE', 'PLANT', 'CORAL', 'POLAR', 'SOLAR'])
})

test('losing reveals the word and the fact kindly, and survives a reload', async ({ page }) => {
  await pinDailyWord(page)
  await openGame(page)

  for (const [index, guess] of ['TRAIN', 'HOUSE', 'PLANT', 'CORAL', 'POLAR', 'MOLAR'].entries()) {
    await typeGuess(page, guess)
    await expect(row(page, index).getByRole('gridcell').first()).toHaveAttribute('aria-label', / - /)
  }

  await expect(factCard(page)).toContainText(`The word was ${WORD}.`)
  await expect(factCard(page)).toContainText(FACT)
  await expect(page.getByText('Not all puzzles need to be solved.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start over' })).toHaveCount(0)

  await page.reload()
  await expect(factCard(page)).toContainText(`The word was ${WORD}.`)
  await expect(page.getByRole('gridcell', { name: 'M - absent' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Q', exact: true })).toBeDisabled()
})

test('short guesses are explained without using up a try', async ({ page }) => {
  const seen = await pinDailyWord(page)
  await openGame(page)

  await typeGuess(page, 'sun')
  await expect(page.getByText('Not enough letters yet. The word has 5.')).toBeVisible()
  expect(seen.guesses).toEqual([])

  // Numbers and symbols never reach the board.
  await page.keyboard.type('12!')
  await expect(row(page, 0).getByRole('gridcell').filter({ hasText: /\S/ })).toHaveText(['S', 'U', 'N'])

  await page.keyboard.press('Backspace')
  await expect(row(page, 0).getByRole('gridcell').filter({ hasText: /\S/ })).toHaveText(['S', 'U'])
})

test('a guess the server rejects shows its reason and the row stays editable', async ({ page }) => {
  await pinDailyWord(page)
  await page.route('**/api/hope-daily', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    return route.fulfill({ status: 400, json: { error: 'Word must contain only letters' } })
  })
  await openGame(page)

  await typeGuess(page, 'solar')
  await expect(page.getByText('Word must contain only letters')).toBeVisible()
  await expect(row(page, 0).getByRole('gridcell')).toHaveText(['S', 'O', 'L', 'A', 'R'])
  await expect(row(page, 0).getByRole('gridcell').first()).toHaveAttribute('aria-label', 'S')
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

  await typeGuess(page, 'solar')
  await expect(page.getByText('That guess did not go through. Give it another try in a moment.')).toBeVisible()

  await page.keyboard.press('Enter')
  await expect(factCard(page)).toContainText(FACT)
  expect(seen.guesses).toEqual(['SOLAR'])
})

test('hints give a clue first, then letters the player has not found, and stop at three', async ({ page }) => {
  const seen = await pinDailyWord(page)
  await openGame(page)

  await typeGuess(page, 'SHINE')
  await expect(page.getByRole('gridcell', { name: 'S - correct' })).toBeVisible()

  await page.getByRole('button', { name: 'Get hint (3 remaining)' }).click()
  await expect(page.getByText(CLUE)).toBeVisible()

  await page.getByRole('button', { name: 'Get hint (2 remaining)' }).click()
  await expect(page.getByText('letter 2 is O')).toBeVisible()
  // The clue stays on screen once letters start being revealed.
  await expect(page.getByText(CLUE)).toBeVisible()

  await page.getByRole('button', { name: 'Get hint (1 remaining)' }).click()
  await expect(page.getByText('letter 3 is L')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get hint (0 remaining)' })).toBeDisabled()

  // The S found by the guess is never spent on a hint.
  expect(seen.hintRequests.map(r => r.revealedPositions.sort())).toEqual([[0], [0], [0, 1]])

  await page.reload()
  await expect(page.getByText(CLUE)).toBeVisible()
  await expect(page.getByText('letter 3 is L')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get hint (0 remaining)' })).toBeDisabled()
})

test('an unavailable hint is not counted and can be asked for again', async ({ page }) => {
  await pinDailyWord(page)
  let failNext = true
  await page.route('**/api/hope-daily/hint', async route => {
    if (!failNext) return route.fallback()
    failNext = false
    return route.fulfill({ status: 500, json: { error: 'Failed to generate hint' } })
  })
  await openGame(page)

  await page.getByRole('button', { name: 'Get hint (3 remaining)' }).click()
  await expect(page.getByText('No hint just now. Try again in a moment.')).toBeVisible()

  await page.getByRole('button', { name: 'Get hint (3 remaining)' }).click()
  await expect(page.getByText(CLUE)).toBeVisible()
})

test('reloading mid-game keeps the guesses, and Start Over clears them', async ({ page }) => {
  await pinDailyWord(page)
  await openGame(page)

  await typeGuess(page, 'TRAIN')
  await expect(row(page, 0).getByRole('gridcell').first()).toHaveAttribute('aria-label', 'T - absent')
  await typeGuess(page, 'HOUSE')
  await expect(row(page, 1).getByRole('gridcell').first()).toHaveAttribute('aria-label', 'H - absent')

  await page.reload()
  await expect(row(page, 0).getByRole('gridcell')).toHaveText(['T', 'R', 'A', 'I', 'N'])
  await expect(row(page, 1).getByRole('gridcell')).toHaveText(['H', 'O', 'U', 'S', 'E'])
  await expect(page.getByRole('button', { name: 'R', exact: true })).toHaveClass(/f59e0b/)

  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(page.getByRole('gridcell', { name: 'empty' })).toHaveCount(30)
  await page.reload()
  await expect(page.getByRole('gridcell', { name: 'empty' })).toHaveCount(30)
})

test('a saved game from an earlier day is set aside for the new word', async ({ page }) => {
  await pinDailyWord(page)
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem('hope-daily-state', JSON.stringify({
      date: '2001-01-01',
      guesses: [[{ letter: 'O', state: 'absent' }, { letter: 'L', state: 'absent' }, { letter: 'D', state: 'absent' }, { letter: 'E', state: 'absent' }, { letter: 'R', state: 'absent' }]],
      gameState: 'lost',
      revealedData: { word: 'OLDER', fact: 'Old fact', category: 'Peace' },
    }))
  })
  await openGame(page)

  await expect(page.getByRole('gridcell', { name: 'empty' })).toHaveCount(30)
  await expect(page.getByRole('button', { name: 'Q', exact: true })).toBeEnabled()
  await expect(page.getByText('Old fact')).toHaveCount(0)
})

test('when the puzzle cannot load, a calm retry brings it back', async ({ page }) => {
  await pinDailyWord(page)
  let failing = true
  await page.route('**/api/hope-daily', async route => {
    if (route.request().method() !== 'GET' || !failing) return route.fallback()
    return route.fulfill({ status: 500, body: '' })
  })
  await page.goto('/games/the-silver-lining')

  await expect(page.getByText("Today's word is taking a moment to arrive.")).toBeVisible()
  failing = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: 'Q', exact: true })).toBeVisible()
})

test('plays today\'s real word against the real routes and a returning player sees the finished game', async ({ page }) => {
  await page.route('**/api/hope-daily/commentary', route => route.fulfill({ json: { commentary: 'Lovely.' } }))
  const today = getWordOfDay()

  await openGame(page)
  await expect(page.getByText("Today's theme:")).toContainText(`${today.category} · ${today.word.length} letters`)

  await page.getByRole('button', { name: 'Get hint (3 remaining)' }).click()
  await expect(page.getByText(today.clue)).toBeVisible()

  await typeGuess(page, today.word)
  await expect(factCard(page)).toContainText(today.fact)

  await page.reload()
  await expect(factCard(page)).toContainText(today.fact)
  await expect(page.getByText('Come back tomorrow for a new word!')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Q', exact: true })).toBeDisabled()
})
