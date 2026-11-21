import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * The Alchemist (Idea Lab): pick two concepts and discover what they make together.
 * Seven golds hide behind riddles that grow plainer after a few tries; finding all seven
 * ends the Work with a letter written from the order they were found.
 * Discoveries, remembered pairs and riddle progress live in localStorage.
 *
 * The curated pairs are answered in the page itself; any other pair is answered from a fixed
 * table here, so runs never reach the live service.
 */

const TABLE: Record<string, { name: string; emoji: string; description: string }> = {
  'jealousy+time': { name: 'Loyalty', emoji: '🤝', description: 'Devotion that keeps showing up.' },
  'chaos+jealousy': { name: 'Restlessness', emoji: '🌪️', description: 'A heart that cannot settle.' },
  // The service answering with a name the player already has.
  'jealousy+nature': { name: 'Love', emoji: '💕', description: 'Even envy grows from something tender.' },
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
const BASE_CONCEPTS = 16
// The lab shows no tally; what the player owns is the concepts row itself.
const owned = (page: Page) => page.getByRole('toolbar', { name: 'Your Concepts' }).getByRole('button')
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

  await expect(owned(page)).toHaveCount(BASE_CONCEPTS)

  await combine(page, 'Love', 'Fear')
  await expect(announcement(page)).toHaveText('New discovery: Jealousy. When love fears loss, it curdles into possession.')
  await expect(concept(page, 'Jealousy')).toBeVisible()
  await expect(owned(page)).toHaveCount(BASE_CONCEPTS + 1)

  // A discovery is an ingredient too.
  await combine(page, 'Jealousy', 'Time')
  await expect(announcement(page)).toContainText('New discovery: Loyalty.')
  await combine(page, 'Time', 'Death')
  await expect(announcement(page)).toContainText('New discovery: Legacy.')
  await expect(owned(page)).toHaveCount(BASE_CONCEPTS + 3)
  await expect(page.getByText(/\d+ (total|discover(y|ies))$/)).toHaveCount(0)

  await page.reload()
  // A returning player goes straight to the lab.
  await expect(concept(page, 'Loyalty')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Begin Exploring' })).toHaveCount(0)
  await expect(owned(page)).toHaveCount(BASE_CONCEPTS + 3)

  // A remembered pair answers instantly, in either order, without asking again.
  await combine(page, 'Fear', 'Love')
  await expect(announcement(page)).toHaveText('Jealousy, already in your concepts. When love fears loss, it curdles into possession.')
  // Only the open-ended mix needed the service; curated pairs are answered in the page
  expect(calls).toEqual(['jealousy+time'])
  await expect(owned(page)).toHaveCount(BASE_CONCEPTS + 3)
})

