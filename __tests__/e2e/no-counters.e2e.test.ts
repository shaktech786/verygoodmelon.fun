import { test, expect } from '@playwright/test'
import { SHOWCASE_GAMES } from '@/lib/games/config'
import { readsAsCounter } from './helpers/counters'

/**
 * Every game, as a player first meets it, reads without a counter, score, countdown or
 * clock. The endings and deeper screens are held to the same rule by the source scan in
 * __tests__/lib/no-counters.test.ts.
 */

/** Lines that match a counter pattern but are content. Each entry says why. */
const ALLOWED: RegExp[] = [
  // The Optimist's daily hopeful fact may quote a real duration from its source
  /^The Wright brothers’ first powered flight|Cataract surgery|150 minutes a week/,
  // The length limit beside The Awakening's and The Final Word's text box (community-words/WritingParts.tsx)
  /^\d+\/\d+ characters$/,
]

test('the footer on every page reads without counting, even when the visit total is known', async ({ page }) => {
  await page.route('**/api/site-visits', (route) => route.fulfill({ json: { count: 48213 } }))
  await page.goto('/games')
  const footer = page.getByRole('contentinfo')
  await expect(footer).toBeVisible()
  const lines = (await footer.innerText()).split('\n').map((line) => line.trim()).filter(Boolean)
  expect(lines.filter(readsAsCounter)).toEqual([])
})

for (const game of SHOWCASE_GAMES) {
  test(`${game.title} opens without counting at the player`, async ({ page }) => {
    await page.goto(`/games/${game.slug}`)
    const main = page.locator('main')
    await expect(main.getByRole('heading').first()).toBeVisible()
    const lines = (await main.innerText()).split('\n').map((line) => line.trim()).filter(Boolean)
    const counters = lines.filter((line) => readsAsCounter(line) && !ALLOWED.some((allowed) => allowed.test(line)))
    expect(counters).toEqual([])
  })
}
