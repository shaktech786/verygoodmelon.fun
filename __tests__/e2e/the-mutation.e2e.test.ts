import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { expectKeepsakeSaves } from './helpers/keepsake'

/**
 * The Shapeshifter (/games/the-mutation): a calm canvas arcade game that cannot be lost.
 * Its rules are never announced. The first clue teaches the orb to move; after that, each
 * crossroads grows a few clues at once and the player goes to the one they want. Resting
 * instead lets them all settle and sleep. Later a quiet circle joins the clues, so the player
 * also chooses when the game ends, and the finale tells back that particular run.
 *
 * Rests and name cards take real seconds, so the suite can skip the waiting through
 * window.__cascadeState, the engine state GameCanvas exposes outside production. Choosing is
 * driven through real keys wherever the test is about choosing.
 */

interface EngineEntity {
  id: number
  type: string
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  active: boolean
  age: number
  hp: number
}

interface EngineSeed {
  id: string
  x: number
  y: number
  growth: number
}

interface EngineState {
  w: number
  h: number
  wave: number
  waveTime: number
  score: number
  px: number
  py: number
  combo: number
  multiplier: number
  totalTime: number
  quietUntil: number
  bumps: number
  transformed: number
  stillness: number
  forks: number
  finished: boolean
  activeMechanics: string[]
  entities: EngineEntity[]
  nextId: number
  seeds: EngineSeed[]
  sleeping: { id: string }[]
  unnamed: { id: string } | null
  foundBy: string[]
}

type CascadeWindow = Window & { __cascadeState?: EngineState }

interface MutateBody {
  isNaming?: boolean
  wave: number
  category: string
  options: string[]
  ending?: string
  letBe?: string[]
}

const NAME = 'ORBIT GARDEN DELUXE'
const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')
const ENDING = 'ending'

async function quietTelemetry(page: Page) {
  await page.route(/\/api\/(game-events|site-visits)/, (route) => route.fulfill({ status: 503, json: {} }))
}

/** Writes words for whichever rule the player chose. */
async function mockMutations(page: Page) {
  const requests: MutateBody[] = []
  await page.route('**/api/cascade/mutate', async (route) => {
    const body = route.request().postDataJSON() as MutateBody
    requests.push(body)
    if (body.isNaming) {
      return route.fulfill({ json: { gameName: NAME, tagline: 'A small universe that grew around you.' } })
    }
    const [id] = body.options
    return route.fulfill({
      json: {
        mechanicId: id,
        title: `WAVE ${body.wave + 1} ${id.toUpperCase()}`,
        description: `The ${body.category} rule arrives.`,
        flavorText: 'Something shifted.',
      },
    })
  })
  return requests
}

async function engine(page: Page): Promise<EngineState> {
  return page.evaluate(() => {
    const s = (window as CascadeWindow).__cascadeState
    if (!s) throw new Error('engine state not exposed')
    return {
      w: s.w,
      h: s.h,
      wave: s.wave,
      waveTime: s.waveTime,
      score: s.score,
      px: s.px,
      py: s.py,
      combo: s.combo,
      multiplier: s.multiplier,
      totalTime: s.totalTime,
      quietUntil: s.quietUntil,
      bumps: s.bumps,
      transformed: s.transformed,
      stillness: s.stillness,
      forks: s.forks,
      finished: s.finished,
      activeMechanics: [...s.activeMechanics],
      entities: s.entities.map((e) => ({ ...e })),
      nextId: s.nextId,
      seeds: s.seeds.map((z) => ({ ...z })),
      sleeping: s.sleeping.map((z) => ({ id: z.id })),
      unnamed: s.unnamed ? { id: s.unnamed.id } : null,
      foundBy: [...s.foundBy],
    }
  })
}

const offered = async (page: Page) => (await engine(page)).seeds.map((z) => z.id)

/** Skips the wait before the next clues appear, and returns what they are. */
async function bringClues(page: Page): Promise<string[]> {
  // Skip the wait on every poll: a name that lands late can set a fresh quiet spell after the first skip
  await expect.poll(async () => {
    await page.evaluate(() => {
      const s = (window as CascadeWindow).__cascadeState
      if (!s) return
      s.waveTime = 999
      s.quietUntil = 0
    })
    return (await engine(page)).seeds.length
  }, { timeout: 15_000 }).toBeGreaterThan(0)
  return offered(page)
}

