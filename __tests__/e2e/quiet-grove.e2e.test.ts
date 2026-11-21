import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * The Gardener (/games/quiet-grove): place plants on a canvas garden that persists in
 * localStorage and occasionally suggests a plant. The suggestion route is always mocked.
 */

const URL = '/games/quiet-grove'
const STORAGE_KEY = 'verygoodmelon:calm-garden'

interface StoredElement {
  variant: { id: string }
  x: number
  y: number
}

async function stubSiteApis(page: Page) {
  // Analytics need the database, which is not part of this game.
  await page.route('**/api/game-events', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/site-visits', (route) => route.fulfill({ status: 204 }))
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

async function mockSuggestion(page: Page, handler?: (route: Route) => Promise<void>) {
  const bodies: { elements: unknown[] }[] = []
  await page.route('**/api/calm-garden/suggest', async (route) => {
    bodies.push(route.request().postDataJSON())
    if (handler) return handler(route)
    await route.fulfill({ json: { suggestion: { type: 'willow', x: 0.8, y: 0.7, reason: 'balance' } } })
  })
  return bodies
}

const garden = (page: Page) => page.getByRole('img', { name: /^Garden with/ })

async function stored(page: Page): Promise<StoredElement[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).elements : []
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
  await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 0 plants/)
  // The drawing loop sizes the canvas only once React has hydrated and wired up input.
  await expect(garden(page)).toHaveAttribute('width', /\d+/)
}

