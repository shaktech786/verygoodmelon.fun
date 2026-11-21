import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * The Alchemist (Idea Lab): pick two concepts and discover what they make together.
 * Seven golds hide behind riddles that grow plainer after a few tries; finding all seven
 * ends the Work with a letter written from the order they were found.
 * Discoveries, remembered pairs and riddle progress live in localStorage.
 *
 * Combinations are answered from a fixed table so runs never reach the live service.
 * Some tests use the real route for curated pairs, which needs no outside call.
 */

const TABLE: Record<string, { name: string; emoji: string; description: string }> = {
  'fear+love': { name: 'Devotion', emoji: '🕯️', description: 'Loving even while afraid to lose.' },
  'devotion+time': { name: 'Loyalty', emoji: '🤝', description: 'Devotion that keeps showing up.' },
  'death+time': { name: 'Legacy', emoji: '📜', description: 'What remains after we are gone.' },
  'chaos+order': { name: 'Balance', emoji: '⚖️', description: 'Structure and spontaneity in step.' },
  // The service answering with a name the player already has.
  'beauty+nature': { name: 'Love', emoji: '💕', description: 'Beauty in nature opens the heart.' },
  'fear+hope': { name: 'Courage', emoji: '🦁', description: 'Acting despite fear because something matters more.' },
  'self+wisdom': { name: 'Humility', emoji: '🌾', description: 'Knowing enough to know how much you do not.' },
  'courage+wisdom': { name: 'Virtue', emoji: '🏛️', description: 'Excellence of character, practised until it is natural.' },
}

const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')
const FIRST_WORK = ['Healing', 'Acceptance', 'Courage', 'Compassion', 'Meaning', 'Intimacy', 'Virtue']
const SECOND_WORK = ['Gratitude', 'Resilience', 'Forgiveness', 'Serenity', 'Belonging', 'Humility', 'Joy']

const pairKey = (a: string, b: string) => [a.toLowerCase(), b.toLowerCase()].sort().join('+')

/** Answers from TABLE, makes up a plain new idea for any other pair, or refuses pairs listed in `refuse`. */
async function mockCombine(page: Page, refuse: string[] = []) {
  const calls: string[] = []
  await page.route('**/api/idea-lab/combine', async (route: Route) => {
    const { concept1, concept2 } = route.request().postDataJSON()
    const key = pairKey(concept1, concept2)
    calls.push(key)
    if (refuse.includes(key)) return route.fulfill({ status: 503, json: { error: 'Combination unavailable' } })
    const answer = TABLE[key] ?? { name: `Idea ${calls.length}`, emoji: '🔮', description: 'Something in between.' }
    return route.fulfill({ json: answer })
  })
  return calls
}

async function quietBackground(page: Page) {
  await page.route(/\/api\/(game-events|site-visits)/, route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
}

/** Seeds a save before the first load only, so reloads see what the game wrote. */
async function seed(page: Page, values: Record<string, unknown>) {
  await page.addInitScript((entries) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    }
  }, values)
}

const asDiscoveries = (names: string[]) =>
  names.map(name => ({ id: name.toLowerCase(), name, emoji: '✨', description: `${name}, found earlier.` }))

const concept = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const announcement = (page: Page) => page.getByRole('status')
const counter = (page: Page) => page.getByText(/^\d+ discover(y|ies)$/)
const shelf = (page: Page) => page.getByRole('region', { name: /golds|is complete/ })
const letter = (page: Page) => page.getByRole('region', { name: /^The (Great|Second) Work$/ })

async function combine(page: Page, a: string, b: string) {
  await concept(page, a).click()
  await concept(page, b).click()
}

async function startLab(page: Page) {
  await page.goto('/games/idea-lab')
  await page.getByRole('button', { name: 'Begin Exploring' }).click()
  await expect(concept(page, 'Love')).toBeVisible()
}

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(AXE_SOURCE)
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> }
    }).axe
    const result = await axe.run({ include: [['main']], exclude: [['nextjs-portal']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
    return result.violations.flatMap(v => v.nodes.map(n => `${v.id}: ${n.target.join(' ')}`))
  })
}

test.beforeEach(async ({ page }) => {
  await quietBackground(page)
})

