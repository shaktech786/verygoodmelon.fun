import { test, expect, type Page, type Route } from '@playwright/test'
import { expectKeepsakeSaves } from './helpers/keepsake'
import { expectOneGo } from './helpers/design'

/**
 * The Gardener (/games/quiet-grove): place plants on a canvas garden that persists in
 * localStorage, answers what was planted with a suggestion, can be rearranged, grows
 * between visits, and can be sat with. The suggestion route is always mocked.
 */

const URL = '/games/quiet-grove'
const STORAGE_KEY = 'verygoodmelon:calm-garden'
const DAY = 86_400_000
const SIT_MS = 45_000
const LINE = 'Your daisy could use some shade. A willow behind it, maybe?'

interface StoredPlant {
  id: string
  type: string
  x: number
  y: number
  selfSown?: boolean
}

async function stubSiteApis(page: Page) {
  // Analytics need the database, which is not part of this game.
  await page.route('**/api/game-events', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/site-visits', (route) => route.fulfill({ json: {} }))
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

async function mockSuggestion(page: Page, handler?: (route: Route) => Promise<void>) {
  const bodies: { elements: Record<string, unknown>[]; season?: string }[] = []
  await page.route('**/api/calm-garden/suggest', async (route) => {
    bodies.push(route.request().postDataJSON())
    if (handler) return handler(route)
    await route.fulfill({ json: { suggestion: { type: 'willow', x: 0.8, y: 0.7, line: LINE } } })
  })
  return bodies
}

const garden = (page: Page) => page.getByRole('application', { name: 'Your garden' })
const contents = (page: Page) => page.locator('#garden-contents')
const announcer = (page: Page) => page.locator('#garden-announcer')
// Shown over the garden while it is looked across; heard through the announcer instead.
const returnLine = (page: Page) => page.locator('[aria-hidden="true"]').filter({ hasText: /^While you were away/ })
const RETURN_MS = 4200
const NOTE = /^While you were away, your oak tree grew a little taller and a new poppy came up on its own\.$/

async function stored(page: Page): Promise<StoredPlant[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).plants : []
  }, STORAGE_KEY)
}

async function plantAt(page: Page, fx: number, fy: number) {
  const box = await garden(page).boundingBox()
  if (!box) throw new Error('garden not visible')
  await garden(page).click({ position: { x: box.width * fx, y: box.height * fy } })
}

async function openGarden(page: Page) {
  await page.goto(URL)
  await expect(garden(page)).toBeVisible()
  await expect(contents(page)).toHaveText(/In your garden: nothing yet\./)
  // The drawing loop sizes the canvas only once React has hydrated and wired up input.
  await expect(garden(page)).toHaveAttribute('width', /\d+/)
  // A click during the entrance fade lands on a still-moving canvas, which Playwright scrolls to.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined))
    )
  )
}

async function seedGarden(page: Page, plants: object[], lastVisit: number) {
  await page.addInitScript(([key, value]) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem(key, value)
  }, [STORAGE_KEY, JSON.stringify({ version: 2, lastVisit, plants })] as const)
}

const seeded = (id: string, type: string, x: number, y: number, plantedAt: number) => ({ id, type, x, y, scale: 1, colorSeed: 0.3, phase: 0, plantedAt })