/** Skips the rest a lone clue needs to open, as if the player had waited beside it. */
async function restUntilOpen(page: Page) {
  await page.evaluate(() => {
    const s = (window as CascadeWindow).__cascadeState
    const lone = s && (s.seeds.length === 1 ? s.seeds[0] : s.seeds.find((z) => z.id === 'ending'))
    if (lone) lone.growth = 0.999
  })
  await expect.poll(async () => (await engine(page)).seeds).toEqual([])
}

/** Skips a long rest at a crossroads: every clue settles and sleeps. */
async function restUntilAsleep(page: Page) {
  await page.evaluate(() => {
    const s = (window as CascadeWindow).__cascadeState
    if (s) s.stillness = 0.999
  })
  await expect.poll(async () => (await engine(page)).seeds).toEqual([])
}

/** Puts the orb beside a clue, as if the player had walked there. */
async function arriveAt(page: Page, id: string) {
  await page.evaluate((target) => {
    const s = (window as CascadeWindow).__cascadeState
    const seed = s?.seeds.find((z) => z.id === target)
    if (!s || !seed) throw new Error(`no ${target} clue`)
    s.px = seed.x - 6
    s.py = seed.y
  }, id)
  await expect.poll(async () => (await offered(page)).includes(id)).toBe(false)
}

/** Makes the first clue now growing a particular rule, for tests about what that rule does. */
async function growInstead(page: Page, id: string) {
  await page.evaluate((rule) => {
    const s = (window as CascadeWindow).__cascadeState
    if (s?.seeds[0]) s.seeds[0].id = rule
  }, id)
}

/** Skips the time a resting player takes to be told the new rule's name. */
async function waitForName(page: Page) {
  await page.evaluate(() => {
    const s = (window as CascadeWindow).__cascadeState
    if (s) s.waveTime = 999
  })
  await expect.poll(async () => (await engine(page)).unnamed).toBeNull()
}

const named = (page: Page) => page.getByTestId('rule-named')

/** The first clue: rest beside it until the orb can move, and let the rule be named. */
async function learnToMove(page: Page) {
  await bringClues(page)
  await restUntilOpen(page)
  await waitForName(page)
}

/** At the next crossroads, goes to the first clue offered from `prefer`, else the first rule there. Returns its id. */
async function choose(page: Page, prefer: string[] = []): Promise<string> {
  const ids = await bringClues(page)
  const rules = ids.filter((id) => id !== ENDING)
  const id = prefer.find((p) => rules.includes(p)) ?? rules[0]
  await arriveAt(page, id)
  await expect.poll(async () => (await engine(page)).activeMechanics).toContain(id)
  await waitForName(page)
  return id
}

/** Brings clues until the closing circle is among them, then goes to it. */
async function finishByChoosing(page: Page, prefer: string[] = []) {
  for (let i = 0; i < 6; i++) {
    const ids = await bringClues(page)
    if (ids.includes(ENDING)) {
      await arriveAt(page, ENDING)
      return
    }
    const id = prefer.find((p) => ids.includes(p)) ?? ids[0]
    await arriveAt(page, id)
    await waitForName(page)
  }
  throw new Error('the circle never came')
}

/** A player who only rests: every crossroads sleeps, and the circle grows beside them. */
async function restThrough(page: Page) {
  for (let i = 0; i < 8; i++) {
    const ids = await bringClues(page)
    if (ids.includes(ENDING)) {
      await restUntilOpen(page)
      return
    }
    await restUntilAsleep(page)
  }
  throw new Error('the circle never came')
}

/** Steers the orb with the arrow keys until it reaches the clue, the way a keyboard player would. */
async function steerTo(page: Page, id: string) {
  const held = new Set<string>()
  for (let i = 0; i < 100; i++) {
    const s = await engine(page)
    const seed = s.seeds.find((z) => z.id === id)
    if (!seed) break
    const want = new Set<string>()
    if (Math.abs(seed.x - s.px) > 8) want.add(seed.x < s.px ? 'ArrowLeft' : 'ArrowRight')
    if (Math.abs(seed.y - s.py) > 8) want.add(seed.y < s.py ? 'ArrowUp' : 'ArrowDown')
    for (const k of held) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k) }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k) }
    await page.waitForTimeout(50)
  }
  for (const k of held) await page.keyboard.up(k)
}

/** Puts a shadow right next to the orb. */
async function shadowOnOrb(page: Page) {
  await page.evaluate(() => {
    const s = (window as CascadeWindow).__cascadeState
    if (!s) return
    s.entities.push({ id: s.nextId++, type: 'chaser', x: s.px + 6, y: s.py, vx: 0, vy: 0, size: 8, alpha: 1, active: true, age: 0, hp: 1 })
  })
}

