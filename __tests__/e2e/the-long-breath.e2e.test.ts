import { test, expect, type Page } from '@playwright/test'

/**
 * The Patient One (/games/the-long-breath): five moments of unhurried noticing, each ending
 * in a reflection of what the player actually did. A fake clock drives every test, so
 * durations are checked exactly.
 */

const MENU_HEADING = 'Choose a moment to savor'
const REWARD_HEADING = 'Moment savored'

const URL = '/games/the-long-breath'
const T0 = new Date('2026-11-21T10:00:00').getTime()
const CHIME_HZ = 659.25

const MOMENTS: { title: string; description: string; seconds: number; label: string; reflection: string }[] = [
  { title: 'Watch the Seeds', description: 'They settle only while you stay still.', seconds: 40, label: '40 still seconds', reflection: 'All eight seeds settled, and you did not move once.' },
  { title: 'Listen to Silence', description: 'Listen to what is already here.', seconds: 60, label: '60 seconds', reflection: 'What did you hear?' },
  { title: 'Look at One Thing', description: 'Give one thing near you a whole minute.', seconds: 60, label: '60 seconds', reflection: 'You gave one thing a whole minute. Most things get a glance.' },
  { title: 'Notice This Moment', description: 'How are you, right now?', seconds: 45, label: '45 seconds', reflection: 'You stayed with this moment for 45 seconds without needing to name it. That counts.' },
  { title: 'Count Three Things', description: 'Three things you appreciate today.', seconds: 50, label: '50 seconds', reflection: 'You gave fifty seconds to what is good today, written down or not.' },
]

function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

// Records the pitch of every oscillator the page starts, from any source.
async function recordTones(page: Page) {
  await page.addInitScript(() => {
    const tones: number[] = []
    Object.assign(window, { __tones: tones })
    const start = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (this: OscillatorNode, when?: number) {
      tones.push(this.frequency.value)
      return start.call(this, when)
    }
  })
}

const tones = (page: Page) => page.evaluate(() => (window as unknown as { __tones: number[] }).__tones)
const heardChime = async (page: Page) => (await tones(page)).some((hz) => Math.abs(hz - CHIME_HZ) < 0.01)

