import { test, expect, type Page } from '@playwright/test'

/**
 * The Patient One (/games/the-long-breath): five timed moments of stillness, each ending in a
 * small reward. A fake clock drives every test, so durations are checked exactly.
 */

const URL = '/games/the-long-breath'
const T0 = new Date('2026-11-21T10:00:00').getTime()

const TASKS: { title: string; seconds: number; reward: string }[] = [
  { title: 'Just Breathe', seconds: 60, reward: 'Inhale peace. Exhale worry.' },
  { title: 'Watch the Seeds', seconds: 45, reward: 'Some things cannot be hurried.' },
  { title: 'Listen to Silence', seconds: 60, reward: 'In stillness, we find clarity.' },
  { title: 'Notice This Moment', seconds: 45, reward: 'This moment is all we truly have.' },
  { title: 'Count Three Things', seconds: 50, reward: 'Gratitude slows time beautifully.' },
]

function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

async function openGame(page: Page, startAt = T0) {
  await page.route('**/api/game-events', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/site-visits', (route) => route.fulfill({ status: 204 }))
  await page.clock.install({ time: startAt })
  await page.goto(URL)
  await expect(page.getByRole('heading', { name: 'The Anti-Game' })).toBeVisible()
  // The saved count is read back after hydration; wait for that before playing.
  await page.waitForFunction(() => document.querySelector('h2')?.getAttribute('tabindex') === '-1')
  await page.clock.pauseAt(startAt + 60_000)
}

// The countdown is derived from wall-clock time, so jumping the clock is equivalent to waiting.
async function advance(page: Page, ms: number) {
  await page.clock.fastForward(ms)
  await page.clock.runFor(250)
}

const taskButton = (page: Page, title: string) => page.getByRole('button', { name: new RegExp(`^${title}:`) })
const timer = (page: Page) => page.getByRole('timer')

test.describe('The Patient One', () => {
  test('patiently completing all five moments, with every duration enforced as shown', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)

    for (const [index, task] of TASKS.entries()) {
      await expect(taskButton(page, task.title)).toContainText(`${task.seconds} seconds`)
      await taskButton(page, task.title).click()
      await expect(page.getByRole('heading', { name: task.title })).toBeFocused()
      const m = Math.floor(task.seconds / 60)
      await expect(timer(page)).toHaveText(`${m}:${String(task.seconds % 60).padStart(2, '0')}`)

      // Not a moment early: with under a second left the task is still running.
      await advance(page, task.seconds * 1000 - 900)
      await expect(timer(page)).toHaveText('0:01')
      await advance(page, 900)

      await expect(page.getByRole('heading', { name: 'You Did It' })).toBeFocused()
      await expect(page.getByText(`“${task.reward}”`)).toBeVisible()
      const n = index + 1
      await expect(page.getByText(`${n} ${n === 1 ? 'moment' : 'moments'} savored today`)).toBeVisible()
      await page.getByRole('button', { name: 'Continue Slowing Down' }).click()
      await expect(taskButton(page, task.title)).toHaveAccessibleName(/Completed\.$/)
    }

    await expect(page.getByText('You’ve savored 5 moments today')).toBeVisible()
    await expect(page.getByText('Every moment here has been savored.')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('the breathing circle follows 4-7-8 with a short rest, cycle after cycle', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Just Breathe').click()
    const circle = page.getByRole('img', { name: /Breathing circle/ })

    const marks: [number, string, string][] = [
      [1000, 'inhale', 'Breathe in slowly...'],
      [4000, 'hold', 'Hold gently...'],
      [7000, 'exhale', 'Release everything...'],
      [6500, 'pause', 'Feel the stillness...'],
      [1000, 'inhale', 'Breathe in slowly...'],
      [20_000, 'inhale', 'Breathe in slowly...'],
    ]
    for (const [ms, breath, guidance] of marks) {
      await advance(page, ms)
      await expect(circle).toHaveAccessibleName(`Breathing circle - ${breath}`)
      await expect(page.getByText(guidance)).toBeVisible()
    }
  })

  test('rushing out early is gentle and records nothing', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Watch the Seeds').click()
    await advance(page, 3000)
    await page.getByRole('button', { name: 'Stop current task' }).click()

    await expect(page.getByRole('heading', { name: 'The Anti-Game' })).toBeFocused()
    await expect(page.getByText(/savored/)).toHaveCount(0)
    await expect(taskButton(page, 'Watch the Seeds')).not.toHaveAccessibleName(/Completed/)

    // Starting again begins from the full time.
    await taskButton(page, 'Watch the Seeds').click()
    await expect(timer(page)).toHaveText('0:45')
  })

  test('regression: time away from the tab still counts, so the timer never stalls', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Listen to Silence').click()
    await advance(page, 10_000)
    await expect(timer(page)).toHaveText('0:50')

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.clock.fastForward(30_000)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(timer(page)).toHaveText('0:20')
    await advance(page, 20_000)
    await expect(page.getByRole('heading', { name: 'You Did It' })).toBeVisible()
  })

  test('regression: moments savored today survive a reload but not midnight', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Notice This Moment').click()
    await advance(page, 45_000)
    await page.getByRole('button', { name: 'Continue Slowing Down' }).click()
    await expect(page.getByText('You’ve savored 1 moment today')).toBeVisible()

    await page.reload()
    await expect(page.getByText('You’ve savored 1 moment today')).toBeVisible()
    await expect(taskButton(page, 'Notice This Moment')).toHaveAccessibleName(/Completed\.$/)

    await page.clock.setFixedTime(new Date('2026-11-22T09:00:00'))
    await page.reload()
    await expect(page.getByRole('heading', { name: 'The Anti-Game' })).toBeVisible()
    await expect(taskButton(page, 'Notice This Moment')).not.toHaveAccessibleName(/Completed/)
    await expect(page.getByText(/savored/)).toHaveCount(0)
  })

  test('a broken saved count is ignored', async ({ page }) => {
    const errors = collectPageErrors(page)
    await page.addInitScript(() => localStorage.setItem('verygoodmelon:unrusher-today', '{oops'))
    await openGame(page)
    await expect(page.getByText(/savored/)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('keyboard only: start, stop and finish a moment', async ({ page }) => {
    await openGame(page)
    await page.locator('h1').click()
    let reached = false
    for (let i = 0; i < 30 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await taskButton(page, 'Just Breathe').evaluate((el) => el === document.activeElement)
    }
    expect(reached).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Just Breathe' })).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Stop current task' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'The Anti-Game' })).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(taskButton(page, 'Just Breathe')).toBeFocused()
    await page.keyboard.press(' ')
    await advance(page, 60_000)
    await expect(page.getByRole('heading', { name: 'You Did It' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Continue Slowing Down' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByText('You’ve savored 1 moment today')).toBeVisible()
  })
})

test.describe('The Patient One with reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('the seeds rest still and the moment still completes', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Watch the Seeds').tap()
    const field = page.getByRole('img', { name: 'Watermelon seeds resting' })
    await expect(field).toBeVisible()
    await expect(field.locator('.animate-float-seed')).toHaveCount(0)
    await expect(field.locator('div')).toHaveCount(8)

    await advance(page, 45_000)
    await expect(page.getByRole('heading', { name: 'You Did It' })).toBeVisible()
  })
})