test.describe('The Gardener', () => {
  test.beforeEach(async ({ page }) => {
    await stubSiteApis(page)
  })

  test('plants, answers with a suggestion, undoes, survives a reload and clears', async ({ page }) => {
    const errors = collectPageErrors(page)
    const bodies = await mockSuggestion(page)
    await openGarden(page)
    await expectOneGo(page)

    await plantAt(page, 0.2, 0.5)
    await page.getByRole('radio', { name: 'Oak Tree' }).click()
    await plantAt(page, 0.5, 0.6)
    await page.getByRole('radio', { name: 'Crystal' }).click()
    await plantAt(page, 0.3, 0.9)
    await expect(contents(page)).toHaveText('In your garden: a daisy, an oak tree and a crystal.')
    await expectOneGo(page)

    // The third plant asks for an idea, sending only what is planted and where.
    await expect.poll(() => bodies.length).toBe(1)
    expect(bodies[0].elements).toHaveLength(3)
    expect(Object.keys(bodies[0].elements[0]).sort()).toEqual(['type', 'x', 'y'])
    await expect(page.getByRole('paragraph').filter({ hasText: LINE })).toBeVisible()
    await expect(announcer(page)).toContainText(LINE)
    const hint = page.getByRole('button', { name: 'Plant the willow there' })
    await hint.click()
    await expect(hint).toBeHidden()

    await expect.poll(async () => (await stored(page)).map((el) => el.type)).toEqual(['daisy', 'oak', 'crystal', 'willow'])
    const willow = (await stored(page))[3]
    expect(willow.x).toBeCloseTo(0.8)
    expect(willow.y).toBeCloseTo(0.7)

    await page.getByRole('button', { name: 'Undo last change' }).click()
    await expect(contents(page)).toHaveText('In your garden: a daisy, an oak tree and a crystal.')

    await page.reload()
    await expect(contents(page)).toHaveText('In your garden: a daisy, an oak tree and a crystal.')
    expect((await stored(page)).map((el) => el.type)).toEqual(['daisy', 'oak', 'crystal'])

    await page.getByRole('button', { name: 'Clear garden' }).click()
    await page.getByRole('button', { name: 'No' }).click()
    await expect(contents(page)).toHaveText(/a daisy, an oak tree and a crystal/)
    await page.getByRole('button', { name: 'Clear garden' }).click()
    await page.getByRole('button', { name: 'Yes' }).click()
    await expect(contents(page)).toHaveText('In your garden: nothing yet.')
    // Clearing is not a cliff edge: Undo brings the garden back.
    await page.getByRole('button', { name: 'Undo last change' }).click()
    await expect(contents(page)).toHaveText(/a daisy, an oak tree and a crystal/)
    await page.getByRole('button', { name: 'Clear garden' }).click()
    await page.getByRole('button', { name: 'Yes' }).click()

    await page.reload()
    await expect(contents(page)).toHaveText('In your garden: nothing yet.')
    await expect(page.getByRole('button', { name: 'Undo last change' })).toBeDisabled()
    expect(errors).toEqual([])
  })

  test('every plant variant can be placed and the garden can be filled', async ({ page }) => {
    const errors = collectPageErrors(page)
    await mockSuggestion(page)
    await openGarden(page)

    const radios = page.getByRole('radio')
    const count = await radios.count()
    expect(count).toBe(15)
    for (let i = 0; i < count; i++) {
      await radios.nth(i).click()
      await plantAt(page, 0.06 + (i % 8) * 0.125, i < 8 ? 0.5 : 0.95)
    }
    // The keyboard plants where the cursor is, even among other plants.
    await garden(page).focus()
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowDown')
      await page.keyboard.press('Enter')
    }

    await expect.poll(async () => (await stored(page)).length).toBe(40)
    expect(new Set((await stored(page)).map((el) => el.type)).size).toBe(15)
    expect(errors).toEqual([])
  })

  test('regression: the sky above the drawn horizon does not take plants', async ({ page }) => {
    await mockSuggestion(page)
    await openGarden(page)

    // These heights used to be accepted and left plants floating in the sky.
    await plantAt(page, 0.5, 0.1)
    await plantAt(page, 0.5, 0.28)
    await expect(announcer(page)).toHaveText('That is sky. Plants need the grass below.')
    expect(await stored(page)).toHaveLength(0)

    await plantAt(page, 0.5, 0.4)
    await expect(contents(page)).toHaveText('In your garden: a daisy.')
  })

  test('keyboard: plant with arrows and Enter, hear where the spot is, undo with Ctrl+Z, pick plants with arrow keys', async ({ page }) => {
    await mockSuggestion(page)
    await openGarden(page)

    await page.getByRole('radio', { name: 'Daisy' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Tulip' })).toBeFocused()
    await expect(page.getByRole('radio', { name: 'Tulip' })).toHaveAttribute('aria-checked', 'true')

    await garden(page).focus()
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
    await expect(announcer(page)).toHaveText('Near the front, in the center, on open grass.')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await stored(page)).length).toBe(1)
    const tulip = (await stored(page))[0]
    expect(tulip.type).toBe('tulip')
    expect(tulip.x).toBeCloseTo(0.65)
    expect(tulip.y).toBeCloseTo(0.75)
    await expect(announcer(page)).toHaveText('Planted a tulip near the front, in the center.')

    await page.keyboard.press('ArrowLeft')
    await expect(announcer(page)).toHaveText('Near the front, in the center, just left of the tulip.')

    // The cursor never rises into the sky.
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowUp')
    await page.keyboard.press(' ')
    await expect.poll(async () => (await stored(page)).length).toBe(2)
    expect((await stored(page))[1].y).toBeGreaterThanOrEqual(0.33)

    await page.keyboard.press('Control+z')
    await expect(contents(page)).toHaveText('In your garden: a tulip.')
  })

  test('regression: arrow keys scroll the page and Enter follows links outside the garden', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 })
    await mockSuggestion(page)
    await openGarden(page)

    await page.locator('h1').click()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    expect(await stored(page)).toHaveLength(0)

    await page.getByRole('link', { name: 'VeryGoodMelon.Fun home' }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/$/)
  })

  test('a suggestion waits until you plant it or set it aside', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-21T13:00:00') })
    await mockSuggestion(page)
    await openGarden(page)
    for (let i = 0; i < 3; i++) await plantAt(page, 0.2 + i * 0.2, 0.6)
    const hint = page.getByRole('button', { name: 'Plant the willow there' })
    await expect(hint).toBeVisible()

    // No time pressure: a long pause leaves the idea where it was.
    await page.clock.fastForward(5 * 60_000)
    await expect(hint).toBeVisible()

    // Planting something else does not quietly take the idea away.
    await plantAt(page, 0.3, 0.85)
    await expect.poll(async () => (await stored(page)).length).toBe(4)
    await expect(hint).toBeVisible()

    await page.getByRole('button', { name: 'Not now' }).click()
    await expect(hint).toBeHidden()
    expect((await stored(page)).map((p) => p.type)).not.toContain('willow')
  })

  test.describe('in the southern hemisphere', () => {
    test.use({ timezoneId: 'Australia/Sydney' })

    test('November is spring, and the gardener is told so', async ({ page }) => {
      await page.clock.install({ time: new Date('2026-11-21T13:00:00') })
      const bodies = await mockSuggestion(page)
      await openGarden(page)
      for (let i = 0; i < 3; i++) await plantAt(page, 0.2 + i * 0.2, 0.6)
      await expect.poll(() => bodies.length).toBe(1)
      expect(bodies[0]).toMatchObject({ season: 'spring' })
    })
  })

  test('flowers draw a visitor to the garden, announced for screen readers', async ({ page }) => {
    await mockSuggestion(page, (route) => route.fulfill({ status: 503 }))
    await openGarden(page)
    await plantAt(page, 0.3, 0.6)
    await plantAt(page, 0.5, 0.7)
    await expect(announcer(page)).not.toContainText('found your garden')
    await plantAt(page, 0.7, 0.6)
    await expect(announcer(page)).toContainText(/A (butterfly|firefly) has found your garden\./)
    await expect(contents(page)).toHaveText(/three daisies\. A (butterfly|firefly) is visiting\./)

    // A garden that already has visitors does not announce them again on reload.
    await page.reload()
    await expect(contents(page)).toHaveText(/three daisies/)
    await expect(announcer(page)).not.toContainText('found your garden')
  })

  test('a failing or broken suggestion service still gets a thoughtful suggestion, never an error', async ({ page }) => {
    const errors = collectPageErrors(page)
    const bodies = await mockSuggestion(page, (route) => route.fulfill({ status: 500, json: { error: 'down' } }))
    await openGarden(page)

    const answered = async () => {
      const hint = page.getByRole('button', { name: /^Plant the .+ there$/ })
      await expect(hint).toBeVisible()
      await page.getByRole('button', { name: 'Not now' }).click()
    }
    for (let i = 0; i < 3; i++) await plantAt(page, 0.2 + i * 0.25, 0.6)
    await expect.poll(() => bodies.length).toBe(1)
    await answered()

    await page.unroute('**/api/calm-garden/suggest')
    await mockSuggestion(page, (route) => route.fulfill({ json: { suggestion: { type: 'dragon', x: 'left', line: 'As an AI model' } } }))
    for (let i = 0; i < 3; i++) await plantAt(page, 0.2 + i * 0.25, 0.85)
    await answered()

    await page.unroute('**/api/calm-garden/suggest')
    await mockSuggestion(page, (route) => route.abort())
    for (let i = 0; i < 3; i++) await plantAt(page, 0.1 + i * 0.25, 0.75)
    await answered()

    expect(await stored(page)).toHaveLength(9)
    await expect(page.locator('main').getByText(/error|went wrong|generat|try again|\bAI\b/i)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('a garden saved by the first version loads, migrated, and a broken save starts fresh', async ({ page }) => {
    const errors = collectPageErrors(page)
    await mockSuggestion(page)
    await page.addInitScript((key) => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        elements: [
          { id: 'a', variant: { category: 'flower', id: 'daisy', label: 'Daisy' }, x: 0.5, y: 0.6, scale: 1, colorSeed: 0.2, phase: 0, placedAt: 0 },
          { id: 'b', variant: { category: 'tree', id: 'baobab', label: 'Baobab' }, x: 0.4, y: 0.6, scale: 1, colorSeed: 0.2, phase: 0, placedAt: 0 },
          { id: 'c', variant: { category: 'tree', id: 'pine', label: 'Pine Tree' }, x: 0.2, y: 0.8, scale: 1.1, colorSeed: 0.6, phase: 1, placedAt: 0 },
          null,
        ],
      }))
    }, STORAGE_KEY)
    await page.goto(URL)
    await expect(contents(page)).toHaveText('In your garden: a daisy and a pine tree.')
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').version, STORAGE_KEY)).toBe(2)
    expect((await stored(page)).map((p) => [p.id, p.type])).toEqual([['a', 'daisy'], ['c', 'pine']])

    await page.evaluate((key) => localStorage.setItem(key, '{not json'), STORAGE_KEY)
    await page.reload()
    await expect(contents(page)).toHaveText('In your garden: nothing yet.')
    expect(errors).toEqual([])
  })

  test('resizing mid-session keeps every plant', async ({ page }) => {
    await mockSuggestion(page)
    await openGarden(page)
    await plantAt(page, 0.3, 0.6)
    await plantAt(page, 0.7, 0.8)

    await page.setViewportSize({ width: 600, height: 700 })
    await expect(contents(page)).toHaveText(/^In your garden: two daisies\./)
    const box = await garden(page).boundingBox()
    expect(box!.width).toBeLessThanOrEqual(600)
    await plantAt(page, 0.5, 0.45)
    await expect(contents(page)).toHaveText(/^In your garden: three daisies\./)
  })

  test('reduced motion: the garden still plants, persists and can be sat with', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await stubSiteApis(page)
    await mockSuggestion(page)
    await page.clock.install({ time: new Date('2026-11-21T13:00:00') })
    await openGarden(page)
    for (let i = 0; i < 3; i++) await plantAt(page, 0.2 + i * 0.3, 0.6)
    await page.reload()
    await expect(contents(page)).toHaveText(/three daisies/)
    await page.getByRole('button', { name: 'Sit with your garden' }).click()
    await page.clock.fastForward(SIT_MS + 1000)
    await expect(page.locator('#sit-words')).toContainText('three flowers')
    await context.close()
  })

  test('tap a plant to choose it, then move it, drag it or remove it', async ({ page }) => {
    const errors = collectPageErrors(page)
    await mockSuggestion(page)
    await openGarden(page)
    await page.getByRole('radio', { name: 'Oak Tree' }).click()
    await plantAt(page, 0.3, 0.6)
    await page.getByRole('radio', { name: 'Round Stone' }).click()
    await plantAt(page, 0.7, 0.85)

    // Tapping the oak's canopy chooses it instead of planting on top of it.
    await plantAt(page, 0.3, 0.45)
    await expect(page.getByText(/^Oak Tree, .*Drag it, or:$/)).toBeVisible()
    expect(await stored(page)).toHaveLength(2)

    await page.getByRole('button', { name: 'Move', exact: true }).click()
    await expect(page.getByRole('paragraph').filter({ hasText: /Tap the grass where the oak tree should go/ })).toBeVisible()
    await plantAt(page, 0.8, 0.5)
    await expect.poll(async () => (await stored(page))[0].x).toBeCloseTo(0.8, 1)
    expect(await stored(page)).toHaveLength(2)
    await expect(announcer(page)).toContainText('Set the oak tree down')

    // Dragging a plant moves it in one gesture.
    const box = (await garden(page).boundingBox())!
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.84)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8, { steps: 6 })
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.75, { steps: 6 })
    await page.mouse.up()
    await expect.poll(async () => (await stored(page))[1].x).toBeCloseTo(0.2, 1)
    await expect(announcer(page)).toContainText('Moved the round stone')

    await plantAt(page, 0.2, 0.74)
    await page.getByRole('button', { name: 'Remove', exact: true }).click()
    await expect(contents(page)).toHaveText('In your garden: an oak tree.')
    await page.getByRole('button', { name: 'Undo last change' }).click()
    await expect(contents(page)).toHaveText('In your garden: an oak tree and a round stone.')
    expect(errors).toEqual([])
  })

  test('the list of plants reads the garden aloud and lets keyboard users move and remove plants', async ({ page }) => {
    await mockSuggestion(page)
    await openGarden(page)
    await plantAt(page, 0.2, 0.9)
    await page.getByRole('radio', { name: 'Flat Stone' }).click()
    await plantAt(page, 0.26, 0.9)

    await page.getByText("What's in your garden").click()
    const list = page.locator('details').getByRole('list')
    await expect(list.getByRole('listitem')).toHaveText([
      /Daisy, near the front, on the left, just left of the flat stone/,
      /Flat Stone, near the front, on the left, just right of the daisy/,
    ])

    await page.getByRole('button', { name: /^Move the daisy/ }).click()
    await expect(garden(page)).toBeFocused()
    await expect(announcer(page)).toHaveText('Moving the daisy. Arrow keys move it, Enter sets it down, Escape puts it back.')
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await expect(announcer(page)).toHaveText(/^Near the front, (in the center|on the right)/)
    await page.keyboard.press('Enter')
    await expect(announcer(page)).toHaveText(/^Set the daisy down near the front/)
    expect((await stored(page))[0].x).toBeCloseTo(0.5)

    // Escape puts a moving plant back where it was.
    await page.getByRole('button', { name: /^Move the flat stone/ }).click()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Escape')
    expect((await stored(page))[1].y).toBeCloseTo(0.9)

    await page.getByRole('button', { name: /^Remove the daisy/ }).click()
    await expect(contents(page)).toHaveText('In your garden: a flat stone.')
    await expect(page.getByRole('button', { name: /^Remove the flat stone/ })).toBeFocused()
  })

  test('sit with your garden: the tools step away, the light changes, and you are left with one line', async ({ page }) => {
    // A whole sit, a saved postcard and a second sit: more than the default half minute on a busy dev server
    test.slow()
    await page.clock.install({ time: new Date('2026-11-21T13:00:00') })
    const bodies = await mockSuggestion(page)
    await openGarden(page)

    const sit = page.getByRole('button', { name: 'Sit with your garden' })
    await expect(sit).toBeDisabled()
    // Stones are welcome but are not yet a garden to sit with.
    await page.getByRole('radio', { name: 'Round Stone' }).click()
    for (let i = 0; i < 3; i++) await plantAt(page, 0.15 + i * 0.3, 0.9)
    await expect(sit).toBeDisabled()
    await page.getByRole('radio', { name: 'Poppy' }).click()
    await plantAt(page, 0.2, 0.6)
    await plantAt(page, 0.5, 0.6)
    await page.getByRole('radio', { name: 'Willow' }).click()
    await plantAt(page, 0.8, 0.55)
    await expect(sit).toBeEnabled()
    await expect(announcer(page)).toContainText('Your garden is ready to sit with')
    const calls = bodies.length

    await sit.click()
    const dialog = page.getByRole('dialog', { name: 'Sitting with your garden' })
    await expect(dialog).toBeVisible()
    // The sitting view covers the tools: what sits over the plant picker is the dialog.
    expect(await page.getByRole('radiogroup').evaluate((el) => {
      const r = el.getBoundingClientRect()
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[role=dialog]') !== null
    })).toBe(true)
    const stand = dialog.getByRole('button', { name: 'Stand up' })
    await expect(stand).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(stand).toBeFocused()
    await expect(dialog).toContainText('Stay as long as you like.')
    await expect(dialog).not.toContainText('came to sit with you')

    // With two flowers and no one visiting yet, two visitors come, one at a time, well apart.
    await page.clock.runFor(SIT_MS * 0.35 + 500)
    await expect(page.locator('#sit-words')).toContainText('A butterfly came to sit with you.')
    await page.clock.runFor(SIT_MS * 0.25)
    await expect(page.locator('#sit-words')).toContainText('Another came to sit with you.')
    await expect(page.locator('#sit-words')).not.toContainText('A butterfly came')

    await page.clock.fastForward(SIT_MS * 0.4 + 1000)
    await expect(page.locator('#sit-words')).toHaveText(
      /^An autumn garden: two flowers, a willow and three stones\. Two butterflies came while you sat\. You planted all of it today\.$/,
    )
    expect(bodies.length).toBe(calls)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    // A finished sit ends on a postcard of this garden, drawn from this sit
    const postcard = page.getByTestId('garden-postcard')
    await expect(postcard).toBeFocused()
    await expect(postcard.getByRole('heading', { name: 'A postcard of your garden' })).toBeVisible()
    await expect(announcer(page)).toContainText('a postcard of it is ready to keep')
    // An older suggestion never sits above the postcard at the ending
    await expect(page.getByRole('button', { name: 'Not now' })).toHaveCount(0)
    await expectKeepsakeSaves(page, {
      within: postcard,
      fileName: /^the-gardener-2026-11-21\.png$/,
      describedAs: /^A postcard of your autumn garden in late afternoon gold: three round stones, two poppies and a willow, with two butterflies among the plants\. A stamp in the corner says autumn\. Written beneath: “An autumn garden: two flowers/,
    })
    expect(await stored(page)).toHaveLength(6)

    // Standing up before the light has finished changing goes straight back, with no postcard
    await sit.click()
    await expect(postcard).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(sit).toBeFocused()
    await expect(postcard).toHaveCount(0)
  })

  test('on a phone, the postcard after a sit is the first thing on screen, with readable controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.clock.install({ time: new Date('2026-11-21T21:30:00') })
    await mockSuggestion(page)
    await openGarden(page)
    await page.getByRole('radio', { name: 'Daisy' }).click()
    for (let i = 0; i < 4; i++) await plantAt(page, 0.15 + i * 0.22, 0.7)
    await page.getByRole('button', { name: 'Sit with your garden' }).click()
    await page.clock.fastForward(SIT_MS + 1000)
    await expect(page.locator('#sit-words')).toContainText('You planted all of it today.')
    await page.getByRole('button', { name: 'Stand up' }).click()
    const postcard = page.getByTestId('garden-postcard')
    await expect(postcard).toBeFocused()
    await expect(postcard.getByTestId('keepsake-canvas')).toHaveAccessibleDescription(/garden in moonlight: .+, with (two|three|four|five) fireflies among the plants/)
    await expect(postcard.getByTestId('keepsake-canvas')).toBeInViewport({ ratio: 1 })
    expect(parseFloat(await postcard.getByRole('button', { name: 'Save image' }).evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14)
  })

  test('coming back after a few days, the garden has grown and a flower has seeded itself', async ({ page }) => {
    const now = Date.parse('2026-11-24T10:00:00')
    await page.clock.install({ time: new Date(now) })
    await mockSuggestion(page)
    await seedGarden(page, [
      seeded('a', 'poppy', 0.25, 0.7, now - 3 * DAY),
      seeded('b', 'poppy', 0.4, 0.75, now - 3 * DAY),
      seeded('c', 'oak', 0.6, 0.5, now - 3 * DAY),
    ], now - 2 * DAY)
    await page.goto(URL)

    // First a few seconds looking across the garden, with the line over it, then the line rests below.
    await expect(returnLine(page)).toBeVisible()
    await expect(returnLine(page)).toContainText(/to skip/)
    await expect(page.getByRole('paragraph').filter({ hasText: NOTE })).toHaveCount(0)
    await expect(announcer(page)).toHaveText(NOTE)
    await page.clock.runFor(RETURN_MS + 100)
    await expect(returnLine(page)).toHaveCount(0)
    await expect(page.getByRole('paragraph').filter({ hasText: NOTE })).toBeVisible()
    await expect(contents(page)).toHaveText('In your garden: three poppies and an oak tree. A butterfly is visiting.')
    await expect.poll(async () => (await stored(page)).filter((p) => p.selfSown)).toHaveLength(1)
    await page.getByText("What's in your garden").click()
    await expect(page.getByRole('listitem').filter({ hasText: 'came up on its own' })).toHaveCount(1)

    // Reloading straight away is not a new visit: nothing more grows, and there is nothing to look across.
    await page.reload()
    await expect(contents(page)).toHaveText(/three poppies/)
    await expect(page.getByText(/While you were away/)).toHaveCount(0)
    expect(await stored(page)).toHaveLength(4)
  })

  const grownGarden = (now: number) => [
    seeded('a', 'poppy', 0.25, 0.7, now - 3 * DAY),
    seeded('b', 'poppy', 0.4, 0.75, now - 3 * DAY),
    seeded('c', 'oak', 0.6, 0.5, now - 3 * DAY),
  ]

  test('the look across a returning garden ends at a key, and the tap that ends it plants nothing', async ({ page }) => {
    const errors = collectPageErrors(page)
    const now = Date.parse('2026-11-24T10:00:00')
    await page.clock.install({ time: new Date(now) })
    await mockSuggestion(page)
    await seedGarden(page, grownGarden(now), now - 2 * DAY)
    await page.goto(URL)
    await expect(returnLine(page)).toBeVisible()
    await page.keyboard.press('Shift')
    await expect(returnLine(page)).toHaveCount(0)
    await expect(page.getByRole('paragraph').filter({ hasText: NOTE })).toBeVisible()

    // A new visit two days on, ended by tapping the garden itself.
    const later = now + 2 * DAY
    await page.clock.setSystemTime(new Date(later))
    await page.reload()
    await expect(returnLine(page)).toBeVisible()
    const before = (await stored(page)).length
    const box = (await garden(page).boundingBox())!
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.85)
    await expect(returnLine(page)).toHaveCount(0)
    expect(await stored(page)).toHaveLength(before)
    // Afterwards the garden plants as usual.
    await plantAt(page, 0.5, 0.85)
    await expect.poll(async () => (await stored(page)).length).toBe(before + 1)
    expect(errors).toEqual([])
  })

  test('reduced motion: coming back shows a still garden with the same line, which ends by itself', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await stubSiteApis(page)
    await mockSuggestion(page)
    const now = Date.parse('2026-11-24T10:00:00')
    await page.clock.install({ time: new Date(now) })
    await seedGarden(page, grownGarden(now), now - 2 * DAY)
    await page.goto(URL)
    await expect(returnLine(page)).toBeVisible()
    await expect(announcer(page)).toHaveText(NOTE)
    await page.clock.runFor(RETURN_MS + 100)
    await expect(returnLine(page)).toHaveCount(0)
    await context.close()
  })

  test('a fully grown garden left a while is not described as having grown', async ({ page }) => {
    const now = Date.parse('2026-11-24T10:00:00')
    await page.clock.install({ time: new Date(now) })
    await mockSuggestion(page)
    // Planted long ago, a single flower (no seeding), last seen a day ago: nothing really changed.
    await seedGarden(page, [seeded('a', 'oak', 0.5, 0.6, now - 30 * DAY)], now - DAY)
    await page.goto(URL)
    await expect(contents(page)).toHaveText(/an oak tree/)
    await page.clock.runFor(500)
    await expect(page.getByText(/While you were away/)).toHaveCount(0)
  })

  test('at 1280x800 the garden, every plant, Undo and Sit fit on one screen, with no score or page-wide application', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockSuggestion(page)
    await openGarden(page)
    for (let i = 0; i < 3; i++) await plantAt(page, 0.2 + i * 0.3, 0.6)
    await expect(page.getByRole('button', { name: 'Plant the willow there' })).toBeVisible()

    await expect(garden(page)).toBeInViewport({ ratio: 1 })
    for (const radio of await page.getByRole('radio').all()) await expect(radio).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('button', { name: 'Undo last change' })).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('button', { name: 'Sit with your garden' })).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('button', { name: 'Plant the willow there' })).toBeInViewport({ ratio: 1 })
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    await expect(page.getByText(/^\d+ plants?$/)).toHaveCount(0)
    // Only the canvas itself takes keys directly; the rest of the game reads normally.
    await expect(page.getByRole('application')).toHaveCount(1)
    await expect(page.getByRole('application').getByRole('radiogroup')).toHaveCount(0)
    const keys = page.getByText('Keys', { exact: true })
    await expect(keys).toBeVisible()
    await expect(page.getByText(/^Tab to the garden/)).toBeHidden()
    await keys.click()
    await expect(page.getByText(/^Tab to the garden/)).toBeVisible()
  })
})

