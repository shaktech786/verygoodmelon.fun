import { test, expect, type Page } from '@playwright/test'

/**
 * The Harmonist (/games/the-still-point): guided breathing drawn on a canvas, where every
 * finished breath sets a seed in the melon and, with sound on, each turn of the breath sounds
 * a note of one chord. Every test drives a fake clock, so phase timing is asserted exactly.
 */

const URL = '/games/the-still-point'
const IN_HZ = 329.63
const HOLD_HZ = 523.25
const OUT_HZ = 392

async function stubSiteApis(page: Page) {
  await page.route('**/api/game-events', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/site-visits', (route) => route.fulfill({ status: 204 }))
}

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
const cues = async (page: Page) =>
  (await tones(page)).flatMap((hz) => [IN_HZ, HOLD_HZ, OUT_HZ].filter((cue) => Math.abs(hz - cue) < 0.01))

const T0 = new Date('2026-11-21T10:00:00').getTime()

async function openGame(page: Page) {
  await stubSiteApis(page)
  await page.clock.install({ time: T0 })
  await page.goto(URL)
  await expect(page.getByRole('button', { name: 'Begin breathing' })).toBeVisible()
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

async function turnSoundOn(page: Page) {
  await advance(page, 2500) // the sound button fades in after two seconds
  const toggle = page.getByRole('button', { name: 'Ambient sound' })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
}

const guide = (page: Page) => page.getByRole('region', { name: 'Breathing guide' })
const phase = (page: Page) => guide(page).getByRole('heading', { level: 2 })
const sessionTime = (page: Page) => guide(page).getByRole('timer')

async function startPattern(page: Page, name: RegExp) {
  await page.getByRole('radio', { name }).click()
  await page.getByRole('button', { name: 'Begin breathing' }).click()
  await expect(phase(page)).toBeVisible()
}

async function hideTab(page: Page, hidden: boolean) {
  await page.evaluate((isHidden) => {
    Object.defineProperty(document, 'visibilityState', { value: isHidden ? 'hidden' : 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
}

test.describe('The Harmonist', () => {
  test('a full multi-cycle box breathing session with pause, resume and a gathered ending', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)

    await page.locator('h1').click()
    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Inhale')
    await expect(sessionTime(page)).toHaveText('0:00')
    await expect(guide(page)).toContainText('0 seeds so far')

    // Box breathing: 4s inhale, 4s hold, 4s exhale, 4s hold, then again.
    const expected: [number, string][] = [[2000, 'Inhale'], [4000, 'Hold'], [4000, 'Exhale'], [4000, 'Hold'], [4000, 'Inhale'], [4000, 'Hold'], [4000, 'Exhale']]
    for (const [ms, label] of expected) {
      await advance(page, ms)
      await expect(phase(page)).toHaveText(label)
    }
    await expect(sessionTime(page)).toHaveText('0:26')
    await expect(guide(page)).toContainText('1 seed so far')
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
    await expect(guide(page).getByRole('heading', { name: 'Your breaths, gathered' })).toBeVisible()
    await expect(guide(page)).toContainText('You spent 28 seconds breathing.')
    await expect(guide(page)).toContainText('Each seed is a breath you finished: 1 in all.')
    await expect(guide(page)).toContainText('Pattern: Box Breathing')
    await expect(guide(page).getByRole('img', { name: 'A melon holding 1 seed, one for each breath' })).toBeVisible()
    await expect(guide(page)).not.toContainText('Well done')
    await expect(page.getByRole('button', { name: 'Breathe again' })).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Begin breathing' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('regression: no part of the game is an application region, so reading mode keeps working', async ({ page }) => {
    await openGame(page)
    await expect(page.locator('[role="application"]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Begin breathing' }).click()
    await expect(page.locator('[role="application"]')).toHaveCount(0)
    await page.getByRole('button', { name: 'End breathing session' }).click()
    await expect(page.locator('[role="application"]')).toHaveCount(0)
  })

  const timelines: { name: RegExp; marks: [number, string][] }[] = [
    { name: /4-7-8/, marks: [[3900, 'Inhale'], [200, 'Hold'], [7000, 'Exhale'], [8000, 'Inhale']] },
    { name: /Coherent/, marks: [[5400, 'Inhale'], [200, 'Exhale'], [5400, 'Inhale']] },
    { name: /Physiological Sigh/, marks: [[1400, 'Inhale'], [200, 'Inhale deeply'], [2400, 'Exhale slowly'], [7000, 'Inhale']] },
  ]
  for (const { name, marks } of timelines) {
    test(`${name.source} follows its phase timings and sets one seed per breath`, async ({ page }) => {
      await openGame(page)
      await startPattern(page, name)
      await expect(phase(page)).toHaveText('Inhale')
      for (const [ms, label] of marks) {
        await advance(page, ms)
        await expect(phase(page)).toHaveText(label)
      }
      await expect(guide(page)).toContainText('1 seed so far')
      await page.getByRole('button', { name: 'End breathing session' }).click()
      await expect(guide(page)).toContainText('Each seed is a breath you finished: 1 in all.')
    })
  }

  test('ending before a single breath is finished is met without judgement', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 3000)
    await page.getByRole('button', { name: 'End breathing session' }).click()
    await expect(guide(page).getByRole('heading', { name: 'A short pause' })).toBeVisible()
    await expect(guide(page)).toContainText('You spent 3 seconds breathing.')
    await expect(guide(page)).not.toContainText('Each seed')
  })

  test('starting a new pattern after a session begins from its first breath', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 9000)
    await expect(phase(page)).toHaveText('Exhale')

    await page.getByRole('button', { name: 'End breathing session' }).click()
    await page.getByRole('button', { name: 'Breathe again' }).click()
    await startPattern(page, /Coherent/)
    await expect(guide(page)).toContainText('Coherent Breathing')
    await expect(phase(page)).toHaveText('Inhale')
    await expect(sessionTime(page)).toHaveText('0:00')
    await expect(guide(page)).toContainText('0 seeds so far')
    await advance(page, 6000)
    await expect(phase(page)).toHaveText('Exhale')
  })

  test('changing rhythm mid-session keeps the clock, the seeds, and starts the new pattern on an inhale', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 17_000)
    await expect(guide(page)).toContainText('1 seed so far')

    const rhythm = page.getByRole('radiogroup', { name: 'Change rhythm' })
    await rhythm.getByRole('radio', { name: 'Coherent' }).click()
    await expect(rhythm.getByRole('radio', { name: 'Coherent' })).toHaveAttribute('aria-checked', 'true')
    await expect(phase(page)).toHaveText('Inhale')
    await expect(sessionTime(page)).toHaveText('0:17')
    await advance(page, 6000)
    await expect(phase(page)).toHaveText('Exhale')
    await expect(sessionTime(page)).toHaveText('0:23')
    await advance(page, 5100)
    await expect(guide(page)).toContainText('2 seeds so far')

    // Arrow keys move through the rhythms too.
    await rhythm.getByRole('radio', { name: 'Coherent' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(rhythm.getByRole('radio', { name: 'Physiological Sigh' })).toBeFocused()
    await expect(phase(page)).toHaveText('Inhale')

    await page.getByRole('button', { name: 'End breathing session' }).click()
    await expect(guide(page)).toContainText('Patterns: Box Breathing, Coherent Breathing, Physiological Sigh')
    await expect(guide(page)).toContainText('2 in all.')
  })

  test('a timed session finishes the breath in progress, then asks how you feel', async ({ page }) => {
    await openGame(page)
    await page.getByRole('radio', { name: '1 min' }).click()
    await startPattern(page, /Box Breathing/)
    await expect(guide(page)).toContainText('0:00 of 1:00')

    await advance(page, 61_000)
    await expect(phase(page)).toHaveText('Hold')
    await expect(guide(page)).toContainText('finishing this breath')

    // Box breathing is 16s a cycle, so the fourth breath ends at 1:04.
    await advance(page, 3500)
    await expect(guide(page).getByRole('heading', { name: 'Your breaths, gathered' })).toBeVisible()
    await expect(guide(page)).toContainText('You spent 1 minute and 4 seconds breathing.')
    await expect(guide(page)).toContainText('Each seed is a breath you finished: 4 in all.')
    await expect(guide(page).getByRole('img', { name: 'A melon holding 4 seeds, one for each breath' })).toBeVisible()

    await page.getByRole('button', { name: 'Still tense' }).click()
    await expect(page.getByRole('button', { name: 'Still tense' })).toHaveAttribute('aria-pressed', 'true')
    await expect(guide(page)).toContainText('Physiological Sigh')
    await page.getByRole('button', { name: 'One minute of sighs' }).click()
    await expect(phase(page)).toHaveText('Inhale')
    await expect(guide(page)).toContainText('Physiological Sigh')
    await expect(guide(page)).toContainText('0:00 of 1:00')
  })

  test('an open session keeps going until you end it', async ({ page }) => {
    await openGame(page)
    await page.getByRole('radio', { name: 'Open' }).click()
    await startPattern(page, /Coherent/)
    await advance(page, 10 * 60_000)
    await expect(sessionTime(page)).toHaveText('10:00')
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
    await expect(guide(page)).toContainText('3 breaths marked')
    await expect(sessionTime(page)).toHaveText('0:08')

    await page.keyboard.press('Escape')
    await expect(guide(page)).toContainText('You spent 8 seconds breathing.')
    await expect(guide(page)).toContainText('Each seed is a breath you marked: 3 in all.')
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
    await expect(guide(page).getByRole('heading', { name: 'A short pause' })).toBeVisible()
  })

  test('regression: arrow keys only move through the pattern list when it is focused, and Space chooses', async ({ page }) => {
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

    // Space on a focused pattern chooses it, as a radio button should, without starting.
    await page.getByRole('radio', { name: /Coherent/ }).focus()
    await page.keyboard.press(' ')
    await expect(page.getByRole('radio', { name: /Coherent/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('button', { name: 'Begin breathing' })).toBeVisible()
  })

  test('keyboard only: arrows choose a rhythm and a length, Enter begins, Space pauses, Escape ends', async ({ page }) => {
    await openGame(page)
    await expect(page.getByText('Arrow keys choose. Enter begins.')).toBeVisible()

    await page.locator('h1').click()
    let reached = false
    for (let i = 0; i < 30 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await page.getByRole('radio', { name: /Box Breathing/ }).evaluate((el) => el === document.activeElement)
    }
    expect(reached).toBe(true)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('radio', { name: /Coherent/ })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('radio', { name: '3 min' })).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('radio', { name: '1 min' })).toHaveAttribute('aria-checked', 'true')

    await page.keyboard.press('Enter')
    await expect(guide(page)).toContainText('Coherent Breathing')
    await expect(guide(page)).toContainText('0:00 of 1:00')
    await expect(phase(page)).toHaveText('Inhale')
    await expect(page.getByText('Space pauses. Escape ends.')).toBeVisible()

    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Paused')
    await page.keyboard.press(' ')
    await advance(page, 6000)
    await expect(phase(page)).toHaveText('Exhale')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Breathe again' })).toBeFocused()
  })

  test('Enter on a focused pattern begins that pattern', async ({ page }) => {
    await openGame(page)
    await page.getByRole('radio', { name: /Box Breathing/ }).focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(guide(page)).toContainText('4-7-8 Relaxation')
    await expect(phase(page)).toHaveText('Inhale')
  })

  test('without sound nothing is played, and the page says how to breathe with eyes closed', async ({ page }) => {
    await recordTones(page)
    await openGame(page)
    await expect(page.getByText('Turn on ambient sound to follow along with your eyes closed.')).toBeVisible()
    await startPattern(page, /Box Breathing/)
    for (let i = 0; i < 8; i++) await advance(page, 2000)
    await expect(guide(page)).toContainText('1 seed so far')
    expect(await tones(page)).toEqual([])
  })

  test('with sound on, a note marks every turn of the breath: rising in, high hold, falling out', async ({ page }) => {
    await recordTones(page)
    await openGame(page)
    await turnSoundOn(page)
    await expect(page.getByText('Sound is on: a rising note means breathe in, a falling one means breathe out.')).toBeVisible()
    await startPattern(page, /Box Breathing/)
    await advance(page, 100)
    expect(await cues(page)).toEqual([IN_HZ])
    await advance(page, 4000)
    await advance(page, 4000)
    await advance(page, 4000)
    await advance(page, 4000)
    expect(await cues(page)).toEqual([IN_HZ, HOLD_HZ, OUT_HZ, HOLD_HZ, IN_HZ])

    // A paused guide is silent.
    await page.getByRole('button', { name: 'Pause session' }).click()
    await advance(page, 20_000)
    expect(await cues(page)).toHaveLength(5)
  })

  test('sound muted in the accessibility panel silences the breath notes', async ({ page }) => {
    await recordTones(page)
    await page.addInitScript(() => localStorage.setItem('verygoodmelon:accessibility:settings', JSON.stringify({ muted: true })))
    await openGame(page)
    await turnSoundOn(page)
    await expect(page.getByText('Turn on ambient sound to follow along with your eyes closed.')).toBeVisible()
    await startPattern(page, /Box Breathing/)
    for (let i = 0; i < 4; i++) await advance(page, 4000)
    expect(await cues(page)).toEqual([])
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

test.describe('The Harmonist on a phone with reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('regression: the guide keeps time without the animated canvas, and seeds still gather', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)
    await page.getByRole('button', { name: 'Begin breathing' }).tap()
    await expect(page.locator('canvas[role="img"]')).toHaveCount(0)
    await expect(page.getByRole('img', { name: 'Breathing visualization - Inhale' })).toBeVisible()

    await advance(page, 6000)
    await expect(phase(page)).toHaveText('Hold')
    await expect(page.getByRole('img', { name: 'Breathing visualization - Hold' })).toBeVisible()
    await expect(sessionTime(page)).toHaveText('0:06')
    await advance(page, 20_000)
    await expect(phase(page)).toHaveText('Exhale')
    await expect(page.getByRole('img', { name: /Breathing visualization/ }).locator('ellipse')).toHaveCount(1)

    await page.getByRole('button', { name: 'End breathing session' }).tap()
    await expect(guide(page)).toContainText('You spent 26 seconds breathing.')

    await page.getByRole('button', { name: 'Breathe again' }).tap()
    await page.getByRole('radio', { name: /Free Breathing/ }).tap()
    await page.getByRole('button', { name: 'Begin breathing' }).tap()
    await page.getByRole('img', { name: /Breathing visualization/ }).tap()
    await expect(guide(page)).toContainText('1 breath marked')
    expect(errors).toEqual([])
  })

  test('keyboard hints stay hidden on a touch screen until a key is pressed', async ({ page }) => {
    await openGame(page)
    const hint = page.getByText('Arrow keys choose. Enter begins.')
    await expect(hint).toBeHidden()
    await page.getByRole('button', { name: 'Begin breathing' }).tap()
    await expect(page.getByText('Space pauses. Escape ends.')).toBeHidden()
    await page.keyboard.press('Tab')
    await expect(page.getByText('Space pauses. Escape ends.')).toBeVisible()
  })

  test('a phone can buzz as each breath turns, only when asked', async ({ page }) => {
    await page.addInitScript(() => {
      const calls: unknown[] = []
      Object.assign(window, { __buzzes: calls })
      navigator.vibrate = (pattern: VibratePattern) => {
        calls.push(pattern)
        return true
      }
    })
    const buzzes = () => page.evaluate(() => (window as unknown as { __buzzes: unknown[] }).__buzzes)
    await openGame(page)

    await page.getByRole('button', { name: 'Begin breathing' }).tap()
    await advance(page, 9000)
    expect(await buzzes()).toEqual([])
    await page.getByRole('button', { name: 'End breathing session' }).tap()
    await page.getByRole('button', { name: 'Breathe again' }).tap()

    const offer = page.getByRole('button', { name: 'Buzz as each breath turns' })
    await offer.tap()
    await expect(offer).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Begin breathing' }).tap()
    await advance(page, 100)
    await advance(page, 4000)
    await advance(page, 4000)
    expect(await buzzes()).toEqual([[40], [40, 100, 40]])
  })
})