async function openGame(page: Page, startAt = T0) {
  await page.route('**/api/game-events', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/site-visits', (route) => route.fulfill({ status: 204 }))
  await page.clock.install({ time: startAt })
  await page.goto(URL)
  await expect(page.getByRole('heading', { name: MENU_HEADING })).toBeVisible()
  // The saved list is read back after hydration; wait for that before playing.
  await page.waitForFunction(() => document.querySelector('h2')?.getAttribute('tabindex') === '-1')
  await page.clock.pauseAt(startAt + 60_000)
}

// The countdown is derived from wall-clock time, so jumping the clock is equivalent to waiting.
async function advance(page: Page, ms: number) {
  await page.clock.fastForward(ms)
  await page.clock.runFor(250)
}

async function turnSoundOn(page: Page) {
  await advance(page, 2500) // the sound button fades in after two seconds
  const toggle = page.getByRole('button', { name: 'Ambient sound' })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
}

const taskButton = (page: Page, title: string) => page.getByRole('button', { name: new RegExp(`^${title}:`) })
const timer = (page: Page) => page.getByRole('timer')
const savoredList = (page: Page) => page.getByRole('list', { name: 'Moments savored today' })

test.describe('The Patient One', () => {
  test('patiently completing all five moments, with every duration enforced as shown', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)

    for (const [index, moment] of MOMENTS.entries()) {
      await expect(taskButton(page, moment.title)).toContainText(moment.label)
      await taskButton(page, moment.title).click()
      await expect(page.getByRole('heading', { name: moment.title })).toBeFocused()
      const m = Math.floor(moment.seconds / 60)
      await expect(timer(page)).toHaveText(`${m}:${String(moment.seconds % 60).padStart(2, '0')}`)

      // Not a moment early: with under a second left the moment is still running.
      await advance(page, moment.seconds * 1000 - 900)
      await expect(timer(page)).toHaveText('0:01')
      await advance(page, 900)

      await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeFocused()
      await expect(page.getByText(moment.reflection)).toBeVisible()
      await page.getByRole('button', { name: 'Continue slowing down' }).click()
      await expect(taskButton(page, moment.title)).toHaveAccessibleName(/Savored today\.$/)
      await expect(savoredList(page).getByRole('listitem')).toHaveText(MOMENTS.slice(0, index + 1).map((x) => x.title))
    }

    // Which moments were visited, never a tally.
    await expect(page.getByText('Today you spent time with')).toBeVisible()
    await expect(page.getByText(/\d+ moments?/)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('breathing is left to The Harmonist: no breathing moment, no poster quotes', async ({ page }) => {
    await openGame(page)
    for (const moment of MOMENTS) await expect(taskButton(page, moment.title)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Just Breathe/ })).toHaveCount(0)
    await taskButton(page, 'Look at One Thing').click()
    await expect(page.getByRole('img', { name: /Breathing circle/ })).toHaveCount(0)
    await advance(page, 60_000)
    const reward = page.getByRole('heading', { name: REWARD_HEADING }).locator('..')
    await expect(reward).toBeVisible()
    await expect(reward).not.toContainText(/[“”]/)
  })

  test('card labels read cleanly, with one full stop between parts', async ({ page }) => {
    await openGame(page)
    for (const moment of MOMENTS) {
      await expect(taskButton(page, moment.title)).toHaveAccessibleName(`${moment.title}: ${moment.description} ${moment.label}.`)
    }
  })

  test('the seeds settle only while you stay still, and moving never undoes them', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Watch the Seeds').click()
    const field = page.getByRole('img', { name: /seeds settled/ })

    await advance(page, 20_000)
    await expect(timer(page)).toHaveText('0:20')
    await expect(field).toHaveAccessibleName('4 of 8 seeds settled')
    await expect(field.locator('[data-settled="true"]')).toHaveCount(4)

    // Five seconds of fidgeting: the clock and the seeds wait, nothing is lost.
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(200 + (i % 2) * 300, 300)
      await advance(page, 1000)
    }
    await expect(page.getByText('The seeds wait while you move.')).toBeVisible()
    await expect(timer(page)).toHaveText('0:20')
    await expect(field).toHaveAccessibleName('4 of 8 seeds settled')

    // A key press stirs them too, as a separate moment of movement.
    await advance(page, 3000)
    await expect(page.getByText('The seeds wait while you move.')).toHaveCount(0)
    await page.keyboard.press('Shift')
    await expect(page.getByText('The seeds wait while you move.')).toBeVisible()

    await advance(page, 25_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeFocused()
    await expect(page.getByText('All eight seeds settled. You stirred them twice, and each time they waited for you.')).toBeVisible()
  })

  test('without sound the listener keeps their eyes soft and open, and nothing makes a sound', async ({ page }) => {
    await recordTones(page)
    await openGame(page)
    await taskButton(page, 'Listen to Silence').click()
    await expect(page.getByText('Soften your gaze and let it rest low. The screen will change when the minute is over.')).toBeVisible()
    await expect(page.getByText(/close your eyes/i)).toHaveCount(0)
    await advance(page, 60_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
    expect(await tones(page)).toEqual([])
  })

  test('with sound turned on, one soft chime marks the end of the listening minute', async ({ page }) => {
    await recordTones(page)
    await openGame(page)
    await turnSoundOn(page)
    await taskButton(page, 'Listen to Silence').click()
    await expect(page.getByText('Close your eyes if you like. A soft chime will mark the end.')).toBeVisible()

    await advance(page, 59_000)
    expect(await heardChime(page)).toBe(false)
    await advance(page, 1000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
    expect(await heardChime(page)).toBe(true)
  })

  test('sound muted in the accessibility panel means no chime, even with the sound button on', async ({ page }) => {
    await recordTones(page)
    await page.addInitScript(() => localStorage.setItem('verygoodmelon:accessibility:settings', JSON.stringify({ muted: true })))
    await openGame(page)
    await turnSoundOn(page)
    await taskButton(page, 'Listen to Silence').click()
    await expect(page.getByText(/Soften your gaze/)).toBeVisible()
    await advance(page, 60_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
    expect(await heardChime(page)).toBe(false)
  })

  test('what you heard is reflected back, and "almost nothing" stands on its own', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Listen to Silence').click()
    await advance(page, 60_000)
    const heard = page.getByRole('group', { name: 'What did you hear?' })
    await heard.getByRole('button', { name: 'Birds' }).click()
    await heard.getByRole('button', { name: 'A hum or fan' }).click()
    await heard.getByRole('button', { name: 'My own breath' }).click()
    await expect(page.getByText('You heard birds, a hum or fan and your own breath. Most of the day, they go unheard.')).toBeVisible()

    await heard.getByRole('button', { name: 'Almost nothing' }).click()
    await expect(heard.getByRole('button', { name: 'Birds' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('Almost nothing. That kind of quiet is rarer than it sounds.')).toBeVisible()
  })

  test('the one thing you looked at is named in the reflection', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Look at One Thing').click()
    await page.getByRole('textbox', { name: /What are you looking at/ }).fill('the blue mug')
    await advance(page, 60_000)
    await expect(page.getByText('You gave the blue mug a whole minute. Most things get a glance.')).toBeVisible()
  })

  test('the words chosen while noticing are given back, gently', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Notice This Moment').click()
    await page.getByRole('group', { name: 'In your body' }).getByRole('button', { name: 'Tense' }).click()
    await page.getByRole('group', { name: 'In your mind' }).getByRole('button', { name: 'Busy' }).click()
    await advance(page, 45_000)
    await expect(page.getByText('Right now: tense and busy. Naming a feeling often loosens it a little.')).toBeVisible()

    await page.getByRole('button', { name: 'Stay a little longer' }).click()
    await page.getByRole('button', { name: 'Content' }).click()
    await advance(page, 45_000)
    await expect(page.getByText('Right now: content. Good to know this is here too.')).toBeVisible()
  })

  test('three things noted while counting are shown back and never stored', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Count Three Things').click()
    await page.getByRole('textbox', { name: 'First thing' }).fill('Morning light')
    await page.getByRole('textbox', { name: 'Third thing' }).fill('A friend who called')
    await advance(page, 50_000)

    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeFocused()
    await expect(page.getByText('Today you noticed')).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: /Morning light|A friend who called/ })).toHaveText(['Morning light', 'A friend who called'])
    const stored = await page.evaluate(() => JSON.stringify(localStorage))
    expect(stored).not.toContain('Morning light')
  })

  test('rushing out early is gentle and records nothing', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Look at One Thing').click()
    await advance(page, 3000)
    await page.getByRole('button', { name: 'Stop current task' }).click()

    await expect(page.getByRole('heading', { name: MENU_HEADING })).toBeFocused()
    await expect(page.getByText('Today you spent time with')).toHaveCount(0)
    await expect(taskButton(page, 'Look at One Thing')).not.toHaveAccessibleName(/Savored/)

    // Starting again begins from the full time.
    await taskButton(page, 'Look at One Thing').click()
    await expect(timer(page)).toHaveText('1:00')
  })

  test('time away from the tab does not count: the moment waits and welcomes you back', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Listen to Silence').click()
    await advance(page, 10_000)
    await expect(timer(page)).toHaveText('0:50')

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await advance(page, 120_000)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(timer(page)).toHaveText('0:50')
    await expect(page.getByText('Welcome back. The moment waited for you.')).toBeVisible()
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toHaveCount(0)

    await advance(page, 49_000)
    await expect(timer(page)).toHaveText('0:01')
    await advance(page, 1_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
  })

  test('staying a little longer repeats the moment without listing it twice', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Look at One Thing').click()
    await advance(page, 60_000)
    await page.getByRole('button', { name: 'Stay a little longer' }).click()
    await expect(page.getByRole('heading', { name: 'Look at One Thing' })).toBeFocused()
    await expect(timer(page)).toHaveText('1:00')
    await advance(page, 60_000)
    await page.getByRole('button', { name: 'Continue slowing down' }).click()
    await expect(savoredList(page).getByRole('listitem')).toHaveText(['Look at One Thing'])
  })

  test('regression: moments savored today survive a reload but not midnight', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Notice This Moment').click()
    await advance(page, 45_000)
    await page.getByRole('button', { name: 'Continue slowing down' }).click()
    await expect(savoredList(page).getByRole('listitem')).toHaveText(['Notice This Moment'])

    await page.reload()
    await expect(savoredList(page).getByRole('listitem')).toHaveText(['Notice This Moment'])
    await expect(taskButton(page, 'Notice This Moment')).toHaveAccessibleName(/Savored today\.$/)

    await page.clock.setFixedTime(new Date('2026-11-22T09:00:00'))
    await page.reload()
    await expect(page.getByRole('heading', { name: MENU_HEADING })).toBeVisible()
    await expect(taskButton(page, 'Notice This Moment')).not.toHaveAccessibleName(/Savored/)
    await expect(page.getByText('Today you spent time with')).toHaveCount(0)
  })

  test('a broken saved list is ignored', async ({ page }) => {
    const errors = collectPageErrors(page)
    await page.addInitScript(() => localStorage.setItem('verygoodmelon:unrusher-today', '{oops'))
    await openGame(page)
    await expect(page.getByText('Today you spent time with')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('a list saved before the breathing moment was retired shows only the moments that remain', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('verygoodmelon:unrusher-today', JSON.stringify({ day: '2026-11-21', completed: ['breathe', 'watch'] })))
    await openGame(page)
    await expect(savoredList(page).getByRole('listitem')).toHaveText(['Watch the Seeds'])
  })

  test('keyboard only: start, stop and finish a moment', async ({ page }) => {
    await openGame(page)
    await page.locator('h1').click()
    let reached = false
    for (let i = 0; i < 30 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await taskButton(page, 'Listen to Silence').evaluate((el) => el === document.activeElement)
    }
    expect(reached).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Listen to Silence' })).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Stop current task' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: MENU_HEADING })).toBeFocused()

    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(taskButton(page, 'Listen to Silence')).toBeFocused()
    await page.keyboard.press(' ')
    await advance(page, 60_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeFocused()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Birds' })).toBeFocused()
    await page.keyboard.press(' ')
    await expect(page.getByText('You heard birds. Most of the day, they go unheard.')).toBeVisible()
  })
})

