import { test, expect, type Page } from '@playwright/test'

/**
 * The Shapeshifter (/games/the-mutation): a canvas arcade game that adds one rule per wave.
 *
 * Waves end on a timer, so the suite fast-forwards them through window.__cascadeState,
 * the engine state GameCanvas exposes outside production. Everything a player sees is
 * still driven through real input; only the clock is skipped.
 */

interface EngineState {
  wave: number
  waveTime: number
  score: number
  px: number
  py: number
  combo: number
  comboTimer: number
  multiplier: number
  rushTimer: number
  totalTime: number
  activeMechanics: string[]
}

type CascadeWindow = Window & { __cascadeState?: EngineState }

interface MutateBody {
  isNaming?: boolean
  wave: number
  category: string
  options: string[]
}

const NAME = 'ORBIT GARDEN DELUXE'

async function quietTelemetry(page: Page) {
  await page.route(/\/api\/(game-events|site-visits)/, (route) => route.fulfill({ status: 503, json: {} }))
}

/** Picks the first offered mechanic; one delayed wave can be passed to simulate a slow reply. */
async function mockMutations(page: Page, opts: { delayWave?: number; delayMs?: number } = {}) {
  const requests: MutateBody[] = []
  await page.route('**/api/cascade/mutate', async (route) => {
    const body = route.request().postDataJSON() as MutateBody
    requests.push(body)
    if (body.isNaming) {
      return route.fulfill({ json: { gameName: NAME, tagline: 'A small universe that grew around you.' } })
    }
    if (body.wave === opts.delayWave) await new Promise((r) => setTimeout(r, opts.delayMs ?? 0))
    const id = body.options[0]
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
      wave: s.wave,
      waveTime: s.waveTime,
      score: s.score,
      px: s.px,
      py: s.py,
      combo: s.combo,
      comboTimer: s.comboTimer,
      multiplier: s.multiplier,
      rushTimer: s.rushTimer,
      totalTime: s.totalTime,
      activeMechanics: [...s.activeMechanics],
    }
  })
}

async function endWave(page: Page) {
  await page.evaluate(() => {
    const s = (window as CascadeWindow).__cascadeState
    if (s) s.waveTime = 999
  })
}

async function endRush(page: Page) {
  await page.evaluate(() => {
    const s = (window as CascadeWindow).__cascadeState
    if (s) s.rushTimer = 0
  })
}

async function openGame(page: Page) {
  await quietTelemetry(page)
  await page.goto('/games/the-mutation')
  await expect(page.getByRole('dialog', { name: /the game that builds itself/i })).toBeVisible()
}