test.describe('The Gardener on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('regression: one tap plants exactly one plant, and the tools fit without keyboard hints', async ({ page }) => {
    const errors = collectPageErrors(page)
    await stubSiteApis(page)
    await mockSuggestion(page)
    await openGarden(page)

    const box = (await garden(page).boundingBox())!
    await garden(page).tap({ position: { x: box.width * 0.3, y: box.height * 0.7 } })
    await expect(contents(page)).toHaveText('In your garden: a daisy.')
    expect(await stored(page)).toHaveLength(1)

    // Every plant is visible without opening anything, and nothing scrolls sideways.
    await expect(page.getByRole('radio')).toHaveCount(15)
    for (const radio of await page.getByRole('radio').all()) await expect(radio).toBeInViewport({ ratio: 0 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await expect(page.getByText('Keys', { exact: true })).toBeHidden()

    await page.getByRole('radio', { name: 'Pine Tree' }).tap()
    await expect(page.getByRole('radio', { name: 'Pine Tree' })).toHaveAttribute('aria-checked', 'true')
    await garden(page).tap({ position: { x: box.width * 0.6, y: box.height * 0.6 } })
    await garden(page).tap({ position: { x: box.width * 0.85, y: box.height * 0.9 } })

    await page.getByRole('button', { name: 'Plant the willow there' }).tap()
    await expect(contents(page)).toHaveText('In your garden: a daisy, two pine trees and a willow.')

    await page.getByRole('button', { name: 'Sit with your garden' }).tap()
    await expect(page.getByRole('dialog', { name: 'Sitting with your garden' })).toBeVisible()
    await page.getByRole('button', { name: 'Stand up' }).tap()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(errors).toEqual([])
  })
})
