import { readFileSync } from 'fs'
import path from 'path'
import { test, expect, type Page } from '@playwright/test'
import { expectKeepsakeSaves } from './helpers/keepsake'
import { ambientSoundIsOn, setAmbientSound } from './helpers/ambient-sound'

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
const STRIP_KEY = 'verygoodmelon:patient-one:today'
const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')

async function axeViolations(page: Page): Promise<string[]> {
  // axe waits on its own timers, so time runs freely from here on
  await page.clock.resume()
  await page.waitForFunction(() => document.getAnimations().every((a) => a.effect?.getTiming().iterations === Infinity || a.playState !== 'running'))
  await page.evaluate(AXE_SOURCE)
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> }
    }).axe
    const result = await axe.run({ include: [['main']], exclude: [['nextjs-portal']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
    return result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`))
  })
}

const MOMENTS: { title: string; description: string; seconds: number; label: string; reflection: string }[] = [
  { title: 'Watch the Seeds', description: 'They settle only while you stay still.', seconds: 40, label: 'A short, still sit', reflection: 'All eight seeds settled, and you did not move once.' },
  { title: 'Listen to Silence', description: 'Listen to what is already here.', seconds: 60, label: 'A longer sit', reflection: 'What did you hear?' },
  { title: 'Look at One Thing', description: 'Give one thing near you a whole minute.', seconds: 60, label: 'A longer sit', reflection: 'You gave one thing a whole minute. Most things get a glance.' },
  { title: 'Notice This Moment', description: 'How are you, right now?', seconds: 45, label: 'A short sit', reflection: 'You stayed with this moment without needing to name it. That counts.' },
  { title: 'Count Three Things', description: 'Three things you appreciate today.', seconds: 50, label: 'A little while', reflection: 'You gave a little while to what is good today, written down or not.' },
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
  await setAmbientSound(page, true)
}

const taskButton = (page: Page, title: string) => page.getByRole('button', { name: new RegExp(`^${title}:`) })
// The moment's progress is a ring with no numbers; its data-progress lets the suite check it exactly
const ring = (page: Page) => page.getByTestId('moment-bloom')
const todayStrip = (page: Page) => page.getByRole('list', { name: 'Moments from today' })
const STRIP_NOTE = 'Each moment you finish rests here until midnight.'

test.describe('The Patient One', () => {
  test('patiently completing all five moments, with every duration enforced as shown', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)

    for (const [index, moment] of MOMENTS.entries()) {
      await expect(taskButton(page, moment.title)).toContainText(moment.label)
      await taskButton(page, moment.title).click()
      await expect(page.getByRole('heading', { name: moment.title })).toBeFocused()
      await expect(ring(page)).toHaveAttribute('data-progress', '0.00')
      await expect(ring(page)).toHaveAccessibleName('The moment has just begun')
      // Nothing counts down on screen
      await expect(page.getByText(/^\d+:\d{2}$/)).toHaveCount(0)

      // Not a moment early: with under a second left the moment is still running.
      await advance(page, moment.seconds * 1000 - 900)
      await expect(ring(page)).toHaveAccessibleName('Most of the way through the moment')
      await advance(page, 900)

      await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeFocused()
      await expect(page.getByText(moment.reflection)).toBeVisible()
      await page.getByRole('button', { name: 'Continue slowing down' }).click()
      await expect(taskButton(page, moment.title)).toHaveAccessibleName(/Savored today\.$/)
      await expect(todayStrip(page).getByRole('listitem')).toHaveCount(index + 1)
      await expect(todayStrip(page).getByRole('listitem').first()).toContainText(moment.title)
    }

    // Which moments were visited, never a tally.
    await expect(page.getByText(STRIP_NOTE)).toBeVisible()
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
    const field = page.getByRole('img', { name: /settled/ })

    await advance(page, 20_000)
    await expect(ring(page)).toHaveAttribute('data-progress', '0.50')
    await expect(ring(page)).toHaveAccessibleName('About halfway through the moment')
    await expect(field).toHaveAccessibleName('Seeds drifting, most settled')
    await expect(field.locator('[data-settled="true"]')).toHaveCount(4)

    // Five seconds of fidgeting: the clock and the seeds wait, nothing is lost.
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(200 + (i % 2) * 300, 300)
      await advance(page, 1000)
    }
    await expect(page.getByText('The seeds wait while you move.')).toBeVisible()
    await expect(ring(page)).toHaveAttribute('data-progress', '0.50')
    await expect(field).toHaveAccessibleName('Seeds drifting, most settled')

    // A key press stirs them too, as a separate moment of movement.
    await advance(page, 3000)
    await expect(page.getByText('The seeds wait while you move.')).toHaveCount(0)
    await page.keyboard.press('Shift')
    await expect(page.getByText('The seeds wait while you move.')).toBeVisible()

    await advance(page, 25_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeFocused()
    await expect(page.getByText('All eight seeds settled. When you stirred them, they waited for you.')).toBeVisible()
    // How often they were stirred is never counted back
    await expect(page.getByText(/twice|once|\d+ times/)).toHaveCount(0)
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
    await expect(page.getByText('Close your eyes if you like. The page’s own sound fades away for this minute, and a soft chime will mark the end.')).toBeVisible()

    await advance(page, 59_000)
    expect(await heardChime(page)).toBe(false)
    await advance(page, 1000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
    expect(await heardChime(page)).toBe(true)
  })

  test('the page’s own rain and hum fade out for the listening minute and come back after', async ({ page }) => {
    // Records every gain ramp target, so the fade of each ambient layer can be read back.
    await page.addInitScript(() => {
      const ramps: number[] = []
      Object.assign(window, { __ramps: ramps })
      const ramp = AudioParam.prototype.linearRampToValueAtTime
      AudioParam.prototype.linearRampToValueAtTime = function (this: AudioParam, value: number, endTime: number) {
        ramps.push(Math.round(value * 1000) / 1000)
        return ramp.call(this, value, endTime)
      }
    })
    const ramps = () => page.evaluate(() => (window as unknown as { __ramps: number[] }).__ramps.splice(0))
    await openGame(page)
    await turnSoundOn(page)
    await ramps()

    await taskButton(page, 'Look at One Thing').click()
    await advance(page, 2000)
    expect(await ramps()).not.toContain(0)
    await page.getByRole('button', { name: 'Leave early' }).click()

    await taskButton(page, 'Listen to Silence').click()
    await advance(page, 1000)
    // Rain (0.25) and drone (0.1) both fall to silence.
    expect((await ramps()).filter((v) => v === 0)).toHaveLength(2)
    await advance(page, 59_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
    expect(await ramps()).toEqual(expect.arrayContaining([0.25, 0.1]))
    expect(await ambientSoundIsOn(page)).toBe(true)
  })

  test('the last seed settles in view: the reward shows the full bed', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Watch the Seeds').click()
    await advance(page, 40_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeFocused()
    const bed = page.getByRole('img', { name: 'Every seed has settled' })
    await expect(bed).toBeVisible()
    await expect(bed.locator('[data-settled="true"]')).toHaveCount(8)
    await expect(bed.locator('.animate-fade')).toHaveCount(1)
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
    await expect(page.getByText('Almost nothing. That kind of quiet is rarer than it sounds.', { exact: true })).toBeVisible()
  })

  test('the one thing you looked at is named in the reflection', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Look at One Thing').click()
    await page.getByRole('textbox', { name: /What are you looking at/ }).fill('the blue mug')
    await advance(page, 60_000)
    // Words on the page: the time never cuts them off, the player says when they are done.
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'Finish your thought, then press Done.' })).toBeVisible()
    // The whole time was given, so nothing is "early" any more
    await expect(page.getByRole('button', { name: 'Leave early' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Done', exact: true }).click()
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

  test('the time rests while the player is typing', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Count Three Things').click()
    const first = page.getByRole('textbox', { name: 'First thing' })
    await first.click()
    for (const word of ['My', 'sister', 'texting', 'me', 'back']) {
      await first.pressSequentially(`${word} `)
      await advance(page, 4000)
    }
    await expect(page.getByText('The time waits while you write.')).toBeVisible()
    await expect(ring(page)).toHaveAttribute('data-progress', /^0\.(0|1)\d$/)
  })

  test('three things noted while counting are shown back and kept only on this device until midnight', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Count Three Things').click()
    await page.getByRole('textbox', { name: 'First thing' }).fill('Morning light')
    await page.getByRole('textbox', { name: 'Third thing' }).fill('A friend who called')
    await advance(page, 50_000)
    await page.getByRole('button', { name: 'Done', exact: true }).click()

    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeFocused()
    await expect(page.getByText('Today you noticed')).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: /Morning light|A friend who called/ })).toHaveText(['Morning light', 'A friend who called'])
    const stored = await page.evaluate((key) => localStorage.getItem(key), STRIP_KEY)
    expect(stored).toContain('Morning light')

    await page.getByRole('button', { name: 'Continue slowing down' }).click()
    await page.reload()
    await expect(todayStrip(page).getByRole('button', { name: /Count Three Things.*Morning light · A friend who called/ })).toBeVisible()
    await page.clock.setFixedTime(new Date('2026-11-22T00:00:30'))
    await page.reload()
    await expect(page.getByRole('heading', { name: MENU_HEADING })).toBeVisible()
    await expect(todayStrip(page)).toHaveCount(0)
  })

  test('rushing out early is gentle and records nothing', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Look at One Thing').click()
    await advance(page, 3000)
    await page.getByRole('button', { name: 'Leave early' }).click()

    await expect(page.getByRole('heading', { name: MENU_HEADING })).toBeFocused()
    await expect(page.getByText(STRIP_NOTE)).toHaveCount(0)
    await expect(taskButton(page, 'Look at One Thing')).not.toHaveAccessibleName(/Savored/)

    // Starting again begins from the full time.
    await taskButton(page, 'Look at One Thing').click()
    await expect(ring(page)).toHaveAttribute('data-progress', '0.00')
    // Read out in calm words, never as seconds left
    await expect(ring(page)).toHaveAccessibleName('The moment has just begun')
    await advance(page, 5000)
    await expect(ring(page)).toHaveAttribute('data-progress', '0.08')
  })

  test('time away from the tab does not count: the moment waits and welcomes you back', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Listen to Silence').click()
    await advance(page, 10_000)
    await expect(ring(page)).toHaveAttribute('data-progress', '0.17')

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await advance(page, 120_000)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(ring(page)).toHaveAttribute('data-progress', '0.17')
    await expect(page.getByText('Welcome back. The moment waited for you.')).toBeVisible()
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toHaveCount(0)

    await advance(page, 49_000)
    await expect(ring(page)).toHaveAttribute('data-progress', /^0\.9\d$/)
    await expect(ring(page)).toHaveAccessibleName('Most of the way through the moment')
    await advance(page, 1_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
  })

  test('staying a little longer repeats the moment, and each finished one gets its own card', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Look at One Thing').click()
    await advance(page, 60_000)
    await page.getByRole('button', { name: 'Stay a little longer' }).click()
    await expect(page.getByRole('heading', { name: 'Look at One Thing' })).toBeFocused()
    await expect(ring(page)).toHaveAttribute('data-progress', '0.00')
    await advance(page, 60_000)
    await page.getByRole('button', { name: 'Continue slowing down' }).click()
    await expect(todayStrip(page).getByRole('listitem')).toHaveCount(2)
    for (const card of await todayStrip(page).getByRole('listitem').all()) await expect(card).toContainText('Look at One Thing')
  })

  test('regression: moments savored today survive a reload but not midnight', async ({ page }) => {
    await openGame(page)
    await taskButton(page, 'Notice This Moment').click()
    await advance(page, 45_000)
    await page.getByRole('button', { name: 'Continue slowing down' }).click()
    await expect(todayStrip(page).getByRole('listitem')).toHaveCount(1)
    await expect(todayStrip(page)).toContainText('Notice This Moment')

    await page.reload()
    await expect(todayStrip(page).getByRole('listitem')).toHaveCount(1)
    await expect(todayStrip(page)).toContainText('Notice This Moment')
    await expect(taskButton(page, 'Notice This Moment')).toHaveAccessibleName(/Savored today\.$/)

    await page.clock.setFixedTime(new Date('2026-11-22T09:00:00'))
    await page.reload()
    await expect(page.getByRole('heading', { name: MENU_HEADING })).toBeVisible()
    await expect(taskButton(page, 'Notice This Moment')).not.toHaveAccessibleName(/Savored/)
    await expect(page.getByText(STRIP_NOTE)).toHaveCount(0)
  })

  test('a broken saved list is ignored', async ({ page }) => {
    const errors = collectPageErrors(page)
    await page.addInitScript((key) => localStorage.setItem(key, '{oops'), STRIP_KEY)
    await openGame(page)
    await expect(page.getByText(STRIP_NOTE)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('a saved card for a moment that no longer exists is left out', async ({ page }) => {
    await page.addInitScript((key) => {
      const card = (id: string, at: string) => ({ key: at, id, at, things: [], heard: [], lookedAt: '', feelings: [] })
      localStorage.setItem(key, JSON.stringify({ v: 1, day: '2026-11-21', moments: [card('breathe', '2026-11-21T08:00:00'), card('watch', '2026-11-21T08:05:00')] }))
    }, STRIP_KEY)
    await openGame(page)
    await expect(todayStrip(page).getByRole('listitem')).toHaveCount(1)
    await expect(todayStrip(page)).toContainText('Watch the Seeds')
  })

  test('each moment ends in a keepsake of what was noticed, and today’s cards open to keep', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)
    await taskButton(page, 'Listen to Silence').click()
    await advance(page, 60_000)
    const heard = page.getByRole('group', { name: 'What did you hear?' })
    await heard.getByRole('button', { name: 'Birds' }).click()
    await heard.getByRole('button', { name: 'Traffic' }).click()
    await expectKeepsakeSaves(page, {
      fileName: /^the-patient-one-listen-to-silence-2026-11-21\.png$/,
      describedAs: /I heard birds and traffic\./,
    })
    expect(await axeViolations(page)).toEqual([])
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    expect(await axeViolations(page)).toEqual([])
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))

    await page.clock.pauseAt(new Date('2026-11-21T10:20:00'))
    await page.getByRole('button', { name: 'Continue slowing down' }).click()
    await taskButton(page, 'Count Three Things').click()
    await page.getByRole('textbox', { name: 'First thing' }).fill('Warm socks')
    await page.locator('h1').click()
    await advance(page, 50_000)
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await page.getByRole('button', { name: 'Continue slowing down' }).click()

    // A card for each moment, newest first, with what was noticed, and no tally anywhere
    const cards = todayStrip(page).getByRole('button')
    await expect(cards).toHaveCount(2)
    await expect(cards.first()).toContainText('Warm socks')
    await expect(cards.last()).toContainText('Birds and traffic')
    await expect(page.locator('main')).not.toContainText(/\d+ moments?\b/)
    await expect(page.getByTestId('keepsake-canvas')).toHaveCount(0)

    await cards.first().click()
    await expect(cards.first()).toHaveAttribute('aria-expanded', 'true')
    const opened = page.locator('#today-moment')
    await expectKeepsakeSaves(page, {
      within: opened,
      fileName: /^the-patient-one-count-three-things-2026-11-21\.png$/,
      describedAs: /^A small green sprout, for Count Three Things\. Today I noticed Warm socks$/,
    })
    await cards.last().click()
    // Each moment has its own picture: the listening one is never described as seeds
    await expect(opened.getByTestId('keepsake-canvas')).toHaveAccessibleDescription(/^Soft rings of sound.*I heard birds and traffic/)
    expect(await axeViolations(page)).toEqual([])
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    expect(await axeViolations(page)).toEqual([])
    await cards.last().click()
    await expect(page.getByTestId('keepsake-canvas')).toHaveCount(0)
    expect(errors).toEqual([])
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
    await expect(page.getByRole('button', { name: 'Leave early' })).toBeFocused()
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
    const field = page.getByRole('img', { name: /settled/ })
    await expect(field).toBeVisible()
    await expect(field.locator('.animate-float-seed')).toHaveCount(0)
    await expect(field.locator('div')).toHaveCount(8)

    await advance(page, 25_000)
    await expect(field.locator('[data-settled="true"]')).toHaveCount(5)
    await expect(field.locator('.animate-fade')).toHaveCount(0)
    await advance(page, 15_000)
    await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
  })

  test('with Larger text, the seeds, the time and Stop all fit on screen without scrolling', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('verygoodmelon:accessibility:settings', JSON.stringify({ textSize: 'larger' })))
    await openGame(page)
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'larger')
    await taskButton(page, 'Watch the Seeds').tap()
    await advance(page, 3000)
    for (const target of [page.getByRole('img', { name: /settled/ }), ring(page), page.getByRole('button', { name: 'Leave early' })]) {
      const box = await target.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.y + box!.height).toBeLessThanOrEqual(844)
    }
    // Bringing the moment on screen is not counted as the player moving.
    await expect(page.getByText('The seeds wait while you move.')).toHaveCount(0)
    await expect(ring(page)).toHaveAttribute('data-progress', '0.08')
  })

  test('the keepsake ending is still, fits the phone, and the strip scrolls inside itself', async ({ page }) => {
    await openGame(page)
    for (const title of ['Look at One Thing', 'Notice This Moment', 'Watch the Seeds']) {
      await taskButton(page, title).tap()
      await advance(page, 60_000)
      await expect(page.getByRole('heading', { name: REWARD_HEADING })).toBeVisible()
      if (title !== 'Watch the Seeds') await page.getByRole('button', { name: 'Continue slowing down' }).tap()
    }
    // Nothing in the ending keeps moving (the site's own fades are cut to an instant under reduced motion)
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => (a as CSSAnimation).animationName))).toEqual([])
    await expectKeepsakeSaves(page, { fileName: /^the-patient-one-watch-the-seeds-2026-11-21\.png$/, describedAs: /Eight seeds settled/ })
    await page.getByRole('button', { name: 'Continue slowing down' }).tap()
    const cards = todayStrip(page).getByRole('listitem')
    await expect(cards).toHaveCount(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    // The moment just finished leads, and the oldest peeks in at the edge so the row reads as one to scroll
    await expect(cards.first()).toContainText('Watch the Seeds')
    const row = await todayStrip(page).boundingBox()
    const third = await cards.nth(2).boundingBox()
    expect(third!.x).toBeLessThan(row!.x + row!.width - 12)
    await todayStrip(page).getByRole('button').last().tap()
    const canvas = page.locator('#today-moment').getByTestId('keepsake-canvas')
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    expect(await axeViolations(page)).toEqual([])
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
