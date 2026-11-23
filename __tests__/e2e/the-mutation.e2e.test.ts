import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { expectKeepsakeSaves } from './helpers/keepsake'

/**
 * The Shapeshifter (/games/the-mutation): a calm canvas arcade game that cannot be lost.
 * Its six rules are never announced: each first grows as a small clue in the field, opens when
 * the player goes to it, gathers light or simply rests, and is named only once it has been felt.
 * A last quiet circle ends the game when the player is ready.
 *
 * Clues take real seconds of rest to grow, so the suite skips the clock through
 * window.__cascadeState, the engine state GameCanvas exposes outside production. Everything a
 * player sees is still driven through real input; only the waiting is skipped.
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
  activeMechanics: string[]
  entities: EngineEntity[]
  nextId: number
  seed: EngineSeed | null
  unnamed: { id: string } | null
  foundBy: string[]
}

type CascadeWindow = Window & { __cascadeState?: EngineState }

interface MutateBody {
  isNaming?: boolean
  wave: number
  category: string
  options: string[]
}

const NAME = 'ORBIT GARDEN DELUXE'
const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')
// The rules the mock picks whenever a run offers them, so the familiar set still arrives in a varied order.
const PREFER = ['arrow_keys', 'stars', 'chasers', 'blaster', 'combo_chain', 'score_rush']
const MIDDLE = ['modifier', 'power', 'threat']

async function quietTelemetry(page: Page) {
  await page.route(/\/api\/(game-events|site-visits)/, (route) => route.fulfill({ status: 503, json: {} }))
}

/** Picks a preferred mechanic when offered, else the run's own leaning; one delayed wave can simulate a slow reply. */
async function mockMutations(page: Page, opts: { delayWave?: number; delayMs?: number } = {}) {
  const requests: MutateBody[] = []
  await page.route('**/api/cascade/mutate', async (route) => {
    const body = route.request().postDataJSON() as MutateBody
    requests.push(body)
    if (body.isNaming) {
      return route.fulfill({ json: { gameName: NAME, tagline: 'A small universe that grew around you.' } })
    }
    if (body.wave === opts.delayWave) await new Promise((r) => setTimeout(r, opts.delayMs ?? 0))
    const id = body.options.find((o) => PREFER.includes(o)) ?? body.options[0]
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
      activeMechanics: [...s.activeMechanics],
      entities: s.entities.map((e) => ({ ...e })),
      nextId: s.nextId,
      seed: s.seed ? { ...s.seed } : null,
      unnamed: s.unnamed ? { id: s.unnamed.id } : null,
      foundBy: [...s.foundBy],
    }
  })
}

/** Skips the wait before the next clue appears. */
async function bringClue(page: Page) {
  await page.evaluate(() => {
    const s = (window as CascadeWindow).__cascadeState
    if (!s) return
    s.waveTime = 999
    s.quietUntil = 0
  })
  await expect.poll(async () => (await engine(page)).seed).not.toBeNull()
}

/** Skips the rest a clue needs to open, as if the player had waited beside it. */
async function restUntilOpen(page: Page) {
  await page.evaluate(() => {
    const s = (window as CascadeWindow).__cascadeState
    if (s?.seed) s.seed.growth = 0.999
  })
  await expect.poll(async () => (await engine(page)).seed).toBeNull()
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

/** Brings a clue, rests until it opens, and lets the rule be named: the whole path of a player who only rests. */
async function discover(page: Page, number: number) {
  const wave = (await engine(page)).wave
  await bringClue(page)
  await restUntilOpen(page)
  await expect.poll(async () => (await engine(page)).activeMechanics.length).toBe(number)
  expect((await engine(page)).wave).toBe(wave + 1)
  await waitForName(page)
  await expect(named(page)).toBeVisible()
}

/** Brings the closing circle and rests there until the game finishes. */
async function finish(page: Page) {
  await bringClue(page)
  expect((await engine(page)).seed?.id).toBe('ending')
  await restUntilOpen(page)
}

/** Steers the orb with the arrow keys until it reaches the clue, the way a keyboard player would. */
async function steerToClue(page: Page) {
  const held = new Set<string>()
  for (let i = 0; i < 60; i++) {
    const s = await engine(page)
    if (!s.seed) break
    const want = new Set<string>()
    if (Math.abs(s.seed.x - s.px) > 8) want.add(s.seed.x < s.px ? 'ArrowLeft' : 'ArrowRight')
    if (Math.abs(s.seed.y - s.py) > 8) want.add(s.seed.y < s.py ? 'ArrowUp' : 'ArrowDown')
    for (const k of held) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k) }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k) }
    await page.waitForTimeout(60)
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