test.describe('The Patient One on a phone with reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('the seeds rest still, settle into the bed, and the moment still completes', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Watch the Seeds').tap()
    const field = page.getByRole('img', { name: /seeds settled/ })
    await expect(field).toBeVisible()
    await expect(field.locator('.animate-float-seed')).toHaveCount(0)
    await expect(field.locator('div')).toHaveCount(8)

    await advance(page, 25_000)
    await expect(field.locator('[data-settled="true"]')).toHaveCount(5)
    await expect(field.locator('.animate-fade')).toHaveCount(0)
    await advance(page, 15_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
  })

  test('a phone can offer a gentle buzz at the end of the listening minute', async ({ page }) => {
    await page.addInitScript(() => {
      const calls: unknown[] = []
      Object.assign(window, { __buzzes: calls })
      navigator.vibrate = (pattern: VibratePattern) => {
        calls.push(pattern)
        return true
      }
    })
    await openGame(page)
    await taskButton(page, 'Listen to Silence').tap()
    const offer = page.getByRole('button', { name: 'Buzz when it ends' })
    await expect(offer).toHaveAttribute('aria-pressed', 'false')
    await offer.tap()
    await expect(offer).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Close your eyes if you like. A gentle buzz will mark the end.')).toBeVisible()

    await advance(page, 60_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { __buzzes: unknown[] }).__buzzes)).toEqual([[80, 120, 80]])
  })
})