test('on a flaky connection the curated pairs still mix, and only open-ended pairs wait for the service', async ({ page }) => {
  let asked = 0
  await page.route('**/api/idea-lab/combine', (route) => {
    asked++
    return route.abort('internetdisconnected')
  })
  await startLab(page)

  await combine(page, 'Love', 'Fear')
  await expect(announcement(page)).toHaveText('New discovery: Jealousy. When love fears loss, it curdles into possession.')
  await combine(page, 'Order', 'Fear')
  await expect(announcement(page)).toContainText('New discovery: Perfectionism.')
  expect(asked).toBe(0)

  await combine(page, 'Jealousy', 'Time')
  await expect(announcement(page)).toHaveText(/^These two are keeping their secret for now\./)
  expect(asked).toBe(1)
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
  await expect(page.getByText('The dance between structure and spontaneity.')).toHaveCount(0)

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(concept(page, 'Love')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Choose two concepts to combine them.').filter({ visible: true })).toBeVisible()
})

test('when a pair cannot be combined right now, nothing is saved and it can be tried again', async ({ page }) => {
  const calls = await mockCombine(page, ['jealousy+justice'])
  await startLab(page)
  await combine(page, 'Love', 'Fear')
  await expect(owned(page)).toHaveCount(BASE_CONCEPTS + 1)

  await combine(page, 'Justice', 'Jealousy')
  await expect(announcement(page)).toHaveText(/^These two are keeping their secret for now\./)
  await expect(owned(page)).toHaveCount(BASE_CONCEPTS + 1)
  await expect(concept(page, 'Mystery')).toHaveCount(0)

  await combine(page, 'Justice', 'Jealousy')
  await expect(announcement(page)).toHaveText(/^These two are keeping their secret for now\./)
  expect(calls).toEqual(['jealousy+justice', 'jealousy+justice'])
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ideaLab_discoveries') ?? '[]').length)
  expect(stored).toBe(1)
})

test('a result that matches a concept the player already has is not counted twice', async ({ page }) => {
  const calls = await mockCombine(page)
  await startLab(page)

  await combine(page, 'Love', 'Fear')
  await combine(page, 'Jealousy', 'Nature')
  await expect(announcement(page)).toContainText('Love, already in your concepts.')
  await expect(owned(page)).toHaveCount(BASE_CONCEPTS + 1)
  await expect(concept(page, 'Love')).toHaveCount(1)

  await combine(page, 'Nature', 'Jealousy')
  await expect(announcement(page)).toContainText('Love, already in your concepts.')
  expect(calls).toEqual(['jealousy+nature'])
})

test('concepts stay locked while a pair is being combined', async ({ page }) => {
  let release: () => void = () => {}
  await page.route('**/api/idea-lab/combine', async route => {
    await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ json: TABLE['chaos+jealousy'] })
  })
  await startLab(page)
  await combine(page, 'Love', 'Fear')
  await expect(concept(page, 'Jealousy')).toBeVisible()

  await combine(page, 'Chaos', 'Jealousy')
  await expect(announcement(page)).toHaveText('Combining')
  await expect(concept(page, 'Love')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Reset all discoveries' })).toBeDisabled()

  release()
  await expect(announcement(page)).toContainText('New discovery: Restlessness.')
  await expect(concept(page, 'Love')).toBeEnabled()
})