test.describe('The Gardener', () => {
  test.beforeEach(async ({ page }) => {
    await stubSiteApis(page)
  })

  test('plants, accepts a suggestion, undoes, survives a reload and clears', async ({ page }) => {
    const errors = collectPageErrors(page)
    const bodies = await mockSuggestion(page)
    await openGarden(page)

    await plantAt(page, 0.2, 0.5)
    await page.getByRole('radio', { name: 'Oak Tree' }).click()
    await plantAt(page, 0.5, 0.6)
    await page.getByRole('radio', { name: 'Crystal' }).click()
    await plantAt(page, 0.3, 0.9)
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 3 plants/)
    await expect(page.getByText('3 plants')).toBeVisible()

    // The third plant asks the garden for an idea, sending what is already planted.
    await expect.poll(() => bodies.length).toBe(1)
    expect(bodies[0].elements).toHaveLength(3)
    const hint = page.getByRole('button', { name: /would welcome a Willow/ })
    await expect(hint).toBeVisible()
    await hint.click()
    await expect(hint).toBeHidden()

    await expect.poll(async () => (await stored(page)).map((el) => el.variant.id))
      .toEqual(['daisy', 'oak', 'crystal', 'willow'])
    const willow = (await stored(page))[3]
    expect(willow.x).toBeCloseTo(0.8)
    expect(willow.y).toBeCloseTo(0.7)

    await page.getByRole('button', { name: 'Undo last placement' }).click()
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 3 plants/)

    await page.reload()
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 3 plants/)
    expect((await stored(page)).map((el) => el.variant.id)).toEqual(['daisy', 'oak', 'crystal'])

    await page.getByRole('button', { name: 'Clear garden' }).click()
    await page.getByRole('button', { name: 'No' }).click()
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 3 plants/)
    await page.getByRole('button', { name: 'Clear garden' }).click()
    await page.getByRole('button', { name: 'Yes' }).click()
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 0 plants/)
    await expect(page.getByRole('button', { name: 'Undo last placement' })).toBeDisabled()

    await page.reload()
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 0 plants/)
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
      await plantAt(page, 0.05 + (i % 8) * 0.12, i < 8 ? 0.55 : 0.85)
    }
    for (let i = 0; i < 25; i++) await plantAt(page, 0.04 + (i % 25) * 0.038, 0.4 + (i % 5) * 0.12)

    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 40 plants/)
    const ids = new Set((await stored(page)).map((el) => el.variant.id))
    expect(ids.size).toBe(15)
    expect(errors).toEqual([])
  })

  test('regression: the sky above the drawn horizon does not take plants', async ({ page }) => {
    await mockSuggestion(page)
    await openGarden(page)

    // These heights used to be accepted and left plants floating in the sky.
    await plantAt(page, 0.5, 0.1)
    await plantAt(page, 0.5, 0.28)
    await expect(page.getByText('That is sky. Plants need the grass below.')).toBeAttached()
    expect(await stored(page)).toHaveLength(0)

    await plantAt(page, 0.5, 0.4)
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 1 plant\./)
  })

  test('keyboard: plant with arrows and Enter, undo with Ctrl+Z, pick plants with arrow keys', async ({ page }) => {
    await mockSuggestion(page)
    await openGarden(page)

    await page.getByRole('radio', { name: 'Daisy' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Tulip' })).toBeFocused()
    await expect(page.getByRole('radio', { name: 'Tulip' })).toHaveAttribute('aria-checked', 'true')

    await garden(page).focus()
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await stored(page)).length).toBe(1)
    const tulip = (await stored(page))[0]
    expect(tulip.variant.id).toBe('tulip')
    expect(tulip.x).toBeCloseTo(0.65)
    expect(tulip.y).toBeCloseTo(0.75)

    // The cursor never rises into the sky.
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowUp')
    await page.keyboard.press(' ')
    await expect.poll(async () => (await stored(page)).length).toBe(2)
    expect((await stored(page))[1].y).toBeGreaterThanOrEqual(0.33)

    await page.keyboard.press('Control+z')
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 1 plant\./)
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

    await page.getByRole('link', { name: /Back Home/ }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/$/)
  })

  test('a failing or broken suggestion service never interrupts the garden', async ({ page }) => {
    const errors = collectPageErrors(page)
    const bodies = await mockSuggestion(page, (route) => route.fulfill({ status: 500, json: { error: 'down' } }))
    await openGarden(page)

    for (let i = 0; i < 3; i++) await plantAt(page, 0.2 + i * 0.2, 0.6)
    await expect.poll(() => bodies.length).toBe(1)

    await page.unroute('**/api/calm-garden/suggest')
    await mockSuggestion(page, (route) => route.fulfill({ json: { suggestion: { type: 'dragon', x: 'left' } } }))
    for (let i = 0; i < 3; i++) await plantAt(page, 0.2 + i * 0.2, 0.8)

    await page.unroute('**/api/calm-garden/suggest')
    await mockSuggestion(page, (route) => route.abort())
    for (let i = 0; i < 3; i++) await plantAt(page, 0.3 + i * 0.2, 0.7)

    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 9 plants/)
    await expect(page.getByRole('button', { name: /would welcome/ })).toHaveCount(0)
    await expect(page.getByRole('application').getByText(/error|went wrong|generat|try again/i)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('a corrupt or outdated saved garden loads without breaking', async ({ page }) => {
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
          null,
        ],
      }))
    }, STORAGE_KEY)
    await page.goto(URL)
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 1 plant\./)

    await page.evaluate((key) => localStorage.setItem(key, '{not json'), STORAGE_KEY)
    await page.reload()
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 0 plants/)
    expect(errors).toEqual([])
  })

  test('resizing mid-session keeps every plant', async ({ page }) => {
    await mockSuggestion(page)
    await openGarden(page)
    await plantAt(page, 0.3, 0.6)
    await plantAt(page, 0.7, 0.8)

    await page.setViewportSize({ width: 600, height: 700 })
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 2 plants/)
    const box = await garden(page).boundingBox()
    expect(box!.width).toBeLessThanOrEqual(600)
    await plantAt(page, 0.5, 0.5)
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 3 plants/)
  })

  test('reduced motion: the garden still plants and persists', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await stubSiteApis(page)
    await mockSuggestion(page)
    await openGarden(page)
    await plantAt(page, 0.4, 0.6)
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 1 plant\./)
    await page.reload()
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 1 plant\./)
    await context.close()
  })
})

test.describe('The Gardener on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('regression: one tap plants exactly one plant', async ({ page }) => {
    const errors = collectPageErrors(page)
    await stubSiteApis(page)
    await mockSuggestion(page)
    await openGarden(page)

    const box = (await garden(page).boundingBox())!
    await garden(page).tap({ position: { x: box.width * 0.3, y: box.height * 0.7 } })
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 1 plant\./)
    expect(await stored(page)).toHaveLength(1)

    await page.getByRole('button', { name: /tap to change/ }).tap()
    await page.getByRole('radio', { name: 'Pine Tree' }).tap()
    await expect(page.getByRole('button', { name: /Pine Tree \(tap to change\)/ })).toBeVisible()
    await garden(page).tap({ position: { x: box.width * 0.6, y: box.height * 0.6 } })
    await garden(page).tap({ position: { x: box.width * 0.8, y: box.height * 0.9 } })

    await page.getByRole('button', { name: /would welcome a Willow/ }).tap()
    await expect(garden(page)).toHaveAttribute('aria-label', /Garden with 4 plants/)
    expect(errors).toEqual([])
  })
})