const title = (page: Page) => page.getByRole('dialog', { name: 'The Shapeshifter', exact: true })
const status = (page: Page) => page.getByRole('status')
const finaleDialog = (page: Page) => page.getByRole('dialog', { name: 'Your game is finished' })
const canvasOf = (page: Page) => page.getByRole('application', { name: 'The Shapeshifter game area' })

async function openGame(page: Page) {
  await quietTelemetry(page)
  await page.goto('/games/the-mutation')
  await expect(title(page)).toBeVisible()
  // The title is server-rendered, so wait for the game's effects to run before pressing keys at it
  await page.waitForFunction(() => (window as CascadeWindow).__cascadeState !== undefined)
}

async function begin(page: Page) {
  await openGame(page)
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await engine(page)).totalTime).toBeGreaterThan(0)
}

async function axeViolations(page: Page): Promise<string[]> {
  // Contrast is measured once fades have finished, as a player would see it
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

/** The closing words and name of a finished run. */
async function ending(page: Page): Promise<{ name: string; words: string }> {
  const finale = finaleDialog(page)
  await expect(finale.getByRole('button', { name: 'PLAY AGAIN' })).toBeVisible()
  const name = (await finale.getByRole('heading', { level: 2 }).textContent())?.replace('Your game is finished. It is called', '').trim() ?? ''
  const words = await finale.innerText()
  return { name, words }
}

test.describe('The Shapeshifter', () => {
  test('a keyboard-only player chooses each clue by steering to it, hears where they are, and ends when they choose', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const requests = await mockMutations(page)
    await openGame(page)

    await expect(title(page).getByRole('heading', { name: 'THE SHAPESHIFTER' })).toBeVisible()
    await expect(title(page).getByText('Nothing here can hurt you.', { exact: false })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Click the orb, or press Space.')).toBeVisible()
    await expect(canvasOf(page)).toHaveAccessibleDescription(/C tells you where the clues are/)
    // No count of rules found or still to find, at any point
    await expect(page.getByText(/rules? (yet|found)|of 6/i)).toHaveCount(0)

    // Pulsing the orb is what brings the first clue
    for (let i = 1; i <= 3; i++) {
      await page.keyboard.press(' ')
      await expect.poll(async () => (await engine(page)).score).toBe(i)
    }
    await expect.poll(async () => (await offered(page)).length).toBe(1)
    expect((await offered(page))[0]).toMatch(/^(arrow_keys|mouse_follow)$/)
    await expect(page.getByText('Something is growing. Press Space, or just rest.')).toBeVisible()
    await expect(status(page)).toHaveText('Something new is growing close to your orb: a small sign of four arrows. Pulse the orb, or rest, and it will open.')
    // Five pulses open it (0.2 each). Sent back to back: reading the engine between presses let a slow
    // runner idle long enough for resting to outgrow the gathering.
    for (let i = 0; i < 5; i++) await page.keyboard.press(' ')
    await expect.poll(async () => (await engine(page)).activeMechanics.length).toBe(1)
    expect((await engine(page)).foundBy).toEqual(['gathered'])
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(status(page)).toHaveText(/^It opened\. Your orb can move now/)

    // Moving is feeling it, and only then is it named
    const before = await engine(page)
    await page.keyboard.down('ArrowRight')
    await expect.poll(async () => (await engine(page)).px).toBeGreaterThan(before.px + 40)
    await page.keyboard.up('ArrowRight')
    await expect(named(page)).toContainText('WAVE 1')

    // The first crossroads: both lights and something different, all at once
    const clues = await bringClues(page)
    expect(clues).toHaveLength(3)
    expect(clues).toEqual(expect.arrayContaining(['stars', 'pulse_gems']))
    await expect(status(page)).toHaveText(/^Some new things are growing: a faint (star|gem) outline .*your orb; .*; and .*your orb\. Go to the one you want, and it will open\. Or rest, and they will settle and sleep\.$/)
    await expect(page.getByText('Go to the one you want, or rest and let them be.')).toBeVisible()
    // The name card steps aside so no clue is hidden under it
    await expect(named(page)).toHaveCount(0)

    // C tells a screen reader where each clue is now, from the orb's point of view
    await page.keyboard.press('c')
    await expect(status(page)).toHaveText(/^A faint .* your orb; .* your orb; and .* your orb\.$/)

    // Choosing: steer to the gems, and only the gems open
    await steerTo(page, 'pulse_gems')
    await expect.poll(async () => (await engine(page)).activeMechanics).toContain('pulse_gems')
    const afterChoice = await engine(page)
    expect(afterChoice.activeMechanics).not.toContain('stars')
    expect(afterChoice.foundBy[1]).toBe('went')
    // Gathering the gem that came out of it is feeling it, so the name may follow at once
    await expect(status(page)).toHaveText(/^(It opened\. A gem came out of it.*The others faded, and may grow again later\.|WAVE 2 PULSE_GEMS\..*)$/)
    await waitForName(page)
    expect(requests.filter((r) => !r.isNaming).map((r) => r.options)).toContainEqual(['pulse_gems'])

    // Keep choosing by steering until the circle is offered, then steer to it
    for (let i = 0; i < 6; i++) {
      const ids = await bringClues(page)
      if (ids.includes(ENDING)) {
        await expect(page.getByText('Go to the one you want. The circle ends the game, and so does resting.', { exact: true })).toBeVisible()
        await steerTo(page, ENDING)
        break
      }
      const pick = ids.find((id) => id !== 'score_rush') ?? ids[0]
      await steerTo(page, pick)
      // On a slow machine the orb can linger beside another clue on the way and open that one instead; either is a choice
      await expect.poll(async () => (await engine(page)).activeMechanics.some((id) => ids.includes(id))).toBe(true)
      await waitForName(page)
    }

    const finale = finaleDialog(page)
    await expect(finale).toBeVisible()
    await expect(finale.getByRole('heading', { name: `Your game is finished. It is called ${NAME}` })).toBeFocused()
    await expect(status(page)).toHaveText('Your game is finished.')
    const chosen = (await engine(page)).activeMechanics.slice(1)
    // The closing words tell back this run's own choices, in order, never counted
    await expect(finale.getByText('You chose the breathing gems', { exact: false })).toBeVisible()
    expect(chosen[0]).toBe('pulse_gems')
    await expect(finale.getByText(/\d+ (rules|lights)|longest rhythm/)).toHaveCount(0)
    await expect(finale.getByText('Play again and choose other clues, or rest through them, and it will end another way.')).toBeVisible()
    const naming = requests.find((r) => r.isNaming)
    expect(naming?.ending).toMatch(/^(wandering|kept|gathering|resting|bloom)$/)

    await page.keyboard.press('Enter')
    await expect(title(page).getByRole('button', { name: 'BEGIN' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Click the orb, or press Space.')).toBeVisible()
    expect(await engine(page)).toMatchObject({ wave: 0, score: 0, activeMechanics: [], seeds: [], sleeping: [], foundBy: [], forks: 0 })
    // Regression: the old state survived Play Again and the next run ended instantly
    await page.waitForTimeout(300)
    await expect(finaleDialog(page)).toBeHidden()
    expect(errors).toEqual([])
  })

  test('a resting player lets each crossroads sleep and reaches a still ending of their own, with no clock', async ({ page }) => {
    await mockMutations(page)
    await begin(page)

    // No input at all: the first clue appears after a short rest and opens by itself
    await expect.poll(async () => (await engine(page)).seeds.length, { timeout: 6000 }).toBe(1)
    await expect.poll(async () => (await engine(page)).activeMechanics.length, { timeout: 10000 }).toBe(1)
    expect((await engine(page)).foundBy).toEqual(['rested'])
    await waitForName(page)

    // Resting at a crossroads chooses nothing; first a gentle word, then the clues settle
    const clues = await bringClues(page)
    await expect.poll(async () => (await engine(page)).stillness, { timeout: 8000 }).toBeGreaterThan(0.4)
    await expect(status(page)).toHaveText('If you keep resting, these will settle into the field and sleep. Move, and they stay awake.')
    await expect(page.getByText('Resting lets them settle and sleep. Move, and they stay awake.')).toBeVisible()
    await restUntilAsleep(page)
    await expect(status(page)).toHaveText(/^You let them be\. .* settled into the field to sleep\. Something else will grow soon\.$/)
    const s = await engine(page)
    expect(s.sleeping.map((z) => z.id)).toEqual(clues)
    expect(s.activeMechanics).toHaveLength(1)

    await restThrough(page)
    const { words } = await ending(page)
    expect(words).toContain('You let every clue be. They are still out there, asleep, and the field kept its quiet for you.')
    expect(words).not.toMatch(/You chose/)
    await expect(finaleDialog(page).getByTestId('keepsake-canvas')).toHaveAccessibleDescription(/clues you let be, asleep where they grew/)
  })

  test('explorer, rester and a player who ends early each reach a different ending', async ({ page }) => {
    // With the server down every name and line is the game's own, so the endings can be compared exactly
    const naming: MutateBody[] = []
    await page.route('**/api/cascade/mutate', (route) => {
      const body = route.request().postDataJSON() as MutateBody
      if (body.isNaming) naming.push(body)
      return route.fulfill({ status: 500, json: { error: 'down' } })
    })
    const results: Array<{ name: string; words: string }> = []

    // The explorer goes to a clue at every crossroads, and to the bloom when it comes
    await begin(page)
    await learnToMove(page)
    await choose(page, ['stars'])
    await choose(page, ['sweepers', 'chasers', 'blaster'])
    await bringClues(page)
    await growInstead(page, 'score_rush')
    await arriveAt(page, 'score_rush')
    await waitForName(page)
    expect(await bringClues(page)).toEqual([ENDING])
    await arriveAt(page, ENDING)
    results.push(await ending(page))

    // The rester never chooses
    await finaleDialog(page).getByRole('button', { name: 'PLAY AGAIN' }).click()
    await page.getByRole('button', { name: 'BEGIN' }).click()
    await learnToMove(page)
    await restThrough(page)
    results.push(await ending(page))

    // The quick one takes the gems and a rest, then ends at the first circle
    await finaleDialog(page).getByRole('button', { name: 'PLAY AGAIN' }).click()
    await page.getByRole('button', { name: 'BEGIN' }).click()
    await learnToMove(page)
    await choose(page, ['pulse_gems'])
    await bringClues(page)
    await restUntilAsleep(page)
    await bringClues(page)
    await restUntilAsleep(page)
    expect(await bringClues(page)).toContain(ENDING)
    await arriveAt(page, ENDING)
    results.push(await ending(page))

    expect(new Set(results.map((r) => r.name)).size).toBe(3)
    expect(results[0].name).toMatch(/IN BLOOM$/)
    expect(results[0].words).toContain('You chose the bloom, and everything you had gathered glowed at once.')
    expect(results[1].name).toMatch(/^SLEEPING /)
    expect(results[1].words).toContain('You let every clue be.')
    expect(results[2].name).toMatch(/^HALF-KEPT GEMS/)
    expect(results[2].words).toContain('You took a little and let the rest sleep.')
    expect(results[2].words).toContain('You ended it while it was still small.')
    expect(naming.map((n) => n.ending)).toEqual(['bloom', 'still', 'kept'])
    for (const r of results) expect(r.words).not.toMatch(/error|failed|\bAI\b/)
  })

  test('rules the player chose together change each other, and the name card says how', async ({ page }) => {
    await mockMutations(page)
    await begin(page)
    await learnToMove(page)
    await choose(page, ['stars'])
    await bringClues(page)
    await growInstead(page, 'sweepers')
    await arriveAt(page, 'sweepers')
    await waitForName(page)
    await expect(page.getByTestId('rule-together')).toHaveText('The tides carry the stars along with them.')
    await expect(status(page)).toContainText('The tides carry the stars along with them.')

    // And it really does: a tide crossing a star carries it along
    const moved = await page.evaluate(() => {
      const s = (window as CascadeWindow).__cascadeState
      if (!s) return 0
      s.spawnTimers.sweepers = -999
      const star = { id: s.nextId++, type: 'star', x: 100, y: 100, vx: 0, vy: 0, size: 8, alpha: 1, active: true, age: 0, hp: 0 }
      s.entities.push(star)
      s.entities.push({ id: s.nextId++, type: 'sweeper', x: 100, y: 0, vx: 100, vy: 0, size: 10, alpha: 1, active: true, age: 0, hp: 1 })
      return new Promise<number>((resolve) => setTimeout(() => resolve(star.x - 100), 400))
    })
    expect(moved).toBeGreaterThan(10)
  })

  test('a new rule never takes the keys away: the game keeps focus and keeps moving as it opens', async ({ page }) => {
    await mockMutations(page)
    await begin(page)
    await learnToMove(page)
    const canvas = canvasOf(page)
    await expect(canvas).toBeFocused()

    await page.keyboard.down('ArrowDown')
    const ids = await bringClues(page)
    await arriveAt(page, ids[0])
    await page.keyboard.up('ArrowDown')
    const y = (await engine(page)).py
    await page.keyboard.down('ArrowUp')
    await expect.poll(async () => (await engine(page)).py).toBeLessThan(y - 20)
    await page.keyboard.up('ArrowUp')
    await expect(canvas).toBeFocused()
    await page.keyboard.press(' ')
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })

  test('pause freezes the clock and the clues, resumes, and can start over', async ({ page }) => {
    await mockMutations(page)
    await begin(page)
    await learnToMove(page)
    await bringClues(page)

    await page.keyboard.press('Escape')
    const paused = page.getByRole('dialog', { name: 'Paused' })
    await expect(paused).toBeVisible()
    await expect(paused.getByText('Esc or P pauses and resumes. C tells you where the clues are.')).toBeHidden()
    await paused.getByText('Keys', { exact: true }).click()
    await expect(paused.getByText('Esc or P pauses and resumes. C tells you where the clues are.')).toBeVisible()
    const frozen = await engine(page)
    await page.waitForTimeout(400)
    const still = await engine(page)
    expect(still.totalTime).toBe(frozen.totalTime)
    expect(still.stillness).toBe(frozen.stillness)

    await paused.getByRole('button', { name: 'RESUME' }).click()
    await expect(paused).toBeHidden()
    await expect.poll(async () => (await engine(page)).totalTime).toBeGreaterThan(frozen.totalTime)

    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(paused).toBeVisible()
    await page.keyboard.press('p')
    await expect(paused).toBeHidden()

    await page.keyboard.press('Escape')
    await paused.getByRole('button', { name: 'Start over' }).click()
    await expect(title(page)).toBeVisible()
    await page.keyboard.press('Enter')
    expect(await engine(page)).toMatchObject({ wave: 0, score: 0, activeMechanics: [], seeds: [] })
  })

  test('the pause button sits outside the playing field', async ({ page }) => {
    await mockMutations(page)
    await begin(page)
    const field = await canvasOf(page).boundingBox()
    const pause = await page.getByRole('button', { name: 'Pause' }).boundingBox()
    if (!field || !pause) throw new Error('layout missing')
    expect(pause.y).toBeGreaterThanOrEqual(field.y + field.height)
  })

  test('the bloom turns waiting shadows into stars, leaves only the circle, and no glow fades while resting', async ({ page }) => {
    await mockMutations(page)
    await begin(page)
    await learnToMove(page)
    await choose(page, ['stars'])
    await choose(page, ['chasers', 'sweepers'])
    await bringClues(page)
    await growInstead(page, 'score_rush')
    await shadowOnOrb(page)
    await page.evaluate(() => {
      const s = (window as CascadeWindow).__cascadeState
      if (s) s.entities.push({ id: s.nextId++, type: 'chaser', x: 40, y: 40, vx: 0, vy: 0, size: 8, alpha: 1, active: true, age: 0, hp: 1 })
    })
    await arriveAt(page, 'score_rush')
    const bloom = await engine(page)
    expect(bloom.multiplier).toBeGreaterThanOrEqual(3)
    expect(bloom.entities.filter((e) => e.type === 'chaser')).toHaveLength(0)
    await expect(named(page)).toContainText('SCORE_RUSH', { timeout: 4000 })
    await expect(page.getByText('the bloom')).toBeVisible()

    const resting = (await engine(page)).combo
    await page.waitForTimeout(3000)
    expect((await engine(page)).combo).toBeGreaterThanOrEqual(resting)
    expect((await engine(page)).multiplier).toBeGreaterThanOrEqual(3)
    expect(await bringClues(page)).toEqual([ENDING])
  })

  test('a shadow that reaches the orb only nudges it: no light is lost and nothing shakes', async ({ page }) => {
    await mockMutations(page)
    await begin(page)
    await learnToMove(page)
    await page.evaluate(() => {
      const s = (window as CascadeWindow).__cascadeState
      if (s) s.score = 120
    })
    const before = await engine(page)
    await shadowOnOrb(page)
    await expect.poll(async () => (await engine(page)).bumps).toBeGreaterThanOrEqual(1)
    await expect.poll(async () => Math.abs((await engine(page)).px - before.px)).toBeGreaterThan(10)
    expect((await engine(page)).score).toBeGreaterThanOrEqual(before.score)
  })

  test('at 1280x800 the finale fits on screen and held arrow keys never scroll its name away', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockMutations(page)
    await begin(page)
    await learnToMove(page)
    for (let n = 0; n < 3; n++) await choose(page, ['stars', 'chasers', 'blaster'])
    const ids = await bringClues(page)
    expect(ids).toContain(ENDING)
    await page.keyboard.down('ArrowDown')
    await arriveAt(page, ENDING)
    const finale = finaleDialog(page)
    await expect(finale.getByRole('heading', { name: /ORBIT GARDEN DELUXE/ })).toBeFocused()
    await page.waitForTimeout(500)
    await page.keyboard.up('ArrowDown')
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown')
    await expect(finale.getByRole('button', { name: 'PLAY AGAIN' })).toBeInViewport({ ratio: 1 })
    await expect(finale.getByRole('heading', { name: /ORBIT GARDEN DELUXE/ })).toBeInViewport({ ratio: 1 })
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    const map = await finale.getByTestId('keepsake-canvas').boundingBox()
    expect(map?.width ?? 0).toBeGreaterThanOrEqual(400)
    expect((map?.y ?? 0) + (map?.height ?? 0)).toBeLessThanOrEqual(800 + 50)

    // Away from the game, the arrow keys scroll the page as usual.
    await page.getByRole('link', { name: /VeryGoodMelon/ }).first().focus()
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })

  test('the playfield is a dark arcade screen in every theme, with still scanlines and a glow that softens', async ({ page }) => {
    await mockMutations(page)
    await begin(page)
    const corner = () =>
      canvasOf(page).evaluate((canvas: HTMLCanvasElement) => {
        const [r, g, b] = canvas.getContext('2d')!.getImageData(3, 3, 1, 1).data
        // Probed inside the stage, where the screen's inks replace the site's tokens
        const probe = document.createElement('div')
        probe.style.background = 'var(--card-bg)'
        canvas.parentElement!.append(probe)
        const css = getComputedStyle(probe).backgroundColor
        probe.remove()
        return { pixel: `rgb(${r}, ${g}, ${b})`, css, luma: (r * 299 + g * 587 + b * 114) / 1000 }
      })
    await expect.poll(async () => { const c = await corner(); return c.pixel === c.css }).toBe(true)
    const light = await corner()
    expect(light.luma).toBeLessThan(30)

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.waitForTimeout(100)
    expect((await corner()).pixel).toBe(light.pixel)

    // The scanlines are a still overlay, never redrawn or animated
    const overlay = await canvasOf(page).evaluate((canvas) => {
      const after = getComputedStyle(canvas.parentElement!, '::after')
      return { image: after.backgroundImage, animation: after.animationName, pointer: after.pointerEvents }
    })
    expect(overlay.image).toContain('repeating-linear-gradient')
    expect(overlay.animation).toBe('none')
    expect(overlay.pointer).toBe('none')

    // Reduced motion, like Quiet, halves the glow
    const neon = () => canvasOf(page).evaluate((canvas) => Number(getComputedStyle(canvas).getPropertyValue('--game-screen-neon').trim()))
    expect(await neon()).toBe(1)
    await page.evaluate(() => document.documentElement.setAttribute('data-reduce-motion', 'true'))
    // Compared as a number: a production build writes 0.5 as .5
    expect(await neon()).toBe(0.5)
  })

  test('every clue at a crossroads is drawn in the field where the engine says it grows', async ({ page }) => {
    await mockMutations(page)
    await begin(page)
    await learnToMove(page)
    await bringClues(page)
    const { seeds } = await engine(page)
    expect(seeds.length).toBeGreaterThan(1)
    for (const seed of seeds) {
      const drawn = await canvasOf(page).evaluate((canvas: HTMLCanvasElement, at) => {
        const ctx = canvas.getContext('2d')!
        const bg = ctx.getImageData(3, 3, 1, 1).data.join()
        const here = ctx.getImageData(Math.round(at.x) - 12, Math.round(at.y) - 12, 24, 24).data
        let differing = 0
        for (let i = 0; i < here.length; i += 4) if (`${here[i]},${here[i + 1]},${here[i + 2]},${here[i + 3]}` !== bg) differing++
        return differing
      }, seed)
      expect(drawn, seed.id).toBeGreaterThan(40)
    }
  })

  test('has no accessibility violations on the title, at a crossroads, a rule named, and the finale, light and dark', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    expect(await axeViolations(page)).toEqual([])
    await page.keyboard.press('Enter')
    await bringClues(page)
    expect(await axeViolations(page)).toEqual([])
    await restUntilOpen(page)
    await waitForName(page)
    await expect(named(page)).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.waitForTimeout(200)
    expect(await axeViolations(page)).toEqual([])
    await bringClues(page)
    expect(await axeViolations(page)).toEqual([])
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
    await finishByChoosing(page)
    await expect(finaleDialog(page).getByRole('button', { name: 'PLAY AGAIN' })).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.waitForTimeout(200)
    expect(await axeViolations(page)).toEqual([])
  })

  test('the finale draws the path the orb took, coloured and shaped by each chosen rule, ready to save', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await mockMutations(page)
    await begin(page)
    await learnToMove(page)
    await page.keyboard.down('ArrowRight')
    await page.waitForTimeout(250)
    await page.keyboard.up('ArrowRight')
    await choose(page, ['stars'])
    await page.keyboard.down('ArrowUp')
    await page.waitForTimeout(250)
    await page.keyboard.up('ArrowUp')
    await finishByChoosing(page, ['chasers', 'blaster'])
    const finale = finaleDialog(page)
    await expect(finale.getByRole('heading', { name: new RegExp(NAME) })).toBeFocused()
    await expectKeepsakeSaves(page, {
      within: finale,
      fileName: /^the-shapeshifter-\d{4}-\d{2}-\d{2}\.png$/,
      describedAs: /path your orb took.*\(blue circle\), then .*STARS \(gold star\)/,
    })
    await finale.getByRole('button', { name: 'Save image' }).press('Enter')
    await expect(finale).toBeVisible()
    expect(errors).toEqual([])
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

    test('touch players get a tall field, a control they can use, and clues they can reach with a finger', async ({ page }) => {
      const requests = await mockMutations(page)
      await openGame(page)
      await expect(page.getByText('Tap to begin.')).toBeVisible()

      const canvas = canvasOf(page)
      const box = await canvas.boundingBox()
      if (!box) throw new Error('canvas missing')
      expect(box.height).toBeGreaterThan(box.width)
      expect(box.height).toBeGreaterThan(844 * 0.5)

      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
      await expect(page.getByText('Tap the orb.')).toBeVisible()
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
      await expect.poll(async () => (await engine(page)).score).toBeGreaterThan(0)

      const pause = await page.getByRole('button', { name: 'Pause' }).boundingBox()
      expect(pause?.y ?? 0).toBeGreaterThanOrEqual(box.y + box.height)

      expect(await bringClues(page)).toEqual(['mouse_follow'])
      await expect(page.getByText('Something is growing. Tap the orb, or just rest.')).toBeVisible()
      await restUntilOpen(page)
      await waitForName(page)
      await expect(named(page)).toContainText('Drag your finger to guide the orb.')
      const card = await named(page).locator('div').first().boundingBox()
      expect(card?.height ?? 999).toBeLessThan(box.height * 0.4)
      expect(requests[0].options).toEqual(['mouse_follow'])

      // A finger held on a clue guides the orb there, and that clue is the one that opens
      const ids = await bringClues(page)
      const target = (await engine(page)).seeds[0]
      const s = await engine(page)
      await page.touchscreen.tap(box.x + (target.x / s.w) * box.width, box.y + (target.y / s.h) * box.height)
      await expect.poll(async () => (await engine(page)).activeMechanics, { timeout: 8000 }).toContain(target.id)
      expect(ids).toContain(target.id)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })

    test('with reduced motion the clues, the names and the finale are there at once, still, and fit the screen', async ({ page }) => {
      await mockMutations(page)
      await openGame(page)
      await page.getByRole('button', { name: 'BEGIN' }).tap()
      await learnToMove(page)
      await choose(page, ['stars', 'pulse_gems'])
      await choose(page)
      await expect(page.locator('.animate-fade')).toHaveCount(0)
      await restThrough(page)
      const finale = finaleDialog(page)
      await expect(finale.getByTestId('keepsake-canvas')).toBeVisible()
      await expect(finale.getByRole('button', { name: 'PLAY AGAIN' })).toBeVisible()
      await expect(finale.locator('.animate-fade')).toHaveCount(0)
      const map = await finale.getByTestId('keepsake-canvas').boundingBox()
      expect(map?.width ?? 0).toBeGreaterThanOrEqual(320)
      expect(map?.height ?? 0).toBeGreaterThan((map?.width ?? 0) * 1.4)
      await expectKeepsakeSaves(page, { within: finale, fileName: /^the-shapeshifter-.*\.png$/ })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  })
})
