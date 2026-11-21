import { test, expect, type Page } from '@playwright/test'

/**
 * The Harmonist (/games/the-still-point): guided breathing patterns drawn on a canvas.
 * Every test drives a fake clock, so phase timing is asserted exactly and nothing waits in real time.
 */

const URL = '/games/the-still-point'

async function stubSiteApis(page: Page) {
  await page.route('**/api/game-events', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/site-visits', (route) => route.fulfill({ status: 204 }))
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

const T0 = new Date('2026-11-21T10:00:00').getTime()

async function openGame(page: Page) {
  await stubSiteApis(page)
  await page.clock.install({ time: T0 })
  await page.goto(URL)
  await expect(page.getByRole('button', { name: 'Begin Breathing' })).toBeVisible()
  // Pattern radios get a roving tabindex only after hydration.
  await expect(page.getByRole('radio', { name: /Box Breathing/ })).toHaveAttribute('tabindex', '0')
  // From here on the page only sees time that the test hands it.
  await page.clock.pauseAt(T0 + 60_000)
}

// Jumps the clock and lets one animation frame draw the new moment. Everything on screen
// is derived from elapsed time, so this matches running every frame, only faster.
async function advance(page: Page, ms: number) {
  await page.clock.fastForward(ms)
  await page.clock.runFor(20)
}

const app = (page: Page) => page.getByRole('application', { name: 'Breathing Patterns' })
const phase = (page: Page) => app(page).getByRole('heading', { level: 2 })
const sessionTime = (page: Page) => app(page).getByRole('timer')

async function startPattern(page: Page, name: RegExp) {
  await page.getByRole('radio', { name }).click()
  await page.getByRole('button', { name: 'Begin Breathing' }).click()
  await expect(phase(page)).toBeVisible()
}

async function hideTab(page: Page, hidden: boolean) {
  await page.evaluate((isHidden) => {
    Object.defineProperty(document, 'visibilityState', { value: isHidden ? 'hidden' : 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
}

test.describe('The Harmonist', () => {
  test('a full multi-cycle box breathing session with pause, resume and a summary', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)

    await page.locator('h1').click()
    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Inhale')
    await expect(sessionTime(page)).toHaveText('0:00')

    // Box breathing: 4s inhale, 4s hold, 4s exhale, 4s hold, then again.
    const expected: [number, string][] = [[2000, 'Inhale'], [4000, 'Hold'], [4000, 'Exhale'], [4000, 'Hold'], [4000, 'Inhale'], [4000, 'Hold'], [4000, 'Exhale']]
    for (const [ms, label] of expected) {
      await advance(page, ms)
      await expect(phase(page)).toHaveText(label)
    }
    await expect(sessionTime(page)).toHaveText('0:26')
    await expect(page.getByTestId('phase-progress')).toHaveAttribute('style', /width: 5\d(\.\d+)?%/)

    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Paused')
    await advance(page, 30_000)
    await expect(sessionTime(page)).toHaveText('0:26')

    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Exhale')
    await advance(page, 2000)
    await expect(phase(page)).toHaveText('Hold')
    await expect(sessionTime(page)).toHaveText('0:28')

    await page.keyboard.press('Escape')
    await expect(app(page).getByRole('heading', { name: 'Well done.' })).toBeVisible()
    await expect(app(page)).toContainText('You spent 28 seconds breathing.')
    await expect(app(page)).toContainText('Pattern: Box Breathing')
    await expect(page.getByRole('button', { name: 'Breathe Again' })).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Begin Breathing' })).toBeVisible()
    expect(errors).toEqual([])
  })

  const timelines: { name: RegExp; marks: [number, string][] }[] = [
    { name: /4-7-8/, marks: [[3900, 'Inhale'], [200, 'Hold'], [7000, 'Exhale'], [8000, 'Inhale']] },
    { name: /Coherent/, marks: [[5400, 'Inhale'], [200, 'Exhale'], [5400, 'Inhale']] },
    { name: /Physiological Sigh/, marks: [[1400, 'Inhale'], [200, 'Inhale deeply'], [2400, 'Exhale slowly'], [7000, 'Inhale']] },
  ]
  for (const { name, marks } of timelines) {
    test(`${name.source} follows its phase timings`, async ({ page }) => {
      await openGame(page)
      await startPattern(page, name)
      await expect(phase(page)).toHaveText('Inhale')
      for (const [ms, label] of marks) {
        await advance(page, ms)
        await expect(phase(page)).toHaveText(label)
      }
      await page.getByRole('button', { name: 'End breathing session' }).click()
      await expect(app(page)).toContainText('Well done.')
    })
  }

  test('switching pattern mid-session starts the new pattern from its first breath', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 9000)
    await expect(phase(page)).toHaveText('Exhale')

    await page.getByRole('button', { name: 'End breathing session' }).click()
    await page.getByRole('button', { name: 'Breathe Again' }).click()
    await startPattern(page, /Coherent/)
    await expect(app(page)).toContainText('Coherent Breathing')
    await expect(phase(page)).toHaveText('Inhale')
    await expect(sessionTime(page)).toHaveText('0:00')
    await advance(page, 6000)
    await expect(phase(page)).toHaveText('Exhale')
  })

  test('free breathing counts breaths from the button, the visual and the Space key', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Free Breathing/)
    await expect(phase(page)).toHaveText('Breathe at your own pace')

    await page.getByRole('button', { name: 'Mark a breath' }).click()
    await advance(page, 4000)
    await page.getByRole('img', { name: /Breathing visualization/ }).click()
    await advance(page, 4000)
    await page.locator('h1').click()
    await page.keyboard.press(' ')
    await expect(app(page)).toContainText('3 breaths marked')
    await expect(sessionTime(page)).toHaveText('0:08')

    await page.keyboard.press('Escape')
    await expect(app(page)).toContainText('You spent 8 seconds breathing.')
    await expect(app(page)).toContainText('3 breaths marked.')
  })

  test('regression: a hidden tab pauses the session instead of jumping ahead', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 5000)
    await expect(phase(page)).toHaveText('Hold')

    await hideTab(page, true)
    await advance(page, 60_000)
    await hideTab(page, false)
    await expect(phase(page)).toHaveText('Paused')
    await expect(sessionTime(page)).toHaveText('0:05')

    await page.getByRole('button', { name: 'Resume session' }).click()
    await expect(phase(page)).toHaveText('Hold')
    await advance(page, 3500)
    await expect(phase(page)).toHaveText('Exhale')
    await expect(sessionTime(page)).toHaveText('0:08')
  })

  test('regression: Space on the focused Pause button toggles once', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 1000)

    await page.getByRole('button', { name: 'Pause session' }).focus()
    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Paused')
    await expect(page.getByRole('button', { name: 'Resume session' })).toBeFocused()

    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Inhale')

    await page.getByRole('button', { name: 'End breathing session' }).focus()
    await page.keyboard.press(' ')
    await expect(app(page)).toContainText('Well done.')
  })

  test('regression: arrow keys only move through the pattern list when it is focused', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 })
    await openGame(page)

    await page.locator('h1').click()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('radio', { name: /Box Breathing/ })).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('radio', { name: /Box Breathing/ }).focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('radio', { name: /4-7-8/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('radio', { name: /4-7-8/ })).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('radio', { name: /Free Breathing/ })).toBeFocused()

    // Space on a focused pattern selects it rather than starting.
    await page.getByRole('radio', { name: /Coherent/ }).focus()
    await page.keyboard.press(' ')
    await expect(page.getByRole('radio', { name: /Coherent/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('button', { name: 'Begin Breathing' })).toBeVisible()
  })

  test('leaving mid-session stops cleanly', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 3000)
    await page.getByRole('link', { name: /Back Home/ }).click()
    await expect(page).toHaveURL(/\/$/)
    await advance(page, 5000)
    expect(errors).toEqual([])
  })
})

test.describe('The Harmonist with reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('regression: the guide keeps time without the animated canvas', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)
    await page.getByRole('button', { name: 'Begin Breathing' }).tap()
    await expect(page.locator('canvas[role="img"]')).toHaveCount(0)
    await expect(page.getByRole('img', { name: 'Breathing visualization - Inhale' })).toBeVisible()

    await advance(page, 6000)
    await expect(phase(page)).toHaveText('Hold')
    await expect(page.getByRole('img', { name: 'Breathing visualization - Hold' })).toBeVisible()
    await expect(sessionTime(page)).toHaveText('0:06')
    await advance(page, 20_000)
    await expect(phase(page)).toHaveText('Exhale')

    await page.getByRole('button', { name: 'End breathing session' }).tap()
    await expect(app(page)).toContainText('You spent 26 seconds breathing.')

    await page.getByRole('button', { name: 'Breathe Again' }).tap()
    await page.getByRole('radio', { name: /Free Breathing/ }).tap()
    await page.getByRole('button', { name: 'Begin Breathing' }).tap()
    await page.getByRole('img', { name: /Breathing visualization/ }).tap()
    await expect(app(page)).toContainText('1 breath marked')
    expect(errors).toEqual([])
  })
})
