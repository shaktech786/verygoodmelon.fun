import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { SHOWCASE_GAMES } from '@/lib/games/config'

/**
 * Site-wide smoke checks. Each game's own behaviour is covered by its
 * dedicated suite (__tests__/e2e/<slug>.e2e.test.ts); this file only checks
 * what every page must get right, driven from the game config so new games
 * are covered without editing it.
 */

const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')

const SITE_PAGES = ['/', '/games', '/about', '/thoughts', '/privacy', '/terms']
const GAME_PAGES = SHOWCASE_GAMES.map((game) => ({ path: `/games/${game.slug}`, title: game.title }))

// Failures of services the site deliberately degrades around (database, AI,
// voice) surface as failed network requests, which are not page bugs.
function isExpectedConsoleError(text: string): boolean {
  return (
    text.includes('Failed to load resource') ||
    text.includes('favicon') ||
    text.includes('SpeechSynthesis')
  )
}

async function axeViolations(page: Page): Promise<string[]> {
  // Entrance fades would be measured mid-way as low contrast; endless ambient animations are left running.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined))
    )
  )
  await page.evaluate(AXE_SOURCE)
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: {
        run: (
          context: unknown,
          options: unknown
        ) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }>
      }
    }).axe
    const result = await axe.run(
      { exclude: [['nextjs-portal']] },
      { runOnly: ['wcag2a', 'wcag2aa'] }
    )
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  })
}

test.describe('Homepage', () => {
  test('lists every showcase game once', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/VeryGoodMelon/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('lighter')

    for (const game of SHOWCASE_GAMES) {
      await expect(page.locator(`main section[aria-labelledby^="category-"] a[href="/games/${game.slug}"]`)).toHaveCount(1)
    }
  })
})

test.describe('Every page', () => {
  for (const { path: pagePath, title } of [
    ...SITE_PAGES.map((p) => ({ path: p, title: null as string | null })),
    ...GAME_PAGES,
  ]) {
    test(`${pagePath} loads cleanly and accessibly`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !isExpectedConsoleError(msg.text())) errors.push(msg.text())
      })
      page.on('pageerror', (error) => errors.push(error.message))

      const response = await page.goto(pagePath)
      expect(response?.status()).toBe(200)
      await page.waitForLoadState('networkidle')

      await expect(page.locator('a[href="#main-content"]')).toBeAttached()
      await expect(page.locator('main#main-content')).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      if (title) {
        await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
      }
      await expect(page.locator('img:not([alt]):not([aria-hidden="true"])')).toHaveCount(0)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      expect(overflow).toBeLessThanOrEqual(0)

      expect(await axeViolations(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }
})

test('an unknown address gets the friendly 404 page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('leads nowhere')
  await expect(page.getByRole('link', { name: 'Back home' })).toBeVisible()
})
