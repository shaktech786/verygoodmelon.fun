import { test, expect, type Page } from '@playwright/test'
import { FLASH_STEP, MAX_FLASHES_PER_SECOND, MEAN_LUMINANCE_SOURCE, largestStep, mostFlashesInASecond, type LuminanceSample } from './helpers/flash'

/**
 * No flash (PLAN.md 12.1): the two S3 moments are measured, frame by frame, as the pixels the player sees.
 * A change is a step of more than 10% in relative luminance between frames; no second may hold more than three.
 *
 * The Shapeshifter's bloom is a CSS animation, so it is paused and stepped through at 60 frames a second and each
 * frame is photographed, which makes the count the same on a slow runner as on a fast one. The Gardener's light
 * shift is drawn on a canvas from the clock, so its canvas is read on every frame it is painted.
 */

type CascadeWindow = Window & { __cascadeState?: { waveTime: number; quietUntil: number; seeds: { id: string; growth: number }[]; unnamed: unknown } }

const FRAME_MS = 1000 / 60

function assertNoFlash(samples: LuminanceSample[], minimumFrames: number) {
  expect(samples.length).toBeGreaterThanOrEqual(minimumFrames)
  // The sampler has to see the change it is checking
  const seen = samples.map((s) => s.luminance)
  expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(0)
  expect(largestStep(samples)).toBeLessThanOrEqual(FLASH_STEP)
  expect(mostFlashesInASecond(samples)).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND)
}

async function quietTelemetry(page: Page) {
  await page.route(/\/api\/(game-events|site-visits)/, (route) => route.fulfill({ status: 503, json: {} }))
}

test('The Shapeshifter bloom fades in over 1.6 s without a flash, seen frame by frame', async ({ page }) => {
  test.slow()
  await quietTelemetry(page)
  await page.route('**/api/cascade/mutate', async (route) => {
    const body = route.request().postDataJSON() as { isNaming?: boolean; wave: number; category: string; options: string[] }
    if (body.isNaming) return route.fulfill({ json: { gameName: 'ORBIT GARDEN', tagline: 'A small universe that grew around you.' } })
    return route.fulfill({
      json: { mechanicId: body.options[0], title: `WAVE ${body.wave + 1}`, description: `The ${body.category} rule arrives.`, flavorText: 'Something shifted.' },
    })
  })
  await page.goto('/games/the-mutation')
  await expect(page.getByRole('dialog', { name: 'The Shapeshifter', exact: true })).toBeVisible()
  await page.waitForFunction(() => (window as CascadeWindow).__cascadeState !== undefined)
  await page.keyboard.press('Enter')

  // The first clue: skip the waits, as a player resting beside it would, and let its rule be named
  await expect.poll(async () => {
    await page.evaluate(() => {
      const s = (window as CascadeWindow).__cascadeState
      if (s) {
        s.waveTime = 999
        s.quietUntil = 0
      }
    })
    return page.evaluate(() => (window as CascadeWindow).__cascadeState?.seeds.length ?? 0)
  }, { timeout: 15_000 }).toBeGreaterThan(0)
  await page.evaluate(() => {
    const s = (window as CascadeWindow).__cascadeState
    if (s?.seeds[0]) s.seeds[0].growth = 0.999
  })
  await expect.poll(() => page.evaluate(() => (window as CascadeWindow).__cascadeState?.seeds.length)).toBe(0)
  await expect.poll(async () => {
    await page.evaluate(() => {
      const s = (window as CascadeWindow).__cascadeState
      if (s) s.waveTime = 999
    })
    return page.evaluate(() => (window as CascadeWindow).__cascadeState?.unnamed)
  }).toBeNull()

  const bloom = page.getByTestId('rule-named').locator('.shapeshifter-bloom')
  await expect(bloom).toHaveCount(1)
  const duration = await bloom.evaluate((el) => {
    const [animation] = el.getAnimations()
    animation.pause()
    return Number(animation.effect!.getComputedTiming().duration)
  })
  expect(duration).toBe(1600)

  // The wash behind the card, which is the region that changes
  const box = await bloom.boundingBox()
  const viewport = page.viewportSize()!
  const x = Math.max(0, Math.floor(box!.x))
  const y = Math.max(0, Math.floor(box!.y))
  const clip = { x, y, width: Math.min(viewport.width - x, Math.ceil(box!.width)), height: Math.min(viewport.height - y, Math.ceil(box!.height)) }

  const frames: { at: number; png: string }[] = []
  for (let at = 0; at <= duration + FRAME_MS; at += FRAME_MS) {
    await bloom.evaluate((el, time) => {
      el.getAnimations()[0].currentTime = time
    }, Math.min(at, duration))
    frames.push({ at, png: (await page.screenshot({ clip, type: 'png' })).toString('base64') })
  }

  const luminances = await page.evaluate(async ({ shots, source }) => {
    const mean = (0, eval)(source) as (data: Uint8ClampedArray) => number
    const out: number[] = []
    for (const shot of shots) {
      const blob = await (await fetch(`data:image/png;base64,${shot}`)).blob()
      const image = await createImageBitmap(blob)
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      out.push(mean(ctx.getImageData(0, 0, canvas.width, canvas.height).data))
    }
    return out
  }, { shots: frames.map((f) => f.png), source: MEAN_LUMINANCE_SOURCE })

  assertNoFlash(frames.map((f, i) => ({ at: f.at, luminance: luminances[i] })), 90)
})

