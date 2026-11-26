import { test, expect } from '@playwright/test'

/**
 * Visual snapshots of the Seedpress proof and the pages that carry the system
 * (docs/design-system/PLAN.md, "Visual-check strategy"): /press, /, /games and one game per batch,
 * at 390, 1440 and 2560 wide in Light, Dark and Light-Quiet, with reduced motion forced so frames hold still.
 *
 * Screenshots differ by OS, so the baselines are Linux ones made by the Visual workflow.
 */

const SETTINGS_KEY = 'verygoodmelon:accessibility:settings'

const PAGES = [
  { name: 'press', url: '/press' },
  { name: 'home', url: '/' },
  { name: 'games', url: '/games' },
  { name: 'the-long-breath', url: '/games/the-long-breath' },
  { name: 'final-breath', url: '/games/final-breath' },
  { name: 'ancient-voices', url: '/games/ancient-voices' },
  { name: 'the-mutation', url: '/games/the-mutation' },
] as const

const WIDTHS = [390, 1440, 2560] as const

const LOOKS = [
  { name: 'light', scheme: 'light', sense: 'gentle' },
  { name: 'dark', scheme: 'dark', sense: 'gentle' },
  { name: 'light-quiet', scheme: 'light', sense: 'quiet' },
] as const

test.use({ reducedMotion: 'reduce' })

for (const { name, url } of PAGES) {
  for (const width of WIDTHS) {
    for (const look of LOOKS) {
      test(`${name} at ${width}px, ${look.name}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme: look.scheme, reducedMotion: 'reduce' })
        await page.addInitScript(
          ([key, sense]) => window.localStorage.setItem(key, JSON.stringify({ sense, reduceMotion: true })),
          [SETTINGS_KEY, look.sense] as const
        )
        await page.goto(url)
        await expect(page.locator('html')).toHaveAttribute('data-sense', look.sense)
        await page.evaluate(() => document.fonts.ready)

        await expect(page).toHaveScreenshot(`${name}-${width}-${look.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          maxDiffPixelRatio: 0.01,
        })
      })
    }
  }
}