async function openGame(page: Page) {
  await quietTelemetry(page)
  await page.goto('/games/the-mutation')
  await expect(title(page)).toBeVisible()
}

const finaleDialog = (page: Page) => page.getByRole('dialog', { name: 'Your game is finished' })

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

/** Plays a whole run against a server that is down, returning the rule names in the order they were found. */
async function playOfflineRun(page: Page): Promise<string[]> {
  const titles: string[] = []
  for (let n = 1; n <= 6; n++) {
    await discover(page, n)
    titles.push(((await named(page).locator('p').first().textContent()) ?? '').trim())
  }
  return titles
}

const OFFLINE_TITLES: Record<string, string> = {
  arrow_keys: 'IT CAN MOVE', mouse_follow: 'IT FOLLOWS YOU', stars: 'STARS ARRIVE', pulse_gems: 'BREATHING GEMS',
  chasers: 'SHY SHADOWS', sweepers: 'TIDES', blaster: 'A LANTERN', phase_dash: 'GLIDE',
  combo_chain: 'RHYTHM', gravity_well: 'GENTLE PULL', score_rush: 'THE BLOOM',
}

test.describe('The Shapeshifter', () => {
  test('a keyboard player finds every rule through play, never through an announcement, and plays again', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const requests = await mockMutations(page)
    await openGame(page)

    await expect(title(page).getByRole('heading', { name: 'THE SHAPESHIFTER' })).toBeVisible()
    await expect(title(page).getByText('Nothing here can hurt you.', { exact: false })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Click the orb, or press Space.')).toBeVisible()
    await expect(page.getByText('No rules yet', { exact: true })).toBeVisible()
    // Light still gathers, but no running count of it is shown while playing
    await expect(page.getByText(/^light$/)).toHaveCount(0)

    // Pulsing the orb is what brings the first clue
    for (let i = 1; i <= 3; i++) {
      await page.keyboard.press(' ')
      await expect.poll(async () => (await engine(page)).score).toBe(i)
    }
    await expect.poll(async () => (await engine(page)).seed?.id).toBe('arrow_keys')
    await expect(page.getByText('Something is growing. Press Space, or just rest.')).toBeVisible()
    // The clue is described, never named
    await expect(status(page)).toHaveText('Something new is growing close to your orb: a small sign of four arrows. Pulse the orb, or rest, and it will open.')
    await expect(page.getByText(/WAVE 1/)).toHaveCount(0)

    // More pulses help it grow until it opens, without any card stopping the game
    for (let i = 0; i < 6 && (await engine(page)).seed; i++) await page.keyboard.press(' ')
    await expect.poll(async () => (await engine(page)).activeMechanics).toEqual(['arrow_keys'])
    expect((await engine(page)).foundBy).toEqual(['gathered'])
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(status(page)).toHaveText('It opened. Your orb can move now.')
    await expect(page.getByText('1 of 6 rules found', { exact: true })).toBeVisible()
    await expect(named(page)).toHaveCount(0)

    // Moving is feeling it, and only then is it named
    const before = await engine(page)
    await page.keyboard.down('ArrowRight')
    await expect.poll(async () => (await engine(page)).px).toBeGreaterThan(before.px + 40)
    await page.keyboard.up('ArrowRight')
    await expect(named(page)).toContainText('WAVE 1 ARROW_KEYS')
    await expect(status(page)).toHaveText('WAVE 1 ARROW_KEYS. The movement rule arrives. Arrow keys or WASD to move.')

    // The next clue is found by going to it
    await bringClue(page)
    const seed = (await engine(page)).seed
    if (!seed) throw new Error('no clue')
    await expect(status(page)).toHaveText(/^Something new is growing (above|below|to the)[a-z ]* your orb: a faint (star|gem) outline\. Go to it, gather light, or rest, and it will open\.$/)
    await steerToClue(page)
    await expect.poll(async () => (await engine(page)).activeMechanics.length).toBe(2)
    expect((await engine(page)).foundBy[1]).toBe('went')
    await waitForName(page)

    for (let n = 3; n <= 6; n++) await discover(page, n)
    const rules = (await engine(page)).activeMechanics
    expect([...rules].sort()).toEqual([...PREFER].sort())
    expect(rules[1]).toBe('stars')
    expect(rules[5]).toBe('score_rush')
    // The bloom's glow is real but never counted out on screen.
    expect((await engine(page)).multiplier).toBeGreaterThanOrEqual(3)
    await expect(page.getByText(/×\s*glow/)).toHaveCount(0)

    // The ending is found too: a quiet circle the player goes to, or rests beside, when ready
    await bringClue(page)
    await expect(page.getByText('When you are ready, go to the circle, or rest.')).toBeVisible()
    await expect(status(page)).toHaveText(/^A small circle of light has appeared .*your game will finish\.$/)
    await restUntilOpen(page)

    const finale = finaleDialog(page)
    await expect(finale).toBeVisible()
    const heading = finale.getByRole('heading', { name: `Your game is finished. It is called ${NAME}` })
    await expect(heading).toBeFocused()
    await expect(status(page)).toHaveText('Your game is finished.')
    // The closing line tells back how the rules were found, in words, never counted
    await expect(finale.getByText('Nobody told you the rules. Some you went looking for, some opened while you gathered light, and some grew while you rested.', { exact: false })).toBeVisible()
    // The run is a picture of the path it took, not a tally of what it scored
    await expect(finale.getByTestId('keepsake-canvas')).toHaveAccessibleDescription(/WAVE 1 ARROW_KEYS \(blue circle\).*WAVE 6 SCORE_RUSH \(pink flower\)/)
    await expect(finale.getByText(/longest rhythm|lights gathered|^time$|\d+ (rules|lights)/)).toHaveCount(0)
    await expect(finale.getByText('Play again and its rules will arrive in a different order.')).toBeVisible()

    const categories = requests.filter((r) => !r.isNaming).map((r) => r.category)
    expect(categories.slice(0, 2)).toEqual(['movement', 'collectible'])
    expect([...categories.slice(2, 5)].sort()).toEqual(MIDDLE)
    expect(categories[5]).toBe('climax')
    expect(requests.filter((r) => r.isNaming)).toHaveLength(1)

    await expect(finale.getByRole('button', { name: 'PLAY AGAIN' })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(title(page)).toBeVisible()
    await expect(title(page).getByRole('button', { name: 'BEGIN' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByText('No rules yet', { exact: true })).toBeVisible()
    const fresh = await engine(page)
    expect(fresh).toMatchObject({ wave: 0, score: 0, activeMechanics: [], seed: null, foundBy: [] })
    // Regression: the old state survived Play Again and the next run ended instantly
    await page.waitForTimeout(300)
    await expect(finaleDialog(page)).toBeHidden()
    expect(errors).toEqual([])
  })

  test('a player who only rests still moves on: the clue grows by itself, a hint comes, then the name', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')

    // No input at all: the first clue appears after a short rest and grows while the orb waits
    await expect.poll(async () => (await engine(page)).seed?.id, { timeout: 6000 }).toBe('arrow_keys')
    const growing = (await engine(page)).seed?.growth ?? 0
    await expect.poll(async () => (await engine(page)).seed?.growth ?? 1).toBeGreaterThan(growing)
    await expect.poll(async () => (await engine(page)).activeMechanics, { timeout: 10000 }).toEqual(['arrow_keys'])
    expect((await engine(page)).foundBy).toEqual(['rested'])
    await expect(status(page)).toHaveText('It opened. Your orb can move now.')

    // Still resting: a quiet hint, not the name, arrives first
    await expect(page.locator('span').filter({ hasText: 'Arrow keys or WASD to move.' })).toBeVisible({ timeout: 8000 })
    await expect(status(page)).toHaveText('Arrow keys or WASD to move.')
    await expect(named(page)).toHaveCount(0)

    await waitForName(page)
    await expect(named(page)).toContainText('WAVE 1 ARROW_KEYS')
    // A pause after the name, so nothing new grows over it
    await page.waitForTimeout(1500)
    expect((await engine(page)).seed).toBeNull()
  })

  test('with the server down, each run still grows its own rules in a new order and is named truthfully', async ({ page }) => {
    await page.route('**/api/cascade/mutate', (route) => route.fulfill({ status: 500, json: { error: 'down' } }))
    await openGame(page)
    await page.getByRole('button', { name: 'BEGIN' }).click()

    const first = await playOfflineRun(page)
    const firstRules = (await engine(page)).activeMechanics
    expect(first).toEqual(firstRules.map((id) => OFFLINE_TITLES[id]))

    await finish(page)
    const finale = finaleDialog(page)
    // Nobody moved, so the game is named for a gentle player, from the rules it grew and their order
    await expect(finale.getByRole('heading', { name: /QUIET (STARS|GEMS) & (SHADOWS|TIDES|LANTERNS|GLIDES|RHYTHMS|GENTLE PULL)$/ })).toBeFocused()
    // The tagline is drawn from this run: what was gathered, and the latest rule it grew
    await expect(finale.getByText(/^A game for someone who let the (stars|gems) drift their way (among the wandering shadows|as the tides came and went|by lantern light|in quick, quiet glides|in an easy rhythm|in the gentle pull)\.$/)).toBeVisible()
    await expect(finale.getByText('Nobody told you the rules. Each one grew while you simply rested.', { exact: false })).toBeVisible()
    await expect(finale.getByText(/(error|failed|\bAI\b)/)).toHaveCount(0)

    await finale.getByRole('button', { name: 'PLAY AGAIN' }).click()
    await page.getByRole('button', { name: 'BEGIN' }).click()
    await playOfflineRun(page)
    const secondRules = (await engine(page)).activeMechanics
    const order = (ids: string[]) => ids.map((id) => Object.keys(OFFLINE_TITLES).indexOf(id) >> 1).join()
    expect(order(secondRules)).not.toBe(order(firstRules))
  })

  test('a slow reply only delays the clue: play never stops, and the next clue asks for the next step', async ({ page }) => {
    // Regression: a slow first reply used to land after its wave and be replayed as the second rule
    const requests = await mockMutations(page, { delayWave: 0, delayMs: 1500 })
    await openGame(page)
    await page.keyboard.press('Enter')
    await page.evaluate(() => {
      const s = (window as CascadeWindow).__cascadeState
      if (s) s.waveTime = 999
    })
    await page.waitForTimeout(500)
    expect((await engine(page)).seed).toBeNull()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect.poll(async () => (await engine(page)).seed?.id, { timeout: 5000 }).toBe('arrow_keys')
    await restUntilOpen(page)
    await waitForName(page)
    await discover(page, 2)

    expect((await engine(page)).activeMechanics).toEqual(['arrow_keys', 'stars'])
    expect(requests.filter((r) => r.wave === 0)).toHaveLength(1)
  })

  test('a new rule never takes the keys away: the game keeps focus and keeps moving as it opens', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    await discover(page, 1)
    const canvas = page.getByRole('application', { name: 'The Shapeshifter game area' })
    await expect(canvas).toBeFocused()

    await page.keyboard.down('ArrowDown')
    await bringClue(page)
    await restUntilOpen(page)
    await page.keyboard.up('ArrowDown')
    const y = (await engine(page)).py
    await page.keyboard.down('ArrowUp')
    await expect.poll(async () => (await engine(page)).py).toBeLessThan(y - 20)
    await page.keyboard.up('ArrowUp')
    await expect(canvas).toBeFocused()
    await page.keyboard.press(' ')
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })

  test('pause freezes the clock and the growing clue, resumes, and can start over', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    await discover(page, 1)
    await bringClue(page)

    await page.keyboard.press('Escape')
    const paused = page.getByRole('dialog', { name: 'Paused' })
    await expect(paused).toBeVisible()
    // The pause keys stay folded behind a small Keys toggle until asked for
    await expect(paused.getByText('Esc or P pauses and resumes.')).toBeHidden()
    await paused.getByText('Keys', { exact: true }).click()
    await expect(paused.getByText('Esc or P pauses and resumes.')).toBeVisible()
    const frozen = await engine(page)
    await page.waitForTimeout(400)
    const still = await engine(page)
    expect(still.totalTime).toBe(frozen.totalTime)
    expect(still.seed?.growth).toBe(frozen.seed?.growth)

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
    expect(await engine(page)).toMatchObject({ wave: 0, score: 0, activeMechanics: [], seed: null })
  })

  test('the pause button sits outside the playing field', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    const field = await page.getByRole('application', { name: 'The Shapeshifter game area' }).boundingBox()
    const pause = await page.getByRole('button', { name: 'Pause' }).boundingBox()
    if (!field || !pause) throw new Error('layout missing')
    expect(pause.y).toBeGreaterThanOrEqual(field.y + field.height)
  })

  test('keyboard steers the follow control and the mouse aims it', async ({ page }) => {
    await page.route('**/api/cascade/mutate', (route) =>
      route.fulfill({ json: { mechanicId: 'mouse_follow', title: 'FOLLOW ME', description: 'd', flavorText: '' } })
    )
    await openGame(page)
    await page.keyboard.press('Enter')
    await discover(page, 1)
    expect((await engine(page)).activeMechanics).toEqual(['mouse_follow'])

    const start = await engine(page)
    await page.keyboard.down('ArrowUp')
    await expect.poll(async () => (await engine(page)).py).toBeLessThan(start.py - 40)
    await page.keyboard.up('ArrowUp')

    const box = await page.getByRole('application', { name: 'The Shapeshifter game area' }).boundingBox()
    if (!box) throw new Error('canvas missing')
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.5)
    await expect.poll(async () => (await engine(page)).px).toBeGreaterThan(500)
  })

  test('the bloom turns waiting shadows into stars, and no glow fades while the player rests', async ({ page }) => {
    // Regression: a pause once lowered the glow, and the bloom's bonus ran out on a timer of its own
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    for (let n = 1; n <= 5; n++) await discover(page, n)
    await bringClue(page)
    await shadowOnOrb(page)
    await page.evaluate(() => {
      const s = (window as CascadeWindow).__cascadeState
      if (s) s.entities.push({ id: s.nextId++, type: 'chaser', x: 40, y: 40, vx: 0, vy: 0, size: 8, alpha: 1, active: true, age: 0, hp: 1 })
    })
    await restUntilOpen(page)
    const bloom = await engine(page)
    expect(bloom.activeMechanics).toContain('score_rush')
    expect(bloom.multiplier).toBe(3)
    expect(bloom.entities.filter((e) => e.type === 'chaser')).toHaveLength(0)
    // The bloom is plain to see, so it is named almost at once
    await expect(named(page)).toContainText('WAVE 6 SCORE_RUSH', { timeout: 4000 })
    await expect(page.getByText('the bloom')).toBeVisible()

    const resting = (await engine(page)).combo
    await page.waitForTimeout(4000)
    expect((await engine(page)).combo).toBeGreaterThanOrEqual(resting)
    expect((await engine(page)).multiplier).toBeGreaterThanOrEqual(3)
  })

  test('a shadow that reaches the orb only nudges it: no light is lost and nothing shakes', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    for (let n = 1; n <= 3; n++) await discover(page, n)
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
    await openGame(page)
    await page.keyboard.press('Enter')
    for (let n = 1; n <= 6; n++) await discover(page, n)
    await bringClue(page)
    await page.keyboard.down('ArrowDown')
    await restUntilOpen(page)
    const finale = finaleDialog(page)
    await expect(finale.getByRole('heading', { name: /ORBIT GARDEN DELUXE/ })).toBeFocused()
    await page.waitForTimeout(500)
    await page.keyboard.up('ArrowDown')
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown')
    await expect(finale.getByRole('button', { name: 'PLAY AGAIN' })).toBeInViewport({ ratio: 1 })
    await expect(finale.getByRole('heading', { name: /ORBIT GARDEN DELUXE/ })).toBeInViewport({ ratio: 1 })
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    // The map is drawn wide enough that its legend can be read, and still fits beside the name
    const map = await finale.getByTestId('keepsake-canvas').boundingBox()
    expect(map?.width ?? 0).toBeGreaterThanOrEqual(400)
    expect((map?.y ?? 0) + (map?.height ?? 0)).toBeLessThanOrEqual(800 + 50)

    // Away from the game, the arrow keys scroll the page as usual.
    await page.getByRole('link', { name: /VeryGoodMelon/ }).first().focus()
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })

  test('the playfield is drawn in the site\'s colours and follows a dark theme', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    const corner = () =>
      page.getByRole('application', { name: 'The Shapeshifter game area' }).evaluate((canvas: HTMLCanvasElement) => {
        const [r, g, b] = canvas.getContext('2d')!.getImageData(3, 3, 1, 1).data
        const probe = document.createElement('div')
        probe.style.background = 'var(--card-bg)'
        document.body.append(probe)
        const css = getComputedStyle(probe).backgroundColor
        probe.remove()
        return { pixel: `rgb(${r}, ${g}, ${b})`, css }
      })
    await expect.poll(async () => { const c = await corner(); return c.pixel === c.css }).toBe(true)
    const light = (await corner()).pixel

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await expect.poll(async () => { const c = await corner(); return c.pixel === c.css }).toBe(true)
    expect((await corner()).pixel).not.toBe(light)
  })

  test('a clue is drawn in the field where the engine says it grows', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    await bringClue(page)
    const { seed } = await engine(page)
    if (!seed) throw new Error('no clue')
    const drawn = await page.getByRole('application', { name: 'The Shapeshifter game area' }).evaluate((canvas: HTMLCanvasElement, at) => {
      const ctx = canvas.getContext('2d')!
      const bg = ctx.getImageData(3, 3, 1, 1).data.join()
      const here = ctx.getImageData(Math.round(at.x) - 12, Math.round(at.y) - 12, 24, 24).data
      let differing = 0
      for (let i = 0; i < here.length; i += 4) if (`${here[i]},${here[i + 1]},${here[i + 2]},${here[i + 3]}` !== bg) differing++
      return differing
    }, seed)
    expect(drawn).toBeGreaterThan(40)
  })

  test('has no accessibility violations on the title, while a clue grows, a rule is named, and the finale, light and dark', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    expect(await axeViolations(page)).toEqual([])
    await page.keyboard.press('Enter')
    await bringClue(page)
    expect(await axeViolations(page)).toEqual([])
    await restUntilOpen(page)
    await waitForName(page)
    await expect(named(page)).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.waitForTimeout(200)
    expect(await axeViolations(page)).toEqual([])
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
    for (let n = 2; n <= 6; n++) await discover(page, n)
    await finish(page)
    await expect(finaleDialog(page).getByRole('button', { name: 'PLAY AGAIN' })).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.waitForTimeout(200)
    expect(await axeViolations(page)).toEqual([])
  })

  test('the finale draws the path the orb took, coloured and shaped by each rule, ready to save', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    for (let n = 1; n <= 6; n++) {
      await discover(page, n)
      await page.keyboard.down(n % 2 ? 'ArrowRight' : 'ArrowUp')
      await page.waitForTimeout(250)
      await page.keyboard.up(n % 2 ? 'ArrowRight' : 'ArrowUp')
    }
    const recorded = await page.evaluate(() => (window as unknown as { __cascadeState: { path: { wave: number }[] } }).__cascadeState.path)
    expect(new Set(recorded.map((p) => p.wave))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6]))

    await finish(page)
    const finale = finaleDialog(page)
    await expect(finale.getByRole('heading', { name: new RegExp(NAME) })).toBeFocused()
    await expectKeepsakeSaves(page, {
      within: finale,
      fileName: /^the-shapeshifter-\d{4}-\d{2}-\d{2}\.png$/,
      describedAs: /path your orb took.*\(blue circle\), then .*\(gold star\).*\(pink flower\)/,
    })
    // Saving keeps the finale open: Enter on its buttons never starts a new run
    await finale.getByRole('button', { name: 'Save image' }).press('Enter')
    await expect(finale).toBeVisible()
    expect(errors).toEqual([])
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

    test('touch players get a tall field, a control they can use, and a pause button out of the way', async ({ page }) => {
      const requests = await mockMutations(page)
      await openGame(page)
      await expect(page.getByText('Tap to begin.')).toBeVisible()

      const canvas = page.getByRole('application', { name: 'The Shapeshifter game area' })
      const box = await canvas.boundingBox()
      if (!box) throw new Error('canvas missing')
      // Taller than wide, and more than half the screen
      expect(box.height).toBeGreaterThan(box.width)
      expect(box.height).toBeGreaterThan(844 * 0.5)

      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
      await expect(page.getByText('Tap the orb.')).toBeVisible()
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
      await expect.poll(async () => (await engine(page)).score).toBeGreaterThan(0)

      const pause = await page.getByRole('button', { name: 'Pause' }).boundingBox()
      expect(pause?.y ?? 0).toBeGreaterThanOrEqual(box.y + box.height)

      await bringClue(page)
      await expect(page.getByText('Something is growing. Tap the orb, or just rest.')).toBeVisible()
      await restUntilOpen(page)
      await waitForName(page)
      // Named with the touch control, not the keyboard one
      await expect(named(page)).toContainText('Drag your finger to guide the orb.')
      // The name never covers the whole field, and nothing needs dismissing
      const card = await named(page).locator('div').first().boundingBox()
      expect(card?.height ?? 999).toBeLessThan(box.height * 0.4)

      expect(requests[0].options).toEqual(['mouse_follow'])
      expect((await engine(page)).activeMechanics).toEqual(['mouse_follow'])

      await page.touchscreen.tap(box.x + box.width * 0.1, box.y + box.height * 0.5)
      await expect.poll(async () => (await engine(page)).px).toBeLessThan(250)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })

    test('with reduced motion the clue, the name and the finale are there at once, still, and fit the screen', async ({ page }) => {
      await mockMutations(page)
      await openGame(page)
      await page.getByRole('button', { name: 'BEGIN' }).tap()
      for (let n = 1; n <= 6; n++) await discover(page, n)
      await expect(page.locator('.animate-fade')).toHaveCount(0)
      await finish(page)
      const finale = finaleDialog(page)
      await expect(finale.getByTestId('keepsake-canvas')).toBeVisible()
      await expect(finale.getByRole('button', { name: 'PLAY AGAIN' })).toBeVisible()
      await expect(finale.locator('.animate-fade')).toHaveCount(0)
      // The tall phone field is drawn tall, across nearly the whole width of the screen
      const map = await finale.getByTestId('keepsake-canvas').boundingBox()
      expect(map?.width ?? 0).toBeGreaterThanOrEqual(320)
      expect(map?.height ?? 0).toBeGreaterThan((map?.width ?? 0) * 1.4)
      await expectKeepsakeSaves(page, { within: finale, fileName: /^the-shapeshifter-.*\.png$/ })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  })
})
