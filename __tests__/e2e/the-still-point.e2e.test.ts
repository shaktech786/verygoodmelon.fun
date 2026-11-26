import { readFileSync } from 'fs'
import path from 'path'
import { test, expect, type Page } from '@playwright/test'
import { expectKeepsakeSaves } from './helpers/keepsake'
import { ambientSoundIsOn, setAmbientSound } from './helpers/ambient-sound'
import { expectOneGo } from './helpers/design'

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
const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')

async function axeViolations(page: Page): Promise<string[]> {
  // axe waits on its own timers, so time runs freely from here on
  await page.clock.resume()
  // Contrast is measured once the melon has opened, as a player would see it
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

const openedMelon = (page: Page) => page.getByTestId('opened-melon')

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
  await setAmbientSound(page, true)
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
    // No clock is shown while breathing, and nothing counts the time
    await expect(sessionTime(page)).toHaveCount(0)
    await expect(guide(page).getByText(/\d+:\d\d/)).toHaveCount(0)
    // Nothing counts while breathing: no clock, no tally of seeds, no countdown to the end
    await expect(guide(page)).not.toContainText(/so far|\bof \d+:\d\d/)

    // Box breathing: 4s inhale, 4s hold, 4s exhale, 4s hold, then again.
    const expected: [number, string][] = [[2000, 'Inhale'], [4000, 'Hold'], [4000, 'Exhale'], [4000, 'Hold'], [4000, 'Inhale'], [4000, 'Hold'], [4000, 'Exhale']]
    for (const [ms, label] of expected) {
      await advance(page, ms)
      await expect(phase(page)).toHaveText(label)
    }
    await expect(page.getByTestId('phase-progress')).toHaveAttribute('style', /width: 5\d(\.\d+)?%/)

    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Paused')
    await advance(page, 30_000)

    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Exhale')
    await advance(page, 2000)
    await expect(phase(page)).toHaveText('Hold')

    await page.keyboard.press('Escape')
    await expect(guide(page).getByRole('heading', { name: 'Your breaths, gathered' })).toBeVisible()
    // Headings never skip a level: the ending's h2 comes before the keepsake's h3
    expect(await guide(page).getByRole('heading').evaluateAll((hs) => hs.map((h) => h.tagName))).toEqual(['H2', 'H3'])
    await expect(guide(page)).not.toContainText(/You spent|\d+ (seconds?|minutes?)/)
    await expect(guide(page)).toContainText('Each seed is a breath you finished. Its shape comes from the rhythm')
    await expect(guide(page)).toContainText('Pattern: Box Breathing')
    await expect(guide(page).getByTestId('keepsake-canvas')).toHaveAccessibleDescription(/cut open along a square/)
    await expect(openedMelon(page).locator('[data-seed]')).toHaveCount(1)
    // The melon is drawn once: the picture to keep, with the opening played over it rather than beside it
    await expect(guide(page).getByRole('img')).toHaveCount(1)
    await expect(openedMelon(page)).toHaveAttribute('aria-hidden', 'true')
    // The seeds are the record; the words never tally them
    await expect(guide(page)).not.toContainText(/\d+ (in all|seeds?|breaths?)\b/)
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
    await page.getByRole('button', { name: 'End session' }).click()
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
      await page.getByRole('button', { name: 'End session' }).click()
      await expect(guide(page)).toContainText('Each seed is a breath you finished.')
      await expect(openedMelon(page).locator('[data-seed]')).toHaveCount(1)
    })
  }

  test('ending before a single breath is finished is met without judgement', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 3000)
    await page.getByRole('button', { name: 'End session' }).click()
    await expect(guide(page).getByRole('heading', { name: 'A short pause' })).toBeVisible()
    await expect(guide(page)).not.toContainText(/You spent|\d+ (seconds?|minutes?)/)
    await expect(guide(page)).not.toContainText('Each seed')
  })

  test('starting a new pattern after a session begins from its first breath', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 9000)
    await expect(phase(page)).toHaveText('Exhale')

    await page.getByRole('button', { name: 'End session' }).click()
    await page.getByRole('button', { name: 'Breathe again' }).click()
    await startPattern(page, /Coherent/)
    await expect(guide(page)).toContainText('Coherent Breathing')
    await expect(phase(page)).toHaveText('Inhale')
    await advance(page, 6000)
    await expect(phase(page)).toHaveText('Exhale')
  })

  test('changing rhythm mid-session keeps the clock, the seeds, and starts the new pattern on an inhale', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 17_000)

    // While breathing the rhythms are out of reach, so a stray tap never cuts a breath short
    const rhythm = page.getByRole('radiogroup', { name: 'Change rhythm' })
    await expect(rhythm).toHaveCount(0)
    await page.getByRole('button', { name: 'Change rhythm' }).click()
    await expect(phase(page)).toHaveText('Paused')
    await expect(rhythm.getByRole('radio', { name: 'Box' })).toBeFocused()
    await rhythm.getByRole('radio', { name: 'Coherent' }).click()
    await expect(rhythm.getByRole('radio', { name: 'Coherent' })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: 'Resume' }).click()
    await expect(rhythm).toHaveCount(0)
    await expect(phase(page)).toHaveText('Inhale')
    await advance(page, 6000)
    await expect(phase(page)).toHaveText('Exhale')
    await advance(page, 5100)

    // Arrow keys move through the rhythms too.
    await page.getByRole('button', { name: 'Change rhythm' }).click()
    await expect(rhythm.getByRole('radio', { name: 'Coherent' })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(rhythm.getByRole('radio', { name: 'Physiological Sigh' })).toBeFocused()
    await page.getByRole('button', { name: 'Resume' }).click()
    await expect(phase(page)).toHaveText('Inhale')

    await page.getByRole('button', { name: 'End session' }).click()
    // The Physiological Sigh was chosen but never breathed, so the ending does not claim it
    await expect(guide(page)).toContainText('Patterns: Box Breathing, Coherent Breathing')
    await expect(guide(page)).not.toContainText('Physiological Sigh')
    await expect(openedMelon(page).locator('[data-seed]')).toHaveCount(2)
  })

  test('a timed session finishes the breath in progress, then asks how you feel', async ({ page }) => {
    await openGame(page)
    await page.getByRole('radio', { name: '1 min' }).click()
    await startPattern(page, /Box Breathing/)

    await advance(page, 61_000)
    await expect(phase(page)).toHaveText('Hold')
    await expect(guide(page)).toContainText('Finishing this breath')

    // Box breathing is 16s a cycle, so the fourth breath ends at 1:04.
    await advance(page, 3500)
    await expect(guide(page).getByRole('heading', { name: 'Your breaths, gathered' })).toBeVisible()
    await expect(guide(page)).not.toContainText(/You spent|\d+ (seconds?|minutes?)/)
    await expect(guide(page)).toContainText('Each seed is a breath you finished.')
    await expect(guide(page).getByTestId('keepsake-canvas')).toHaveAccessibleDescription(/cut open along a square/)
    await expect(openedMelon(page).locator('[data-seed]')).toHaveCount(4)

    await page.getByRole('button', { name: 'Still tense' }).click()
    await expect(page.getByRole('button', { name: 'Still tense' })).toHaveAttribute('aria-pressed', 'true')
    await expect(guide(page)).toContainText('Physiological Sigh')
    await page.getByRole('button', { name: 'One minute of sighs' }).click()
    await expect(phase(page)).toHaveText('Inhale')
    await expect(guide(page)).toContainText('Physiological Sigh')
  })

  test('an open session keeps going until you end it', async ({ page }) => {
    await openGame(page)
    await page.getByRole('radio', { name: 'Open' }).click()
    await startPattern(page, /Coherent/)
    await advance(page, 10 * 60_000)
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

    await page.keyboard.press('Escape')
    await expect(guide(page)).not.toContainText(/You spent|\d+ (seconds?|minutes?)/)
    await expect(guide(page)).toContainText('Each seed is a breath you marked.')
    await expect(openedMelon(page).locator('[data-seed]')).toHaveCount(3)
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

    await page.getByRole('button', { name: 'Resume' }).click()
    await expect(phase(page)).toHaveText('Hold')
    await advance(page, 3500)
    await expect(phase(page)).toHaveText('Exhale')
  })

  test('regression: Space on the focused Pause button toggles once', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 1000)

    await page.getByRole('button', { name: 'Pause' }).focus()
    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Paused')
    await expect(page.getByRole('button', { name: 'Resume' })).toBeFocused()

    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Inhale')

    await page.getByRole('button', { name: 'End session' }).focus()
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
    // The keyboard help waits, folded, behind one small Keys toggle
    const keys = page.getByText('Keys', { exact: true })
    await expect(keys).toBeVisible()
    await expect(page.getByText('Arrow keys choose. Enter begins.')).toBeHidden()
    await keys.click()
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
    await expect(phase(page)).toBeFocused()
    await expect(guide(page)).toContainText('Coherent Breathing')
    await expect(phase(page)).toHaveText('Inhale')
    await expect(keys).toBeVisible()
    await expect(page.getByText('Space pauses. Escape ends.')).toBeHidden()

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

  test('without breath tones nothing is played, and the page says how to breathe with eyes closed', async ({ page }) => {
    await recordTones(page)
    await openGame(page)
    await expect(page.getByRole('button', { name: 'Breath tones' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('Breath tones let you follow along with your eyes closed.')).toBeVisible()
    await startPattern(page, /Box Breathing/)
    for (let i = 0; i < 8; i++) await advance(page, 2000)
    expect(await tones(page)).toEqual([])
  })

  test('breath tones on their own, without the background sound: rising in, high hold, falling out', async ({ page }) => {
    await recordTones(page)
    await openGame(page)
    await page.getByRole('button', { name: 'Breath tones' }).click()
    await expect(page.getByText(/A rising note means breathe in, a falling one means breathe out\./)).toBeVisible()
    expect(await ambientSoundIsOn(page)).toBe(false)
    await startPattern(page, /Box Breathing/)
    await advance(page, 100)
    expect(await cues(page)).toEqual([IN_HZ])
    await advance(page, 4000)
    await advance(page, 4000)
    await advance(page, 4000)
    await advance(page, 4000)
    expect(await cues(page)).toEqual([IN_HZ, HOLD_HZ, OUT_HZ, HOLD_HZ, IN_HZ])

    // A paused guide is silent.
    await page.getByRole('button', { name: 'Pause' }).click()
    await advance(page, 20_000)
    expect(await cues(page)).toHaveLength(5)
  })

  test('the background sound alone plays no breath tones, and its waves rest while you breathe', async ({ page }) => {
    await recordTones(page)
    // Records every gain ramp target, so each ambient layer's fade can be read back.
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

    await startPattern(page, /Box Breathing/)
    await advance(page, 500)
    // The sea (0.2) falls silent; the low drone (0.15) keeps its level.
    expect(await ramps()).toEqual(expect.arrayContaining([0, 0.15]))
    for (let i = 0; i < 4; i++) await advance(page, 4000)
    expect(await cues(page)).toEqual([])

    await page.getByRole('button', { name: 'End session' }).click()
    await advance(page, 500)
    expect(await ramps()).toEqual(expect.arrayContaining([0.2, 0.15]))
  })

  test('sound muted in the accessibility panel silences the breath notes', async ({ page }) => {
    await recordTones(page)
    await page.addInitScript(() => localStorage.setItem('verygoodmelon:accessibility:settings', JSON.stringify({ muted: true })))
    await openGame(page)
    await page.getByRole('button', { name: 'Breath tones' }).click()
    await expect(page.getByText('Sound is muted in the accessibility settings, so the tones stay silent.')).toBeVisible()
    await startPattern(page, /Box Breathing/)
    for (let i = 0; i < 4; i++) await advance(page, 4000)
    expect(await cues(page)).toEqual([])
  })

  test('the melon keeps the shape of the rhythm, and the last one is waiting on return', async ({ page }) => {
    await openGame(page)
    await expect(page.getByText(/Your last melon/)).toHaveCount(0)
    await startPattern(page, /Box Breathing/)
    for (let i = 0; i < 9; i++) await advance(page, 4000)
    await page.getByRole('button', { name: 'End session' }).click()
    await expect(guide(page)).toContainText('Its shape comes from the rhythm, and longer breaths grew longer seeds.')
    const seedShapes = () =>
      openedMelon(page).locator('[data-seed]').evaluateAll((els) => els.map((e) => `${e.getAttribute('rx')}x${e.getAttribute('ry')}`))
    const boxSeeds = await seedShapes()
    expect(boxSeeds).toHaveLength(2)

    await page.getByRole('button', { name: 'Breathe again' }).click()
    await expect(page.getByText('Your last melon: 2 seeds.')).toBeVisible()

    await page.reload()
    await expect(page.getByText(/^Your last melon, from \w+day, November 21: 2 seeds\.$/)).toBeVisible()

    await startPattern(page, /4-7-8/)
    for (let i = 0; i < 10; i++) await advance(page, 4000)
    await page.getByRole('button', { name: 'End session' }).click()
    expect(await seedShapes()).not.toEqual(boxSeeds)
  })

  test('the melon opens along the shape that was breathed, and the opened melon can be saved', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)
    await startPattern(page, /4-7-8/)
    for (let i = 0; i < 10; i++) await advance(page, 4000)
    await page.getByRole('button', { name: 'End session' }).click()
    await expect(openedMelon(page)).toHaveAttribute('data-shape', 'triangle')
    await expect(openedMelon(page).locator('[data-seed]')).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Breathe again' })).toBeFocused()
    // The opening plays exactly over the picture to keep, then fades to show it
    const [opening, picture] = await Promise.all([openedMelon(page).boundingBox(), guide(page).getByTestId('keepsake-canvas').boundingBox()])
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(opening![key] - picture![key])).toBeLessThanOrEqual(1)
    await expect.poll(() => openedMelon(page).evaluate((svg) => Number(getComputedStyle(svg).opacity)), { timeout: 6000 }).toBe(0)
    await expectKeepsakeSaves(page, {
      within: guide(page),
      fileName: /^the-harmonist-2026-11-21\.png$/,
      describedAs: /cut open along a triangle.*4-7-8 Relaxation/,
    })
    expect(await axeViolations(page)).toEqual([])
    await expectOneGo(page)
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    expect(await axeViolations(page)).toEqual([])
    await expectOneGo(page)

    await page.getByRole('button', { name: 'Breathe again' }).click()
    await startPattern(page, /Box Breathing/)
    for (let i = 0; i < 5; i++) await advance(page, 4000)
    await page.getByRole('button', { name: 'End session' }).click()
    await expect(openedMelon(page)).toHaveAttribute('data-shape', 'square')

    await page.getByRole('button', { name: 'Breathe again' }).click()
    await startPattern(page, /Free Breathing/)
    for (const gap of [3000, 7000, 4000]) {
      await advance(page, gap)
      await page.getByRole('button', { name: 'Mark a breath' }).click()
    }
    await page.getByRole('button', { name: 'End session' }).click()
    await expect(openedMelon(page)).toHaveAttribute('data-shape', 'own')
    await expect(guide(page).getByTestId('keepsake-canvas')).toHaveAccessibleDescription(/a shape of your own/)
    expect(errors).toEqual([])
  })

  test('a session without a finished breath leaves the melon whole, with nothing to save', async ({ page }) => {
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 3000)
    await page.getByRole('button', { name: 'End session' }).click()
    await expect(page.getByRole('img', { name: 'A whole melon, waiting' })).toBeVisible()
    await expect(openedMelon(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Save image' })).toHaveCount(0)
  })

  test('a broken saved melon is simply not shown', async ({ page }) => {
    const errors = collectPageErrors(page)
    await page.addInitScript(() => localStorage.setItem('verygoodmelon:still-point:last-melon', '{oops'))
    await openGame(page)
    await expect(page.getByText(/Your last melon/)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('leaving mid-session stops cleanly', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)
    await startPattern(page, /Box Breathing/)
    await advance(page, 3000)
    await page.getByRole('link', { name: 'VeryGoodMelon.Fun home' }).click()
    await expect(page).toHaveURL(/\/$/)
    await advance(page, 5000)
    expect(errors).toEqual([])
  })
})