/** Ends the current wave and accepts the mutation card with Enter. */
async function mutate(page: Page, number: number) {
  const wave = (await engine(page)).wave
  await endWave(page)
  const card = page.getByRole('dialog', { name: new RegExp(`^Mutation ${number} of 6`) })
  await expect(card).toBeVisible()
  await expect(card.getByRole('button')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(card).toBeHidden()
  await expect.poll(async () => (await engine(page)).activeMechanics.length).toBe(number)
  expect((await engine(page)).wave).toBe(wave + 1)
}

test.describe('The Shapeshifter', () => {
  test('a keyboard player goes from title through all six mutations to the finale and plays again', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const requests = await mockMutations(page)
    await openGame(page)

    await page.keyboard.press('Enter')
    await expect(page.getByText('CLICK THE ORB OR PRESS SPACE')).toBeVisible()
    await expect(page.getByText('WAVE 1/7')).toBeVisible()

    for (let i = 1; i <= 3; i++) {
      await page.keyboard.press(' ')
      await expect.poll(async () => (await engine(page)).score).toBe(i)
    }

    await mutate(page, 1)
    expect((await engine(page)).activeMechanics).toEqual(['arrow_keys'])
    await expect(page.getByText('WAVE 2/7')).toBeVisible()

    const before = await engine(page)
    await page.keyboard.down('ArrowRight')
    await expect.poll(async () => (await engine(page)).px).toBeGreaterThan(before.px + 40)
    await page.keyboard.up('ArrowRight')

    for (let n = 2; n <= 6; n++) await mutate(page, n)
    expect((await engine(page)).activeMechanics).toEqual([
      'arrow_keys', 'stars', 'chasers', 'blaster', 'combo_chain', 'score_rush',
    ])
    await expect(page.getByText('3x')).toBeVisible()

    await endRush(page)
    const finale = page.getByRole('dialog', { name: /Game complete/ })
    await expect(finale).toBeVisible()
    await expect(finale.getByRole('heading', { name: NAME })).toBeVisible()
    await expect(finale.getByRole('listitem')).toHaveCount(6)
    await expect(finale.getByText('WAVE 6 SCORE_RUSH')).toBeVisible()

    const categories = requests.filter((r) => !r.isNaming).map((r) => r.category)
    expect(categories).toEqual(['movement', 'collectible', 'threat', 'power', 'modifier', 'climax'])
    expect(requests.filter((r) => r.isNaming)).toHaveLength(1)

    await expect(finale.getByRole('button', { name: 'PLAY AGAIN' })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: /the game that builds itself/i })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.getByText('WAVE 1/7')).toBeVisible()
    const fresh = await engine(page)
    expect(fresh).toMatchObject({ wave: 0, score: 0, activeMechanics: [] })
    // Regression: the old state survived Play Again and the next run ended instantly
    await page.waitForTimeout(300)
    await expect(page.getByRole('dialog', { name: /Game complete/ })).toBeHidden()
    expect(errors).toEqual([])
  })

  test('the game finishes with built-in rules and a name when the server is down', async ({ page }) => {
    await page.route('**/api/cascade/mutate', (route) => route.fulfill({ status: 500, json: { error: 'down' } }))
    await openGame(page)
    await page.getByRole('button', { name: 'PRESS START' }).click()

    const titles = ['MOVEMENT ONLINE', 'STARS APPEARED', 'THEY SEE YOU', 'PEW PEW ONLINE', 'COMBO SYSTEM', 'FINAL RUSH']
    for (let n = 1; n <= 6; n++) {
      await endWave(page)
      const card = page.getByRole('dialog', { name: new RegExp(`^Mutation ${n} of 6`) })
      await expect(card.getByRole('heading', { name: titles[n - 1] })).toBeVisible()
      await card.getByRole('button').click()
      await expect(card).toBeHidden()
    }

    await endRush(page)
    const finale = page.getByRole('dialog', { name: /Game complete/ })
    const score = Math.floor((await engine(page)).score)
    await expect(finale.getByRole('heading', { name: `CASCADE #${score}` })).toBeVisible()
    await expect(finale.getByText(/(error|failed|AI)/)).toHaveCount(0)
  })

  test('the card waits while a slow mutation loads and the next wave asks for the next category', async ({ page }) => {
    // Regression: a slow first reply used to land after its wave and be replayed as the second mutation
    const requests = await mockMutations(page, { delayWave: 0, delayMs: 1500 })
    await openGame(page)
    await page.keyboard.press('Enter')
    await endWave(page)

    await expect(page.getByRole('dialog', { name: 'A new mutation is coming' })).toBeVisible()
    const card = page.getByRole('dialog', { name: /^Mutation 1 of 6: WAVE 1 ARROW_KEYS/ })
    await expect(card.getByRole('button', { name: 'PRESS ENTER' })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(card).toBeHidden()
    await mutate(page, 2)

    expect((await engine(page)).activeMechanics).toEqual(['arrow_keys', 'stars'])
    expect(requests.filter((r) => r.wave === 0)).toHaveLength(1)
  })

  test('a mutation card ignores held game keys and is not dismissed before it can be read', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    await endWave(page)

    const card = page.getByRole('dialog', { name: /^Mutation 1 of 6/ })
    await expect(card).toBeVisible()
    await page.keyboard.press('Enter')
    await page.keyboard.press(' ')
    await page.keyboard.press('ArrowLeft')
    await expect(card.getByRole('button', { name: 'PRESS ENTER' })).toBeVisible()
    await page.keyboard.press(' ')
    await expect(card).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(card).toBeHidden()
  })

  test('pause freezes the wave clock, resumes, and can start over', async ({ page }) => {
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    await mutate(page, 1)

    await page.keyboard.press('Escape')
    const paused = page.getByRole('dialog', { name: 'Paused' })
    await expect(paused).toBeVisible()
    const frozen = (await engine(page)).waveTime
    await page.waitForTimeout(400)
    expect((await engine(page)).waveTime).toBe(frozen)

    await paused.getByRole('button', { name: 'RESUME' }).click()
    await expect(paused).toBeHidden()
    await expect.poll(async () => (await engine(page)).waveTime).toBeGreaterThan(frozen)

    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(paused).toBeVisible()
    await page.keyboard.press('p')
    await expect(paused).toBeHidden()

    await page.keyboard.press('Escape')
    await paused.getByRole('button', { name: 'START OVER' }).click()
    await expect(page.getByRole('dialog', { name: /the game that builds itself/i })).toBeVisible()
    await page.keyboard.press('Enter')
    expect(await engine(page)).toMatchObject({ wave: 0, score: 0, activeMechanics: [] })
  })

  test('keyboard steers the follow control and the mouse aims it', async ({ page }) => {
    await page.route('**/api/cascade/mutate', (route) =>
      route.fulfill({ json: { mechanicId: 'mouse_follow', title: 'FOLLOW ME', description: 'd', flavorText: '' } })
    )
    await openGame(page)
    await page.keyboard.press('Enter')
    await mutate(page, 1)
    expect((await engine(page)).activeMechanics).toEqual(['mouse_follow'])

    const start = await engine(page)
    await page.keyboard.down('ArrowUp')
    await expect.poll(async () => (await engine(page)).py).toBeLessThan(start.py - 40)
    await page.keyboard.up('ArrowUp')

    const box = await page.getByRole('application', { name: 'Cascade game area' }).boundingBox()
    if (!box) throw new Error('canvas missing')
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.5)
    await expect.poll(async () => (await engine(page)).px).toBeGreaterThan(500)
  })

  test('the rush multiplier survives a broken combo', async ({ page }) => {
    // Regression: combo decay reset the multiplier to 1 in the middle of the 3x rush
    await mockMutations(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    for (let n = 1; n <= 6; n++) await mutate(page, n)
    expect((await engine(page)).multiplier).toBe(3)

    await page.evaluate(() => {
      const s = (window as CascadeWindow).__cascadeState
      if (s) { s.combo = 1; s.comboTimer = 0.01 }
    })
    await expect.poll(async () => (await engine(page)).combo).toBe(0)
    expect((await engine(page)).multiplier).toBe(3)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

    test('touch players only get a control they can use and can play by tapping', async ({ page }) => {
      const requests = await mockMutations(page)
      await openGame(page)
      await expect(page.getByText('Tap to begin.')).toBeVisible()

      const canvas = page.getByRole('application', { name: 'Cascade game area' })
      const box = await canvas.boundingBox()
      if (!box) throw new Error('canvas missing')
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
      await expect(page.getByText('TAP THE ORB')).toBeVisible()
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
      await expect.poll(async () => (await engine(page)).score).toBeGreaterThan(0)

      await endWave(page)
      const card = page.getByRole('dialog', { name: /^Mutation 1 of 6/ })
      await expect(card.getByText('DRAG your finger to guide the orb')).toBeVisible()
      await card.getByRole('button', { name: 'TAP TO CONTINUE' }).tap()
      await expect(card).toBeHidden()

      expect(requests[0].options).toEqual(['mouse_follow'])
      expect((await engine(page)).activeMechanics).toEqual(['mouse_follow'])

      await page.touchscreen.tap(box.x + box.width * 0.1, box.y + box.height * 0.5)
      await expect.poll(async () => (await engine(page)).px).toBeLessThan(250)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  })
})
