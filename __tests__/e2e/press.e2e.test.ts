import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { SHOWCASE_GAMES, SHOWCASE_GROUPS } from '@/lib/games/config'
import { expectOneGo } from './helpers/design'

/**
 * The Seedpress proof at /press and /press/home (docs/design-system/PLAN.md, Phase 1): kept out of
 * search and off every other page, accessible at phone, desktop and ultrawide widths in light,
 * dark and Quiet, with one go per screen.
 */

const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')
const SENSE_KEY = 'verygoodmelon:press:sense'
const WIDTHS = [390, 1440, 2560] as const
const LOOKS = [
  { name: 'light', scheme: 'light', sense: 'gentle' },
  { name: 'dark', scheme: 'dark', sense: 'gentle' },
  { name: 'quiet', scheme: 'light', sense: 'quiet' },
] as const

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(AXE_SOURCE)
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> }
    }).axe
    const result = await axe.run(
      { exclude: [['nextjs-portal']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }
    )
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  })
}

async function open(page: Page, url: string, sense: string) {
  await page.addInitScript(([key, value]) => window.sessionStorage.setItem(key, value), [SENSE_KEY, sense] as const)
  await page.goto(url)
  await expect(page.locator('.press')).toHaveAttribute('data-sense', sense)
  await page.evaluate(() => document.fonts.ready)
}

for (const url of ['/press', '/press/home']) {
  for (const width of WIDTHS) {
    for (const look of LOOKS) {
      test(`${url} at ${width}px, ${look.name}: no accessibility violations and one go`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme: look.scheme })
        await open(page, url, look.sense)
        expect(await axeViolations(page)).toEqual([])
        await expectOneGo(page)
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
      })
    }
  }
}

test('the proof is kept out of search', async ({ page }) => {
  for (const url of ['/press', '/press/home']) {
    await page.goto(url)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  }
})

test('nothing on the live site links to the proof', async ({ page }) => {
  for (const url of ['/', '/games', '/about', `/games/${SHOWCASE_GAMES[0].slug}`]) {
    await page.goto(url)
    await expect(page.locator('a[href^="/press"]')).toHaveCount(0)
  }
})

test('the rack shows every game on its shelf, with today’s packet as the one go', async ({ page }) => {
  await open(page, '/press/home', 'gentle')
  const rack = page.getByRole('region', { name: 'The rack' })
  for (const group of SHOWCASE_GROUPS) {
    const shelf = rack.getByRole('region', { name: group.title })
    await expect(shelf.getByRole('heading', { level: 2, name: group.title })).toBeVisible()
    for (const game of group.games) {
      await expect(shelf.getByRole('link', { name: game.title, exact: true })).toHaveAttribute('href', `/games/${game.slug}`)
    }
  }
  const go = page.locator('main [data-go]')
  await expect(go).toHaveCount(1)
  await expect(go).toHaveText(/Open today’s packet/)
  await expect(page.getByRole('navigation', { name: 'Start from how you feel' }).getByRole('link')).toHaveCount(3)
})

test('the dial turns the page Quiet, Gentle or Lively for the visit, by keyboard', async ({ page }) => {
  await page.goto('/press')
  // Gentle is the default sense
  await expect(page.locator('.press')).toHaveAttribute('data-sense', 'gentle')
  const dial = page.getByRole('group', { name: 'How it feels' }).last()
  await dial.getByRole('radio', { name: 'Gentle' }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(dial.getByRole('radio', { name: 'Quiet' })).toBeChecked()
  await expect(page.locator('.press')).toHaveAttribute('data-sense', 'quiet')
  await expect(page.locator('.press a.sp-packet').first()).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  await page.reload()
  await expect(page.locator('.press')).toHaveAttribute('data-sense', 'quiet')
  await dial.getByRole('radio', { name: 'Quiet' }).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.press')).toHaveAttribute('data-sense', 'lively')
})

test('nothing moves on arrival, and Quiet has no motion at all', async ({ page }) => {
  await open(page, '/press/home', 'quiet')
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
  await page.getByRole('link', { name: SHOWCASE_GAMES[0].title, exact: true }).hover()
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
})

test('the header gear opens the settings, and the old chrome stays out of the way', async ({ page }) => {
  await open(page, '/press/home', 'gentle')
  await expect(page.getByRole('banner')).toBeHidden()
  await expect(page.getByRole('contentinfo')).toBeHidden()
  const panel = page.getByRole('dialog', { name: 'Accessibility settings' })
  await expect(async () => {
    if (!(await panel.isVisible())) await page.getByRole('button', { name: 'Open accessibility settings' }).click()
    await expect(panel).toBeVisible({ timeout: 1000 })
  }).toPass()
})

test('the fonts are served from the site, never from Google', async ({ page }) => {
  const fontHosts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fontHosts.push(new URL(request.url()).host)
  })
  await open(page, '/press/home', 'gentle')
  await expect.poll(() => fontHosts.length).toBeGreaterThan(0)
  expect(fontHosts.every((host) => host === 'localhost:3000')).toBe(true)
})