test.describe('The Harmonist on a phone with reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('Begin breathing is on the first screen, even with a melon from last time', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('verygoodmelon:still-point:last-melon', JSON.stringify({ v: 1, at: '2026-11-20T09:00:00.000Z', breaths: [{ pattern: 'box', seconds: 16 }] }))
    })
    await openGame(page)
    await expect(page.getByRole('button', { name: 'Begin breathing' })).toBeInViewport({ ratio: 1 })
  })

  test('regression: the guide keeps time without the animated canvas, and seeds still gather', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)
    await page.getByRole('button', { name: 'Begin breathing' }).tap()
    await expect(page.locator('canvas[role="img"]')).toHaveCount(0)
    await expect(page.getByRole('img', { name: 'Breathing visualization - Inhale' })).toBeVisible()

    await advance(page, 6000)
    await expect(phase(page)).toHaveText('Hold')
    await expect(page.getByRole('img', { name: 'Breathing visualization - Hold' })).toBeVisible()
    await advance(page, 20_000)
    await expect(phase(page)).toHaveText('Exhale')
    await expect(page.getByRole('img', { name: /Breathing visualization/ }).locator('ellipse')).toHaveCount(1)
    // Red is kept for actions, so the guide's dot is never red, not even on the out-breath
    const dot = page.getByRole('img', { name: 'Breathing visualization - Exhale' }).locator('circle').last()
    const accent = await page.evaluate(() => {
      const probe = document.createElement('i')
      probe.style.color = 'var(--accent)'
      document.body.append(probe)
      const colour = getComputedStyle(probe).color
      probe.remove()
      return colour
    })
    expect(await dot.evaluate((circle) => getComputedStyle(circle).fill)).not.toBe(accent)

    await page.getByRole('button', { name: 'End session' }).tap()
    await expect(guide(page)).not.toContainText(/You spent|\d+ (seconds?|minutes?)/)

    await page.getByRole('button', { name: 'Breathe again' }).tap()
    await page.getByRole('radio', { name: /Free Breathing/ }).tap()
    await page.getByRole('button', { name: 'Begin breathing' }).tap()
    await page.getByRole('img', { name: /Breathing visualization/ }).tap()
    await expect(guide(page)).toContainText('1 breath marked')
    expect(errors).toEqual([])
  })

  test('with Larger text, Begin brings the guide into view and moves focus to it', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('verygoodmelon:accessibility:settings', JSON.stringify({ textSize: 'larger' })))
    await openGame(page)
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'larger')
    await page.getByRole('button', { name: 'Begin breathing' }).tap()
    await expect(phase(page)).toBeFocused()
    for (const target of [page.getByRole('img', { name: /Breathing visualization/ }), phase(page)]) {
      const box = await target.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.y + box!.height).toBeLessThanOrEqual(844)
    }
    // Space works from there, as the hint says.
    await page.keyboard.press(' ')
    await expect(phase(page)).toHaveText('Paused')
  })

  test('the melon is simply open, with no motion, and still fits and saves on a phone', async ({ page }) => {
    await openGame(page)
    await page.getByRole('button', { name: 'Begin breathing' }).tap()
    await advance(page, 33_000)
    await page.getByRole('button', { name: 'End session' }).tap()
    // Nothing plays: the picture to keep is simply already open, at the top of the screen
    await expect(openedMelon(page)).toHaveCount(0)
    const picture = guide(page).getByTestId('keepsake-canvas')
    await expect(picture).toHaveAccessibleDescription(/cut open along a square/)
    expect(await guide(page).evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
    await expect(picture).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('button', { name: 'Breathe again' })).toBeFocused()
    const box = await picture.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    await expectKeepsakeSaves(page, { within: guide(page), fileName: /^the-harmonist-2026-11-21\.png$/ })
    expect(await axeViolations(page)).toEqual([])
    await expectOneGo(page)
  })

  test('keyboard hints stay hidden on a touch screen until a key is pressed', async ({ page }) => {
    await openGame(page)
    const keys = page.getByText('Keys', { exact: true })
    await expect(keys).toBeHidden()
    await page.getByRole('button', { name: 'Begin breathing' }).tap()
    await expect(keys).toBeHidden()
    await page.keyboard.press('Tab')
    await expect(keys).toBeVisible()
    await keys.tap()
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
    await page.getByRole('button', { name: 'End session' }).tap()
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