test('The Gardener light shift cross-fades the sky without a flash, read on every painted frame', async ({ page }) => {
  await page.route('**/api/game-events', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/site-visits', (route) => route.fulfill({ json: {} }))
  const now = Date.now()
  const plant = (id: string, type: string, x: number) => ({ id, type, x, y: 0.6, scale: 1, colorSeed: 0.3, phase: 0, plantedAt: now - 60_000 })
  await page.addInitScript(([key, value]) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem(key, value)
  }, ['verygoodmelon:calm-garden', JSON.stringify({ version: 2, lastVisit: now, plants: [plant('a', 'poppy', 0.2), plant('b', 'poppy', 0.5), plant('c', 'willow', 0.8)] })] as const)

  await page.goto('/games/quiet-grove')
  const garden = page.getByRole('application', { name: 'Your garden' })
  await expect(garden).toBeVisible()
  await expect(garden).toHaveAttribute('width', /\d+/)
  const sit = page.getByRole('button', { name: 'Sit with your garden' })
  await expect(sit).toBeEnabled()
  // Entrance fades must be over before the first frame is read
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))))

  // Read the canvas on every frame from before the click until well past the 1.6 s fade
  await page.evaluate((source) => {
    const mean = (0, eval)(source) as (data: Uint8ClampedArray) => number
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[aria-label="Your garden"]')!
    const probe = document.createElement('canvas')
    probe.width = 48
    probe.height = 48
    const ctx = probe.getContext('2d', { willReadFrequently: true })!
    const samples: { at: number; luminance: number }[] = []
    const flash = { samples, done: false }
    ;(window as unknown as { __flash: typeof flash }).__flash = flash
    const start = performance.now()
    const frame = (time: number) => {
      ctx.drawImage(canvas, 0, 0, probe.width, probe.height)
      samples.push({ at: time, luminance: mean(ctx.getImageData(0, 0, probe.width, probe.height).data) })
      if (time - start < 3200) requestAnimationFrame(frame)
      else flash.done = true
    }
    requestAnimationFrame(frame)
  }, MEAN_LUMINANCE_SOURCE)
  await sit.click()
  await expect(page.getByRole('dialog', { name: 'Sitting with your garden' })).toBeVisible()
  await page.waitForFunction(() => (window as unknown as { __flash?: { done: boolean } }).__flash?.done === true)

  const samples = await page.evaluate(() => (window as unknown as { __flash: { samples: { at: number; luminance: number }[] } }).__flash.samples)
  assertNoFlash(samples, 20)
})

test('the flash detector catches a real strobe', () => {
  const strobe: LuminanceSample[] = Array.from({ length: 30 }, (_, i) => ({ at: i * FRAME_MS, luminance: i % 2 ? 0.9 : 0.1 }))
  expect(largestStep(strobe)).toBeGreaterThan(FLASH_STEP)
  expect(mostFlashesInASecond(strobe)).toBeGreaterThan(MAX_FLASHES_PER_SECOND)
})