test('reset asks first, can be cancelled from the keyboard, and clears everything for good', async ({ page }) => {
  await mockCombine(page)
  await startLab(page)
  await combine(page, 'Love', 'Fear')
  await expect(concept(page, 'Jealousy')).toBeVisible()

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
  await expect(concept(page, 'Jealousy')).toBeVisible()

  await resetButton.click()
  await dialog.getByRole('button', { name: 'Reset' }).click()
  await expect(concept(page, 'Jealousy')).toHaveCount(0)
  await expect(owned(page)).toHaveCount(BASE_CONCEPTS)
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
  await expect(announcement(page)).toContainText('New discovery: Jealousy.')
  await expect(owned(page)).toHaveCount(BASE_CONCEPTS + 1)
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
  await expect(announcement(page)).toHaveText('Gold: Courage. It answers: A trembling that keeps walking toward the morning. Acting despite fear because something matters more.')
  await expect(page.locator('[aria-hidden="true"]').getByText('It answers:', { exact: false }).filter({ visible: true })).toBeVisible()
  // The shelf alone keeps the tally; the bench does not repeat it.
  await expect(page.getByText(/One of the seven golds|Gold, \d+ of \d+/)).toHaveCount(0)
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
  await expect(owned(page)).toHaveCount(BASE_CONCEPTS + 4)
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
  await expect(announcement(page)).toHaveText(/^New discovery: Jealousy\./)
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
  await expect(announcement(page)).toContainText('Gold: Humility. It answers:')

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

test('a found gold warms its riddle on the shelf, and what it answers arrives one beat later', async ({ page }) => {
  await mockCombine(page)
  await startLab(page)

  await combine(page, 'Hope', 'Fear')
  const turning = shelf(page).getByRole('listitem').filter({ hasText: 'Just found. Riddle:' })
  await expect(turning).toHaveCount(1)
  await expect(turning).toContainText('A trembling that keeps walking toward the morning.')
  await expect(turning).toHaveClass(/alchemist-gold-turn/)
  // The live region already read it out; the answer on the shelf starts hidden and settles in after the outline has turned gold.
  const answer = turning.locator('.alchemist-gold-answer')
  await expect(answer).toContainText('Courage')
  await expect.poll(() => answer.evaluate(el => Number(getComputedStyle(el).opacity))).toBe(1)
  await expect(turning).toHaveCSS('border-top-style', 'dashed')
  await expect(turning).toBeInViewport()

  // The next pair files it away with the other golds.
  await concept(page, 'Love').click()
  await expect(shelf(page).getByText('Just found. Riddle:', { exact: false })).toHaveCount(0)
  await expect(shelf(page)).toContainText('Acting despite fear because something matters more.')
})

test('with reduced motion the gold moment is a still frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockCombine(page)
  await startLab(page)

  await combine(page, 'Hope', 'Fear')
  const turning = shelf(page).getByRole('listitem').filter({ hasText: 'Just found. Riddle:' })
  await expect(turning).not.toHaveClass(/alchemist-gold-turn/)
  await expect(turning).toHaveClass(/alchemist-gold-settled/)
  await expect(page.locator('.alchemist-gold-answer')).toHaveCount(0)
  await expect(page.locator('[aria-hidden="true"]').getByText('It answers:', { exact: false }).filter({ visible: true })).toBeVisible()
})

test('the cabinet beside the concepts keeps every idea made, newest first, to be opened and read again', async ({ page }) => {
  await mockCombine(page)
  await startLab(page)
  const cabinet = page.getByRole('region', { name: 'Your cabinet' })
  await expect(cabinet).toContainText('Empty for now.')

  await combine(page, 'Love', 'Fear')
  await expect(announcement(page)).toContainText('New discovery: Jealousy.')
  await combine(page, 'Love', 'Death')
  await expect(announcement(page)).toContainText('New discovery: Grief.')

  const drawers = cabinet.getByRole('button')
  await expect(drawers).toHaveCount(2)
  await expect(drawers.nth(0)).toHaveAccessibleName('Reread Grief')
  await expect(drawers.nth(1)).toHaveAccessibleName('Reread Jealousy')
  await expect(cabinet.locator('button[tabindex="0"]')).toHaveCount(1)

  // Keyboard: arrows move between drawers, Enter opens one in place.
  await drawers.first().focus()
  await page.keyboard.press('ArrowDown')
  await expect(cabinet.getByRole('button', { name: 'Reread Jealousy' })).toBeFocused()
  await page.keyboard.press('Enter')
  const jealousy = cabinet.getByRole('button', { name: 'Reread Jealousy' })
  await expect(jealousy).toHaveAttribute('aria-expanded', 'true')
  const reading = page.locator(`#${await jealousy.getAttribute('aria-controls')}`)
  await expect(reading).toBeVisible()
  await expect(reading).toContainText('When love fears loss, it curdles into possession.')
  await expect(reading).toContainText(/Made from .*Fear and .*Love/)

  // Its place is the empty space under the concepts, not below the riddles.
  const [conceptsBox, cabinetBox, riddlesBox] = await Promise.all([
    page.getByRole('toolbar', { name: 'Your Concepts' }).boundingBox(), cabinet.boundingBox(), shelf(page).boundingBox(),
  ])
  expect(cabinetBox!.y).toBeGreaterThan(conceptsBox!.y + conceptsBox!.height)
  expect(cabinetBox!.x + cabinetBox!.width).toBeLessThanOrEqual(riddlesBox!.x)

  await page.keyboard.press('Enter')
  await expect(reading).toBeHidden()
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => !key.startsWith('ideaLab_') && /cabinet/i.test(key)))).toEqual([])
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

  test('a gold found on a phone brings its riddle on the shelf into view', async ({ page }) => {
    await mockCombine(page)
    await startLab(page)
    await concept(page, 'Hope').tap()
    await concept(page, 'Fear').tap()
    await expect(announcement(page)).toContainText('Gold: Courage.')
    const turning = shelf(page).getByRole('listitem').filter({ hasText: 'Just found. Riddle:' })
    await expect(turning).toBeInViewport({ ratio: 1 })
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

  test('the cabinet waits behind a quiet toggle below the concepts, so the play area comes first', async ({ page }) => {
    await mockCombine(page)
    await seed(page, { ideaLab_discoveries: asDiscoveries(['Jealousy', 'Grief']), ideaLab_combinations: { 'fear+love': 'jealousy' } })
    await page.goto('/games/idea-lab')
    const toggle = page.getByRole('button', { name: 'Your cabinet' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByRole('button', { name: 'Reread Grief' })).toHaveCount(0)
    const [loveBox, toggleBox] = [await concept(page, 'Love').boundingBox(), await toggle.boundingBox()]
    expect(toggleBox!.y).toBeGreaterThan(loveBox!.y)

    await toggle.tap()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: 'Reread Jealousy' }).tap()
    await expect(page.getByText('Jealousy, found earlier.')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})
