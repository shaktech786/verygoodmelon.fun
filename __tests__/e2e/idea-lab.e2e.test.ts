import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * The Alchemist (Idea Lab): pick two concepts and discover what they make together.
 * Discoveries and remembered pairs live in localStorage.
 *
 * Combinations are answered from a fixed table so runs never reach the live service.
 * One test uses the real route for a curated pair, which needs no outside call.
 */

const TABLE: Record<string, { name: string; emoji: string; description: string }> = {
  'fear+love': { name: 'Devotion', emoji: '🕯️', description: 'Loving even while afraid to lose.' },
  'devotion+time': { name: 'Loyalty', emoji: '🤝', description: 'Devotion that keeps showing up.' },
  'death+time': { name: 'Legacy', emoji: '📜', description: 'What remains after we are gone.' },
  'chaos+order': { name: 'Balance', emoji: '⚖️', description: 'Structure and spontaneity in step.' },
  // The service answering with a name the player already has.
  'beauty+nature': { name: 'Love', emoji: '💕', description: 'Beauty in nature opens the heart.' },
}

const pairKey = (a: string, b: string) => [a.toLowerCase(), b.toLowerCase()].sort().join('+')

async function mockCombine(page: Page) {
  const calls: string[] = []
  await page.route('**/api/idea-lab/combine', async (route: Route) => {
    const { concept1, concept2 } = route.request().postDataJSON()
    const key = pairKey(concept1, concept2)
    calls.push(key)
    const answer = TABLE[key]
    return answer
      ? route.fulfill({ json: answer })
      : route.fulfill({ status: 503, json: { error: 'Combination unavailable' } })
  })
  return calls
}