test('a first-time player discovers, goes deeper, and keeps it all after a reload', async ({ page }) => {
  const calls = await mockCombine(page)
  await page.goto('/games/idea-lab')
  await expect(page.getByText('each hidden behind a riddle', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Begin Exploring' }).click()

  await expect(counter(page)).toHaveText('0 discoveries')

  await combine(page, 'Love', 'Fear')
  await expect(announcement(page)).toHaveText('New discovery: Devotion. Loving even while afraid to lose.')
  await expect(concept(page, 'Devotion')).toBeVisible()
  await expect(counter(page)).toHaveText('1 discovery')

  // A discovery is an ingredient too.
  await combine(page, 'Devotion', 'Time')
  await expect(announcement(page)).toContainText('New discovery: Loyalty.')
  await combine(page, 'Time', 'Death')
  await expect(announcement(page)).toContainText('New discovery: Legacy.')
  await expect(counter(page)).toHaveText('3 discoveries')
  await expect(page.getByText('19 total')).toBeVisible()

  await page.reload()
  // A returning player goes straight to the lab.
  await expect(concept(page, 'Loyalty')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Begin Exploring' })).toHaveCount(0)
  await expect(counter(page)).toHaveText('3 discoveries')

  // A remembered pair answers instantly, in either order, without asking again.
  await combine(page, 'Fear', 'Love')
  await expect(announcement(page)).toHaveText('Devotion, already in your concepts. Loving even while afraid to lose.')
  expect(calls).toEqual(['fear+love', 'devotion+time', 'death+time'])
  await expect(counter(page)).toHaveText('3 discoveries')
})

test('Begin Exploring hands keyboard focus to the first concept', async ({ page }) => {
  await mockCombine(page)
  await page.goto('/games/idea-lab')
  await page.getByRole('button', { name: 'Begin Exploring' }).focus()
  await page.keyboard.press('Enter')
  await expect(concept(page, 'Love')).toBeFocused()
})

test('choosing the same concept twice puts it back instead of combining it with itself', async ({ page }) => {
  const calls = await mockCombine(page)
  await startLab(page)

  await concept(page, 'Hope').click()
  await expect(concept(page, 'Hope')).toHaveAttribute('aria-pressed', 'true')
  await concept(page, 'Hope').click()
  await expect(concept(page, 'Hope')).toHaveAttribute('aria-pressed', 'false')
  expect(calls).toEqual([])
})

test('after a result, the next pick starts a fresh pair and Clear empties the bench', async ({ page }) => {
  await mockCombine(page)
  await startLab(page)

  await combine(page, 'Chaos', 'Order')
  await expect(announcement(page)).toContainText('New discovery: Balance.')

  await concept(page, 'Love').click()
  await expect(concept(page, 'Love')).toHaveAttribute('aria-pressed', 'true')
  await expect(concept(page, 'Chaos')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Structure and spontaneity in step.')).toHaveCount(0)

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(concept(page, 'Love')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Choose two concepts to combine them.').filter({ visible: true })).toBeVisible()
})

test('when a pair cannot be combined right now, nothing is saved and it can be tried again', async ({ page }) => {
  const calls = await mockCombine(page, ['devotion+justice'])
  await startLab(page)
  await combine(page, 'Love', 'Fear')
  await expect(counter(page)).toHaveText('1 discovery')

  await combine(page, 'Justice', 'Devotion')
  await expect(announcement(page)).toHaveText(/^These two are keeping their secret for now\./)
  await expect(counter(page)).toHaveText('1 discovery')
  await expect(concept(page, 'Mystery')).toHaveCount(0)

  await combine(page, 'Justice', 'Devotion')
  await expect(announcement(page)).toHaveText(/^These two are keeping their secret for now\./)
  expect(calls).toEqual(['fear+love', 'devotion+justice', 'devotion+justice'])
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ideaLab_discoveries') ?? '[]').length)
  expect(stored).toBe(1)
})

test('a result that matches a concept the player already has is not counted twice', async ({ page }) => {
  const calls = await mockCombine(page)
  await startLab(page)

  await combine(page, 'Beauty', 'Nature')
  await expect(announcement(page)).toContainText('Love, already in your concepts.')
  await expect(counter(page)).toHaveText('0 discoveries')
  await expect(concept(page, 'Love')).toHaveCount(1)

  await combine(page, 'Nature', 'Beauty')
  await expect(announcement(page)).toContainText('Love, already in your concepts.')
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
  await expect(announcement(page)).toHaveText('Combining')
  await expect(concept(page, 'Love')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Reset all discoveries' })).toBeDisabled()

  release()
  await expect(announcement(page)).toContainText('New discovery: Balance.')
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
  expect(await page.evaluate(() => localStorage.getItem('ideaLab_progress'))).toBeNull()

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
  await page.keyboard.press('ArrowRight')
  await expect(concept(page, 'Order')).toBeFocused()
  await page.keyboard.press('Space')

  await expect(announcement(page)).toContainText('New discovery: Balance.')
  // Regression: locking the chips while combining used to drop focus to the page
  await expect(concept(page, 'Order')).toBeFocused()
})

test('the concepts are a single Tab stop moved through with the arrow keys, with a way past them to the riddles', async ({ page }) => {
  await mockCombine(page)
  await page.goto('/games/idea-lab')
  await page.getByRole('button', { name: 'Begin Exploring' }).focus()
  await page.keyboard.press('Enter')
  const toolbar = page.getByRole('toolbar', { name: 'Your Concepts' })
  await expect(concept(page, 'Love')).toBeFocused()
  await expect(toolbar.locator('button[tabindex="0"]')).toHaveCount(1)

  await page.keyboard.press('ArrowRight')
  await expect(concept(page, 'Fear')).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(concept(page, 'Love')).toBeFocused()
  await page.keyboard.press('End')
  await expect(concept(page, 'Other')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(concept(page, 'Love')).toBeFocused()

  await page.keyboard.press('ArrowDown')
  const below = page.locator(':focus')
  await expect(below).not.toHaveAccessibleName('Love')
  const [loveBox, belowBox] = [await concept(page, 'Love').boundingBox(), await below.boundingBox()]
  expect(belowBox?.y ?? 0).toBeGreaterThan((loveBox?.y ?? 0) + (loveBox?.height ?? 0) - 1)
  await page.keyboard.press('ArrowUp')
  await expect(concept(page, 'Love')).toBeFocused()

  // One Tab leaves the concepts; Shift+Tab comes back to the same one.
  await page.keyboard.press('End')
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="toolbar"]')))).toBe(false)
  await page.keyboard.press('Shift+Tab')
  await expect(concept(page, 'Other')).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  const skip = page.getByRole('link', { name: 'Skip to the riddles' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'The seven golds' })).toBeFocused()
})

test('a finished Work is a few Tabs from the concepts, not one per concept', async ({ page }) => {
  await mockCombine(page)
  const found = ['Courage', 'Grief', 'Healing', 'Anxiety', 'Patience', 'Acceptance', 'Empathy', 'Understanding',
    'Compassion', 'Mortality', 'Legacy', 'Meaning', 'Vulnerability', 'Trust', 'Intimacy', 'Wisdom', 'Virtue']
  await seed(page, { ideaLab_discoveries: asDiscoveries(found) })
  await page.goto('/games/idea-lab')
  await concept(page, 'Love').focus()

  const begin = page.getByRole('button', { name: 'Begin the Second Work' })
  let presses = 0
  while (presses < 10 && !(await begin.evaluate(el => el === document.activeElement))) {
    await page.keyboard.press('Tab')
    presses++
  }
  await expect(begin).toBeFocused()
  expect(presses).toBeLessThanOrEqual(4)
})

test('damaged saved data does not stop the lab from opening', async ({ page }) => {
  await mockCombine(page)
  await seed(page, { ideaLab_discoveries: '{not json', ideaLab_combinations: '"also wrong"', ideaLab_progress: '[1,2]' })
  await page.goto('/games/idea-lab')
  await page.getByRole('button', { name: 'Begin Exploring' }).click()

  await combine(page, 'Love', 'Fear')
  await expect(announcement(page)).toContainText('New discovery: Devotion.')
  await expect(counter(page)).toHaveText('1 discovery')
  await expect(shelf(page)).toContainText('0 of 7 found')
})

test('discoveries saved before the riddles existed keep loading, golds included', async ({ page }) => {
  await mockCombine(page)
  await seed(page, {
    ideaLab_discoveries: [{ id: 'courage', name: 'Courage', emoji: '🦁', description: 'Acting despite fear.' }, { id: 'grief', name: 'Grief', emoji: '💔' }],
    ideaLab_combinations: { 'fear+hope': 'courage', 'death+love': 'grief' },
  })
  await page.goto('/games/idea-lab')
  await expect(concept(page, 'Grief')).toBeVisible()
  await expect(shelf(page)).toContainText('1 of 7 found')
  await expect(shelf(page)).toContainText('Acting despite fear.')
})

test('every pair of starting ideas is answered by the real route without any outside call', async ({ page }) => {
  await startLab(page)

  // "love+fear" is written in reading order in the curated table.
  await combine(page, 'Love', 'Fear')
  await expect(announcement(page)).toContainText('New discovery: Jealousy.')
  await combine(page, 'Order', 'Fear')
  await expect(announcement(page)).toHaveText('New discovery: Perfectionism. Fear, dressed up as high standards.')
  await combine(page, 'Other', 'Time')
  await expect(announcement(page)).toContainText('New discovery: Friendship.')
})

test('a gold is celebrated with the riddle it answers, and the shelf keeps the rest as riddles', async ({ page }) => {
  await mockCombine(page)
  await startLab(page)

  const golds = shelf(page)
  await expect(golds).toContainText('0 of 7 found')
  await expect(golds).toContainText('A trembling that keeps walking toward the morning.')
  await expect(golds.getByText('Not yet found. Riddle:', { exact: false })).toHaveCount(7)
  // The riddles point at the ideas without naming them.
  await expect(golds).not.toContainText('Fear, carried by hope.')
  await expect(golds.getByText('Plainer:', { exact: true })).toHaveCount(0)

  await combine(page, 'Hope', 'Fear')
  await expect(announcement(page)).toHaveText('Gold: Courage, one of the seven. 1 of 7 found. Acting despite fear because something matters more.')
  await expect(page.getByText('It answers:', { exact: false }).filter({ visible: true })).toBeVisible()
  await expect(golds).toContainText('1 of 7 found')
  await expect(golds).toContainText('Acting despite fear because something matters more.')
  await expect(golds.getByText('Not yet found. Riddle:', { exact: false })).toHaveCount(6)
})

test('riddles grow plainer one at a time, oldest first, and never take a clue back', async ({ page }) => {
  await mockCombine(page)
  await startLab(page)
  const golds = shelf(page)
  const plainer = golds.getByText('Plainer:', { exact: true })
  const ingredients = golds.getByText('Ingredients:', { exact: true })
  const bases = ['Love', 'Time', 'Death', 'Knowledge', 'Power', 'Freedom', 'Truth', 'Beauty', 'Justice', 'Chaos', 'Order', 'Nature', 'Self']

  for (let i = 0; i < 4; i++) await combine(page, bases[i], bases[i + 1])
  await expect(counter(page)).toHaveText('4 discoveries')
  await expect(plainer).toHaveCount(0)

  await combine(page, bases[4], bases[5])
  await expect(announcement(page)).toContainText('A riddle has grown plainer: Let love meet its ending, then let the dawn sit beside it.')
  await expect(plainer).toHaveCount(1)
  await expect(golds.getByRole('listitem').filter({ hasText: 'New clue' })).toContainText('A broken heart', { ignoreCase: true })

  for (let i = 5; i < 10; i++) await combine(page, bases[i], bases[i + 1])
  await expect(announcement(page)).toContainText('A riddle now names its ingredients: Grief (Love and Death) with Hope.')
  await expect(ingredients).toHaveCount(1)
  await expect(plainer).toHaveCount(1)

  // Finding a gold restarts the count; the next clue goes to the next riddle still hidden.
  await combine(page, 'Hope', 'Fear')
  await expect(announcement(page)).toContainText('Gold: Courage')
  for (const [a, b] of [['Order', 'Nature'], ['Nature', 'Self'], ['Self', 'Love'], ['Death', 'Truth']]) await combine(page, a, b)
  await expect(plainer).toHaveCount(1)
  await combine(page, 'Justice', 'Love')
  await expect(announcement(page)).toContainText('A riddle has grown plainer: Stretch a fear across the hours')
  await expect(plainer).toHaveCount(2)
  await expect(ingredients).toHaveCount(1)

  await page.reload()
  await expect(shelf(page).getByText('Plainer:', { exact: true })).toHaveCount(2)
  await expect(shelf(page).getByText('Ingredients:', { exact: true })).toHaveCount(1)
})

test('a save from when one clue level covered every riddle keeps the clues it had shown', async ({ page }) => {
  await mockCombine(page)
  await seed(page, {
    ideaLab_discoveries: asDiscoveries(['Courage']),
    ideaLab_progress: { work: 0, triesSinceGold: 9, hintLevel: 1 },
  })
  await page.goto('/games/idea-lab')
  await expect(shelf(page).getByText('Plainer:', { exact: true })).toHaveCount(6)
  await expect(shelf(page).getByText('Ingredients:', { exact: true })).toHaveCount(0)

  await combine(page, 'Love', 'Fear')
  await expect(announcement(page)).toHaveText(/^New discovery: Devotion\./)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ideaLab_progress') ?? 'null'))
  expect(saved).toEqual({ work: 0, triesSinceClue: 1, hints: [1, 1, 1, 1, 1, 1, 1] })
})

test('the seventh gold ends the Work with a letter that takes focus, then the Second Work begins', async ({ page }) => {
  await mockCombine(page)
  const found = ['Jealousy', 'Courage', 'Grief', 'Healing', 'Anxiety', 'Patience', 'Acceptance', 'Empathy', 'Understanding',
    'Compassion', 'Mortality', 'Legacy', 'Meaning', 'Vulnerability', 'Trust', 'Intimacy', 'Wisdom']
  await seed(page, { ideaLab_discoveries: asDiscoveries(found) })
  await page.goto('/games/idea-lab')
  await expect(shelf(page)).toContainText('6 of 7 found')

  await combine(page, 'Wisdom', 'Courage')
  await expect(announcement(page)).toContainText('The Great Work is complete. A letter has been written for you.')
  const scene = letter(page)
  await expect(scene.getByRole('heading', { name: 'The Great Work' })).toBeFocused()
  const lines = scene.getByRole('listitem')
  await expect(lines).toHaveCount(7)
  await expect(lines.first()).toContainText('First, you found Courage, which was only ever fear with somewhere to go.')
  await expect(lines.last()).toContainText('And last, you found Virtue')
  await expect(scene).toContainText('The very first thing you made here was Jealousy')
  await expect(scene).toContainText('It took 18 discoveries.')
  await expect(shelf(page).getByRole('heading', { name: 'The Great Work is complete' })).toBeVisible()

  await scene.getByRole('button', { name: 'Keep wandering' }).click()
  await expect(scene).toHaveCount(0)
  // Back to the concept the player last picked.
  await expect(concept(page, 'Courage')).toBeFocused()

  await shelf(page).getByRole('button', { name: 'Read the letter from the Great Work' }).click()
  await expect(letter(page).getByRole('heading', { name: 'The Great Work' })).toBeFocused()
  await letter(page).getByRole('button', { name: 'Begin the Second Work' }).click()

  await expect(announcement(page)).toHaveText('The Second Work begins. Seven new riddles are on the shelf.')
  await expect(page.getByRole('heading', { name: 'The Second Work: seven new golds' })).toBeFocused()
  await expect(shelf(page)).toContainText('0 of 7 found')
  await expect(shelf(page)).toContainText('The owl, looking in a mirror.')

  // Golds of the second Work are made from what the player already knows.
  await combine(page, 'Wisdom', 'Self')
  await expect(announcement(page)).toContainText('Gold: Humility, one of the seven. 1 of 7 found.')

  await page.reload()
  await expect(page.getByRole('heading', { name: 'The Second Work: seven new golds' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Read the letter from the Great Work' })).toBeVisible()
})

test('every gold of both Works can be reached from the starting ideas through the real curated pairs', async ({ page }) => {
  test.setTimeout(90_000)
  await startLab(page)
  const firstWork: Array<[string, string]> = [
    ['Hope', 'Fear'], ['Love', 'Death'], ['Grief', 'Hope'], ['Fear', 'Time'], ['Time', 'Hope'],
    ['Anxiety', 'Patience'], ['Love', 'Other'], ['Knowledge', 'Other'], ['Empathy', 'Understanding'],
    ['Fear', 'Death'], ['Time', 'Death'], ['Mortality', 'Legacy'], ['Love', 'Truth'], ['Love', 'Freedom'],
    ['Vulnerability', 'Trust'], ['Time', 'Knowledge'], ['Wisdom', 'Courage'],
  ]
  for (const [a, b] of firstWork) {
    await combine(page, a, b)
    await expect(announcement(page)).toContainText(/New discovery|Gold:/)
  }
  await expect(letter(page).getByRole('heading', { name: 'The Great Work' })).toBeFocused()
  await letter(page).getByRole('button', { name: 'Begin the Second Work' }).click()

  const secondWork: Array<[string, string]> = [
    ['Death', 'Beauty'], ['Impermanence', 'Love'], ['Courage', 'Time'], ['Empathy', 'Justice'], ['Chaos', 'Order'],
    ['Balance', 'Patience'], ['Self', 'Other'], ['Relationship', 'Trust'], ['Wisdom', 'Self'], ['Nature', 'Beauty'],
    ['Wonder', 'Freedom'],
  ]
  for (const [a, b] of secondWork) {
    await combine(page, a, b)
    await expect(announcement(page)).toContainText(/New discovery|Gold:/)
  }
  await expect(letter(page).getByRole('heading', { name: 'The Second Work' })).toBeFocused()
  for (const name of [...FIRST_WORK, ...SECOND_WORK]) await expect(concept(page, name)).toBeVisible()
})

test('has no accessibility violations in light or dark, including the letter', async ({ page }) => {
  await mockCombine(page)
  const found = ['Courage', 'Grief', 'Healing', 'Anxiety', 'Patience', 'Acceptance', 'Empathy', 'Understanding',
    'Compassion', 'Mortality', 'Legacy', 'Meaning', 'Vulnerability', 'Trust', 'Intimacy', 'Wisdom']
  await seed(page, { ideaLab_discoveries: asDiscoveries(found), ideaLab_progress: { work: 0, triesSinceGold: 12, hintLevel: 2 } })
  await page.goto('/games/idea-lab')
  await combine(page, 'Love', 'Fear')
  await expect(announcement(page)).toContainText('New discovery')
  expect(await axeViolations(page)).toEqual([])

  await combine(page, 'Wisdom', 'Courage')
  await expect(letter(page)).toBeVisible()
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await page.waitForTimeout(200)
  expect(await axeViolations(page)).toEqual([])
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('the bench keeps the current riddle in view, and a new clue shows there', async ({ page }) => {
    await mockCombine(page)
    await seed(page, {
      ideaLab_discoveries: asDiscoveries(['Jealousy', 'Grief', 'Devotion', 'Vulnerability', 'Trust', 'Empathy', 'Mortality',
        'Anxiety', 'Vertigo', 'Denial', 'Legacy', 'Wisdom', 'Patience', 'Entropy', 'History', 'Renewal', 'Spring']),
      ideaLab_progress: { work: 0, triesSinceClue: 4, hints: [0, 0, 0, 0, 0, 0, 0] },
    })
    await page.goto('/games/idea-lab')
    const bench = page.getByTestId('phone-bench')
    await expect(bench).toContainText('What a broken heart grows when it keeps a window facing the sunrise.')

    const spring = concept(page, 'Spring')
    const top = await spring.evaluate(el => el.getBoundingClientRect().top + window.scrollY)
    await page.evaluate(y => window.scrollTo({ top: y - 600, behavior: 'instant' }), top)
    await concept(page, 'Renewal').tap()
    await spring.tap()
    await expect(announcement(page)).toContainText('A riddle has grown plainer')
    await expect(bench).toBeInViewport()
    await expect(bench).toContainText('Plainer: Let love meet its ending, then let the dawn sit beside it.')
  })

  test('the lab fits without sideways scrolling and concepts are easy to tap', async ({ page }) => {
    await mockCombine(page)
    await startLab(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    const box = await concept(page, 'Love').boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })

  test('the result shows where the player is tapping, and the tapped chip does not move', async ({ page }) => {
    await mockCombine(page)
    await seed(page, { ideaLab_discoveries: asDiscoveries(['Jealousy', 'Grief', 'Devotion', 'Vulnerability', 'Trust', 'Empathy',
      'Mortality', 'Anxiety', 'Vertigo', 'Denial', 'Legacy', 'Wisdom', 'Patience', 'Entropy', 'History', 'Renewal', 'Spring']) })
    await page.goto('/games/idea-lab')
    const spring = concept(page, 'Spring')
    const top = await spring.evaluate(el => el.getBoundingClientRect().top + window.scrollY)
    await page.evaluate(y => window.scrollTo({ top: y - 600, behavior: 'instant' }), top)
    const before = await spring.boundingBox()

    await concept(page, 'Renewal').tap()
    await spring.tap()
    await expect(announcement(page)).toContainText('New discovery: Idea 1.')

    const bench = page.getByTestId('phone-bench')
    await expect(bench).toBeInViewport()
    await expect(bench).toContainText('Idea 1')
    await expect(bench).toContainText('Something in between.')
    expect(await spring.boundingBox()).toEqual(before)
    const benchBox = await bench.boundingBox()
    expect((benchBox?.y ?? 0) + (benchBox?.height ?? 0)).toBeLessThanOrEqual(before?.y ?? 0)
  })
})