async function quietBackground(page: Page) {
  await page.route(/\/api\/(game-events|site-visits)/, route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
}

const concept = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const result = (page: Page) => page.getByRole('status').filter({ hasText: '“' })
const counter = (page: Page) => page.getByText(/^\d+ discover(y|ies)$/)

async function combine(page: Page, a: string, b: string) {
  await concept(page, a).click()
  await concept(page, b).click()
}

async function startLab(page: Page) {
  await page.goto('/games/idea-lab')
  await page.getByRole('button', { name: 'Begin Exploring' }).click()
  await expect(concept(page, 'Love')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await quietBackground(page)
})

test('a first-time player discovers, goes deeper, and keeps it all after a reload', async ({ page }) => {
  const calls = await mockCombine(page)
  await page.goto('/games/idea-lab')
  await expect(page.getByText('Select two concepts to combine them.')).toBeVisible()
  await page.getByRole('button', { name: 'Begin Exploring' }).click()

  await expect(page.getByText('Choose two concepts below to combine them')).toBeVisible()
  await expect(counter(page)).toHaveText('0 discoveries')

  await combine(page, 'Love', 'Fear')
  await expect(result(page)).toContainText('New discovery: Devotion.')
  await expect(result(page)).toContainText('Loving even while afraid to lose.')
  await expect(concept(page, 'Devotion')).toBeVisible()
  await expect(counter(page)).toHaveText('1 discovery')

  // A discovery is an ingredient too.
  await combine(page, 'Devotion', 'Time')
  await expect(result(page)).toContainText('New discovery: Loyalty.')
  await combine(page, 'Time', 'Death')
  await expect(result(page)).toContainText('New discovery: Legacy.')
  await expect(counter(page)).toHaveText('3 discoveries')
  await expect(page.getByText('19 total')).toBeVisible()

  await page.reload()
  // A returning player goes straight to the lab.
  await expect(concept(page, 'Loyalty')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Begin Exploring' })).toHaveCount(0)
  await expect(counter(page)).toHaveText('3 discoveries')

  // A remembered pair answers instantly, in either order, without asking again.
  await combine(page, 'Fear', 'Love')
  await expect(result(page)).toContainText('Devotion, already in your concepts.')
  await expect(result(page)).toContainText('Loving even while afraid to lose.')
  await expect(page.getByText('Already yours')).toBeVisible()
  expect(calls).toEqual(['fear+love', 'devotion+time', 'death+time'])
  await expect(counter(page)).toHaveText('3 discoveries')
})

test('choosing the same concept twice puts it back instead of combining it with itself', async ({ page }) => {
  const calls = await mockCombine(page)
  await startLab(page)

  await concept(page, 'Hope').click()
  await expect(concept(page, 'Hope')).toHaveAttribute('aria-pressed', 'true')
  await concept(page, 'Hope').click()
  await expect(concept(page, 'Hope')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Choose two concepts below to combine them')).toBeVisible()
  expect(calls).toEqual([])
})

test('after a result, the next pick starts a fresh pair and Clear empties the bench', async ({ page }) => {
  await mockCombine(page)
  await startLab(page)

  await combine(page, 'Chaos', 'Order')
  await expect(result(page)).toContainText('New discovery: Balance.')

  await concept(page, 'Love').click()
  await expect(concept(page, 'Love')).toHaveAttribute('aria-pressed', 'true')
  await expect(concept(page, 'Chaos')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Structure and spontaneity in step.')).toHaveCount(0)

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(concept(page, 'Love')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Choose two concepts below to combine them')).toBeVisible()
})

test('when a pair cannot be combined right now, nothing is saved and it can be tried again', async ({ page }) => {
  const calls = await mockCombine(page)
  await startLab(page)

  await combine(page, 'Justice', 'Self')
  await expect(result(page)).toContainText('These two are keeping their secret for now.')
  await expect(counter(page)).toHaveText('0 discoveries')
  await expect(concept(page, 'Mystery')).toHaveCount(0)

  await combine(page, 'Justice', 'Self')
  await expect(result(page)).toContainText('These two are keeping their secret for now.')
  expect(calls).toEqual(['justice+self', 'justice+self'])

  const stored = await page.evaluate(() => localStorage.getItem('ideaLab_discoveries'))
  expect(stored).toBeNull()
})

test('a result that matches a concept the player already has is not counted twice', async ({ page }) => {
  const calls = await mockCombine(page)
  await startLab(page)

  await combine(page, 'Beauty', 'Nature')
  await expect(result(page)).toContainText('Love, already in your concepts.')
  await expect(counter(page)).toHaveText('0 discoveries')
  await expect(concept(page, 'Love')).toHaveCount(1)

  await combine(page, 'Nature', 'Beauty')
  await expect(result(page)).toContainText('Love, already in your concepts.')
  expect(calls).toEqual(['beauty+nature'])
})

test('concepts stay locked while a pair is being combined', async ({ page }) => {
  let release: () => void = () => {}
  await page.route('**/api/idea-lab/combine', async route => {
    await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ json: TABLE['chaos+order'] })
  })
  await startLab(page)

  await combine(page, 'Chaos', 'Order')
  await expect(page.getByText('Combining...')).toBeVisible()
  await expect(concept(page, 'Love')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Reset all discoveries' })).toBeDisabled()

  release()
  await expect(result(page)).toContainText('New discovery: Balance.')
  await expect(concept(page, 'Love')).toBeEnabled()
})

test('reset asks first, can be cancelled from the keyboard, and clears everything for good', async ({ page }) => {
  await mockCombine(page)
  await startLab(page)
  await combine(page, 'Love', 'Fear')
  await expect(concept(page, 'Devotion')).toBeVisible()

  const resetButton = page.getByRole('button', { name: 'Reset all discoveries' })
  await resetButton.click()
  const dialog = page.getByRole('dialog', { name: 'Reset all discoveries?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()

  // Focus stays inside the dialog.
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Reset' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(resetButton).toBeFocused()
  await expect(concept(page, 'Devotion')).toBeVisible()

  await resetButton.click()
  await dialog.getByRole('button', { name: 'Reset' }).click()
  await expect(concept(page, 'Devotion')).toHaveCount(0)
  await expect(counter(page)).toHaveText('0 discoveries')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Begin Exploring' })).toBeVisible()
})

test('can be played with the keyboard alone', async ({ page }) => {
  await mockCombine(page)
  await page.goto('/games/idea-lab')
  await page.getByRole('button', { name: 'Begin Exploring' }).focus()
  await page.keyboard.press('Enter')

  await concept(page, 'Chaos').focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(concept(page, 'Order')).toBeFocused()
  await page.keyboard.press('Space')

  await expect(result(page)).toContainText('New discovery: Balance.')
})

test('damaged saved data does not stop the lab from opening', async ({ page }) => {
  await mockCombine(page)
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem('ideaLab_discoveries', '{not json')
    localStorage.setItem('ideaLab_combinations', '"also wrong"')
  })
  await page.goto('/games/idea-lab')
  await page.getByRole('button', { name: 'Begin Exploring' }).click()

  await combine(page, 'Love', 'Fear')
  await expect(result(page)).toContainText('New discovery: Devotion.')
  await expect(counter(page)).toHaveText('1 discovery')
})

test('curated pairs come back from the real route whichever order they are written in', async ({ page }) => {
  await startLab(page)

  // "love+fear" is written in reading order in the curated table.
  await combine(page, 'Love', 'Fear')
  await expect(result(page)).toContainText('New discovery: Jealousy.')

  await combine(page, 'Order', 'Chaos')
  await expect(result(page)).toContainText('New discovery: Balance.')
})
