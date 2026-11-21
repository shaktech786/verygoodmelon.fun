import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

/**
 * The Keeper (/games/the-slow-post): seal one worry, come back after the chosen date,
 * answer "Did it happen?". Everything lives in localStorage; a fake clock stands in for
 * the days in between.
 */

const URL = '/games/the-slow-post'
const STORAGE_KEY = 'verygoodmelon:worry-capsule'
const DRAFT_KEY = 'verygoodmelon:worry-capsule:draft'
const KIND = 'verygoodmelon.fun/worry-capsules'
const DAY = 86_400_000
const T0 = new Date('2026-11-21T10:00:00').getTime()
const WORRY = 'That I will freeze in the interview on Thursday'
const AXE = path.join(process.cwd(), 'node_modules/axe-core/axe.min.js')

interface StoredCapsule {
  id: string
  worry: string
  horizon: string
  sealedAt: string
  opensOn: string
  opening: { at: string; outcome: string; note: string } | null
  lookedIn?: string[]
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

async function stubSiteApis(page: Page) {
  for (const api of ['**/api/game-events', '**/api/site-visits']) {
    await page.route(api, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  }
}

async function openKeeper(page: Page, at = T0) {
  await stubSiteApis(page)
  await page.clock.install({ time: at })
  await page.goto(URL)
}

async function returnOn(page: Page, at: number) {
  await page.clock.setSystemTime(at)
  await page.reload()
}

async function stored(page: Page): Promise<StoredCapsule[]> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  return raw ? (JSON.parse(raw) as { capsules: StoredCapsule[] }).capsules : []
}

async function seed(page: Page, capsules: StoredCapsule[]) {
  await page.evaluate(
    ([key, kind, list]) => localStorage.setItem(key as string, JSON.stringify({ kind, version: 1, capsules: list })),
    [STORAGE_KEY, KIND, capsules] as const,
  )
  await page.reload()
}

function localKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function capsule(id: string, opensInDays: number, opening: StoredCapsule['opening'] = null): StoredCapsule {
  return {
    id,
    worry: `Worry number ${id}`,
    horizon: 'week',
    sealedAt: new Date(T0 - 7 * DAY).toISOString(),
    opensOn: localKey(T0 + opensInDays * DAY),
    opening,
  }
}

const composerHeading = (page: Page) => page.getByRole('heading', { name: 'What’s on your mind?' })
const shelfHeading = (page: Page) => page.getByRole('heading', { name: 'Kept for you' })

async function sealWorry(page: Page, worry = WORRY, horizon = 'In about a week') {
  await page.getByLabel('Your worry').fill(worry)
  await page.getByRole('radio', { name: new RegExp(horizon) }).check()
  await page.getByRole('button', { name: 'Fold it up' }).click()
  await page.getByRole('button', { name: 'Seal it' }).click()
  await expect(page.getByRole('heading', { name: 'Sealed.' })).toBeFocused()
}

async function runAxe(page: Page) {
  // Contrast is judged on the settled page, not part-way through a fade-in.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.effect?.getComputedTiming().endTime === Infinity || a.playState !== 'running'),
  )
  await page.addScriptTag({ path: AXE })
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: Element) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe
    const result = await axe.run(document.querySelector('main') ?? document.body)
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  })
}

test.describe('The Keeper', () => {
  test('first visit: an empty, calm composer with the help line and no blame', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openKeeper(page)
    await expect(composerHeading(page)).toBeVisible()
    await expect(page.getByText('Sealed some before, on another device')).toBeVisible()
    await expect(page.getByRole('link', { name: 'findahelpline.com' })).toHaveAttribute('href', 'https://findahelpline.com')
    await expect(page.getByRole('button', { name: 'Fold it up' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Back to the shelf' })).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('sealing: review, change it, then seal with a calendar date and the browser-only promise', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openKeeper(page)
    await page.getByLabel('Your worry').fill('First draft')
    await page.getByRole('radio', { name: /In about a month/ }).check()
    await page.getByRole('button', { name: 'Fold it up' }).click()

    await expect(page.getByRole('heading', { name: 'Ready to seal it?' })).toBeFocused()
    await expect(page.getByText('It comes back to you on Monday, December 21.')).toBeVisible()
    await expect(page.getByText('It lives only in this browser, on this device.')).toBeVisible()
    await page.getByRole('button', { name: 'Change it' }).click()
    await expect(page.getByLabel('Your worry')).toHaveValue('First draft')
    await expect(page.getByRole('radio', { name: /In about a month/ })).toBeChecked()
    expect(await stored(page)).toEqual([])

    await page.getByLabel('Your worry').fill(WORRY)
    await page.getByRole('button', { name: 'Fold it up' }).click()
    await page.getByRole('button', { name: 'Seal it' }).click()
    await expect(page.getByRole('heading', { name: 'Sealed.' })).toBeFocused()
    await expect(page.getByText('It comes back on Monday, December 21.')).toBeVisible()

    const [saved] = await stored(page)
    expect(saved).toMatchObject({ worry: WORRY, horizon: 'month', opensOn: '2026-12-21', opening: null })
    await page.getByRole('button', { name: 'Done' }).click()
    await expect(shelfHeading(page)).toBeFocused()
    const jar = page.getByRole('button', { name: 'Opens Monday, December 21, sealed Saturday, November 21' })
    await expect(jar).toBeVisible()
    await expect(jar).toContainText('Opens Dec 21')
    await expect(jar).toContainText('sealed Nov 21')
    expect(errors).toEqual([])
  })

  test('a half-written worry survives a reload, comes back with a gentle note, and is cleared once sealed', async ({ page }) => {
    await openKeeper(page)
    await page.getByLabel('Your worry').fill('That the landlord')
    await page.getByRole('radio', { name: /In three months/ }).check()
    await page.reload()

    await expect(composerHeading(page)).toBeVisible()
    await expect(page.getByLabel('Your worry')).toHaveValue('That the landlord')
    await expect(page.getByRole('radio', { name: /In three months/ })).toBeChecked()
    await expect(page.getByText('You were partway through this. It was kept for you, just as you left it.')).toBeVisible()

    await page.getByLabel('Your worry').fill('That the landlord will not renew')
    await page.getByRole('button', { name: 'Fold it up' }).click()
    await page.getByRole('button', { name: 'Seal it' }).click()
    await expect(page.getByRole('heading', { name: 'Sealed.' })).toBeFocused()
    expect((await stored(page))[0]).toMatchObject({ worry: 'That the landlord will not renew', horizon: 'season' })
    expect(await page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY)).toBeNull()

    await page.reload()
    await expect(shelfHeading(page)).toBeVisible()
    await page.getByRole('button', { name: 'Seal another worry' }).click()
    await expect(page.getByLabel('Your worry')).toHaveValue('')
    await expect(page.getByText(/You were partway through this/)).toHaveCount(0)
  })

  test('a kept draft waits behind the shelf and can be set aside for a blank page', async ({ page }) => {
    await openKeeper(page)
    await sealWorry(page)
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: 'Seal another worry' }).click()
    await page.getByLabel('Your worry').fill('A second worry, half done')
    await page.getByRole('button', { name: 'Back to the shelf' }).click()
    await page.reload()

    await expect(page.getByLabel('Your worry')).toHaveValue('A second worry, half done')
    await page.getByRole('button', { name: 'Back to the shelf' }).click()
    await page.getByRole('button', { name: 'Finish the worry you started' }).click()
    await expect(page.getByLabel('Your worry')).toHaveValue('A second worry, half done')

    await page.getByRole('button', { name: 'Start a blank page' }).click()
    await expect(page.getByLabel('Your worry')).toHaveValue('')
    await expect(page.getByLabel('Your worry')).toBeFocused()
    expect(await page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY)).toBeNull()
    await page.reload()
    await expect(shelfHeading(page)).toBeVisible()
  })

  test('sealing is one slow beat: fold, drop, lid, wax, and only then the words', async ({ page }) => {
    await openKeeper(page)
    await page.getByLabel('Your worry').fill(WORRY)
    await page.getByRole('button', { name: 'Fold it up' }).click()
    await page.getByRole('button', { name: 'Seal it' }).click()
    await expect(page.getByRole('heading', { name: 'Sealed.' })).toBeFocused()
    const beat = await page.evaluate(() =>
      document.getAnimations().map((a) => ({
        name: (a as CSSAnimation).animationName,
        start: Number(a.effect?.getComputedTiming().delay ?? 0),
        end: Number(a.effect?.getComputedTiming().endTime ?? 0),
      })),
    )
    const at = (name: string) => beat.find((b) => b.name.replace(/^.*__/, '') === name)
    for (const name of ['fold', 'drop-in', 'lid-down', 'stamp', 'settle']) expect(at(name), name).toBeDefined()
    expect(at('fold')!.end).toBeLessThanOrEqual(at('drop-in')!.start)
    expect(at('drop-in')!.end).toBeLessThanOrEqual(at('lid-down')!.start)
    expect(at('lid-down')!.end).toBeLessThanOrEqual(at('stamp')!.start)
    expect(at('settle')!.start).toBeGreaterThanOrEqual(3000)
    expect(at('settle')!.end).toBeLessThanOrEqual(4000)
  })

  test('jars on the shelf say when each was sealed, never what it says', async ({ page }) => {
    await openKeeper(page)
    await seed(page, [
      { ...capsule('a', -1), sealedAt: new Date(T0 - 9 * DAY).toISOString() },
      { ...capsule('b', -2), sealedAt: new Date(T0 - 30 * DAY).toISOString() },
    ])
    const jars = page.getByRole('list', { name: 'Sealed capsules' }).getByRole('button')
    await expect(jars).toHaveCount(2)
    await expect(jars.nth(0)).toHaveText(/Ready\s*sealed Oct 22/)
    await expect(jars.nth(1)).toHaveText(/Ready\s*sealed Nov 12/)
    await expect(page.getByText('Worry number a')).toHaveCount(0)
  })

  test('the three outcomes are marked by shape as well as colour', async ({ page }) => {
    await openKeeper(page)
    const opened = (outcome: string) => ({ at: new Date(T0 - DAY).toISOString(), outcome, note: '' })
    await seed(page, [capsule('a', -5, opened('no')), capsule('b', -5, opened('partly')), capsule('c', -5, opened('yes'))])
    const legend = page.getByRole('heading', { name: 'How they turned out' }).locator('..').locator('ul li svg')
    await expect(legend).toHaveCount(3)
    const shapes = await legend.evaluateAll((svgs) => svgs.map((svg) => [...svg.children].map((c) => c.tagName).join('+')))
    expect(new Set(shapes).size).toBe(3)
  })

  test('an early visit shows it resting, with no countdown and no way to peek', async ({ page }) => {
    await openKeeper(page)
    await sealWorry(page)
    await returnOn(page, T0 + 3 * DAY)
    await expect(page.getByText('Nothing to open today. Everything here is resting.')).toBeVisible()
    await page.getByRole('button', { name: /Opens Saturday, November 28/ }).click()
    await expect(page.getByRole('heading', { name: 'Still resting' })).toBeFocused()
    await expect(page.getByText('Nothing to do until then.')).toBeVisible()
    await expect(page.getByText(WORRY)).toHaveCount(0)
    await expect(page.getByText(/days? (left|to go)|remaining/i)).toHaveCount(0)
  })

  test('a device clock jumping backwards leaves the capsule resting, not broken', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openKeeper(page)
    await sealWorry(page)
    // Two days before the seal; a jump across New Year trips the site footer's year, which is not this game's.
    await returnOn(page, T0 - 2 * DAY)
    await expect(shelfHeading(page)).toBeVisible()
    await expect(page.getByRole('button', { name: /Opens Saturday, November 28/ })).toBeVisible()
    expect(errors).toEqual([])
  })

  for (const [answer, word] of [['Yes', 'Happened'], ['Partly', 'Partly happened'], ['No', 'Didn’t happen']] as const) {
    test(`returning after the date and answering "${answer}"`, async ({ page }) => {
      const errors = collectPageErrors(page)
      await openKeeper(page)
      await sealWorry(page)
      await returnOn(page, new Date('2026-11-28T00:05:00').getTime())

      await expect(page.getByText('One capsule is ready to open, whenever you like.')).toBeVisible()
      await page.getByRole('button', { name: /Ready to open/ }).click()
      await expect(page.getByRole('heading', { name: 'This one is ready' })).toBeFocused()
      await page.getByRole('button', { name: 'Open it' }).click()
      await expect(page.getByRole('heading', { name: 'On Saturday, November 21, you wrote:' })).toBeFocused()
      await expect(page.getByText(WORRY)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Close the capsule' })).toBeDisabled()

      await page.getByRole('radio', { name: answer, exact: true }).locator('..').click()
      await page.getByLabel(/A line to your past self/).fill('  Dear me: it was all right.  ')
      await page.getByRole('button', { name: 'Close the capsule' }).click()

      await expect(shelfHeading(page)).toBeFocused()
      await expect(page.getByText('Closed and kept with the others.')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'How they turned out' })).toBeVisible()
      const [saved] = await stored(page)
      expect(saved.opening).toMatchObject({ outcome: answer.toLowerCase(), note: 'Dear me: it was all right.' })

      await page.getByRole('button', { name: new RegExp(WORRY) }).click()
      await expect(page.getByText(`Opened Saturday, November 28: ${word.toLowerCase()}.`)).toBeVisible()
      await expect(page.getByText('Dear me: it was all right.')).toBeVisible()
      expect(errors).toEqual([])
    })
  }

  test('too soon to tell: "Not yet" seals it again for the chosen time and keeps it out of the tally', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openKeeper(page)
    await sealWorry(page)
    const lookedIn = new Date('2026-11-28T09:00:00').getTime()
    await returnOn(page, lookedIn)
    await page.getByRole('button', { name: /Ready to open/ }).click()
    await page.getByRole('button', { name: 'Open it' }).click()

    await page.getByRole('radio', { name: 'Not yet', exact: true }).locator('..').click()
    await expect(page.getByLabel(/A line to your past self/)).toHaveCount(0)
    await expect(page.getByRole('radio', { name: /Another week/ })).toBeChecked()
    await page.getByRole('radio', { name: /Another month/ }).check()
    await page.getByRole('button', { name: 'Seal it again' }).click()

    await expect(shelfHeading(page)).toBeFocused()
    await expect(page.getByText('Sealed again. It comes back on Monday, December 28.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'How they turned out' })).toHaveCount(0)
    const [saved] = await stored(page)
    expect(saved).toMatchObject({ opening: null, opensOn: '2026-12-28' })
    expect(saved.lookedIn).toHaveLength(1)
    expect(localKey(Date.parse(saved.lookedIn![0]))).toBe('2026-11-28')

    await page.getByRole('button', { name: /Opens Monday, December 28/ }).click()
    await expect(page.getByRole('heading', { name: 'Still resting' })).toBeFocused()
    await expect(page.getByText('You looked in on Saturday, November 28, and it was too soon to tell, so it has more time.')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('the tally speaks plainly across many capsules', async ({ page }) => {
    await openKeeper(page)
    const opened = (outcome: string) => ({ at: new Date(T0 - DAY).toISOString(), outcome, note: '' })
    await seed(page, [
      capsule('a', -2), capsule('b', -1), capsule('c', 3), capsule('d', 40), capsule('e', 90),
      capsule('f', -5, opened('no')), capsule('g', -5, opened('no')), capsule('h', -5, opened('no')),
      capsule('i', -5, opened('partly')), capsule('j', -5, opened('yes')),
      ...Array.from({ length: 20 }, (_, i) => capsule(`r${i}`, 10 + i)),
    ])
    await expect(page.getByText('2 capsules are ready to open, whenever you like.')).toBeVisible()
    await expect(page.getByRole('list', { name: 'Sealed capsules' }).getByRole('button')).toHaveCount(25)
    await expect(page.getByText('You’ve looked back on 5 worries: 3 didn’t happen, 1 partly happened and 1 happened.')).toBeVisible()
    await expect(page.getByText('Most of what you feared never arrived.')).toBeVisible()
  })

  test('save a copy, clear the browser, restore it; a second restore adds nothing', async ({ page }) => {
    await openKeeper(page)
    await sealWorry(page)
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save a copy' }).click()
    const download = await downloading
    expect(download.suggestedFilename()).toBe('the-keeper-2026-11-21.json')
    const file = readFileSync((await download.path())!)
    const before = await stored(page)

    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(composerHeading(page)).toBeVisible()

    const restoreInput = page.getByTestId('keeper-restore-input')
    await restoreInput.setInputFiles({ name: 'copy.json', mimeType: 'application/json', buffer: file })
    await expect(shelfHeading(page)).toBeVisible()
    expect(await stored(page)).toEqual(before)

    await restoreInput.setInputFiles({ name: 'copy.json', mimeType: 'application/json', buffer: file })
    await expect(page.getByText('Everything in that copy is already here.')).toBeVisible()
    expect(await stored(page)).toEqual(before)
  })

  test('a bad or foreign file is refused calmly and nothing is overwritten', async ({ page }) => {
    await openKeeper(page)
    await sealWorry(page)
    await page.getByRole('button', { name: 'Done' }).click()
    const before = await stored(page)
    const input = page.getByTestId('keeper-restore-input')

    await input.setInputFiles({ name: 'photo.json', mimeType: 'application/json', buffer: Buffer.from('not json at all') })
    await expect(page.getByText('That file isn’t a copy saved from here, so nothing was changed.')).toBeVisible()
    await input.setInputFiles({ name: 'other.json', mimeType: 'application/json', buffer: Buffer.from('{"kind":"other","capsules":[]}') })
    await expect(page.getByText('That file isn’t a copy saved from here, so nothing was changed.')).toBeVisible()
    const damaged = JSON.stringify({ kind: KIND, version: 1, capsules: [{ id: 'x', worry: '' }] })
    await input.setInputFiles({ name: 'damaged.json', mimeType: 'application/json', buffer: Buffer.from(damaged) })
    await expect(page.getByText('Part of that copy couldn’t be read, so nothing was changed.')).toBeVisible()
    const newer = JSON.stringify({ kind: KIND, version: 9, capsules: [] })
    await input.setInputFiles({ name: 'newer.json', mimeType: 'application/json', buffer: Buffer.from(newer) })
    await expect(page.getByText(/came from a newer version of this page/)).toBeVisible()

    expect(await stored(page)).toEqual(before)
  })

  test('when storage refuses, the worry is rescued: copy it or save it as a restorable file', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.addInitScript(() => {
      const real = Storage.prototype.setItem
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.includes('worry-capsule')) {
          const error = new Error('full')
          error.name = 'QuotaExceededError'
          throw error
        }
        return real.call(this, key, value)
      }
    })
    await openKeeper(page)
    await expect(page.getByText(/This browser isn’t keeping things right now/)).toBeVisible()
    await page.getByLabel('Your worry').fill(WORRY)
    await page.getByRole('button', { name: 'Fold it up' }).click()
    await page.getByRole('button', { name: 'Seal it' }).click()

    await expect(page.getByRole('heading', { name: 'This browser couldn’t keep it' })).toBeFocused()
    await expect(page.getByText('Its storage is full.', { exact: false })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Your worry' })).toHaveValue(WORRY)
    await page.getByRole('button', { name: 'Copy the words' }).click()
    await expect(page.getByText('Copied. Your words are on the clipboard.')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(WORRY)

    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save it as a file' }).click()
    const copy = JSON.parse(readFileSync((await (await downloading).path())!, 'utf8')) as { kind: string; capsules: StoredCapsule[] }
    expect(copy.kind).toBe(KIND)
    expect(copy.capsules).toHaveLength(1)
    expect(copy.capsules[0]).toMatchObject({ worry: WORRY, opensOn: '2026-11-28' })
  })

  test('the worry never leaves the browser, half-written or sealed', async ({ page }) => {
    const leaks: string[] = []
    page.on('request', (request) => {
      const body = request.postData() ?? ''
      if (request.url().includes('freeze') || body.includes('freeze')) leaks.push(request.url())
    })
    await openKeeper(page)
    await page.getByLabel('Your worry').fill('Half a thought about freeze')
    await page.reload()
    await expect(page.getByLabel('Your worry')).toHaveValue('Half a thought about freeze')
    await page.getByLabel('Your worry').fill('')
    await sealWorry(page)
    await returnOn(page, T0 + 8 * DAY)
    await page.getByRole('button', { name: /Ready to open/ }).click()
    await page.getByRole('button', { name: 'Open it' }).click()
    await page.getByRole('radio', { name: 'No', exact: true }).locator('..').click()
    await page.getByRole('button', { name: 'Close the capsule' }).click()
    await expect(shelfHeading(page)).toBeVisible()
    expect(leaks).toEqual([])
  })

  test('text is shown as text, never as markup', async ({ page }) => {
    await openKeeper(page)
    const markup = '<img src=x onerror="window.__pwned=1"><b>bold</b>'
    await page.getByLabel('Your worry').fill(markup)
    await page.getByRole('button', { name: 'Fold it up' }).click()
    await expect(page.getByText(markup, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Seal it' }).click()
    await returnOn(page, T0 + 7 * DAY)
    await page.getByRole('button', { name: /Ready to open/ }).click()
    await page.getByRole('button', { name: 'Open it' }).click()
    await expect(page.getByText(markup, { exact: true })).toBeAttached()
    await expect(page.locator('b', { hasText: 'bold' })).toHaveCount(0)
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined()
  })

  test('letting a resting capsule go asks first and can be cancelled', async ({ page }) => {
    await openKeeper(page)
    await sealWorry(page)
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: /^Opens / }).click()
    await page.getByRole('button', { name: 'Let it go' }).click()
    await page.getByRole('button', { name: 'Keep it' }).click()
    expect(await stored(page)).toHaveLength(1)
    await page.getByRole('button', { name: 'Let it go' }).click()
    await page.getByRole('group', { name: 'Let it go' }).getByRole('button', { name: 'Let it go' }).click()
    await expect(composerHeading(page)).toBeFocused()
    expect(await stored(page)).toEqual([])
  })

  test('development fast-forward opens a capsule without waiting a week', async ({ page }) => {
    await openKeeper(page)
    await sealWorry(page)
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: '+1 week' }).click()
    await expect(page.getByTestId('dev-today')).toContainText('7 days ahead')
    await expect(page.getByRole('button', { name: /Ready to open/ })).toBeVisible()
    await page.getByRole('button', { name: 'Back to today' }).click()
    await expect(page.getByRole('button', { name: /^Opens / })).toBeVisible()
  })

  test('keyboard only: write, choose, seal, return and answer', async ({ page }) => {
    await openKeeper(page)
    await page.getByLabel('Your worry').focus()
    await page.keyboard.type(WORRY)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('radio', { name: /In about a week/ })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: /In about a month/ })).toBeChecked()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Fold it up' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Ready to seal it?' })).toBeFocused()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Seal it' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Sealed.' })).toBeFocused()

    await returnOn(page, T0 + 31 * DAY)
    await page.getByRole('button', { name: /Ready to open/ }).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Open it' })).toBeFocused()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('radio', { name: 'Yes', exact: true })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'No', exact: true })).toBeChecked()
    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/A line to your past self/)).toBeFocused()
    await page.keyboard.type('Told you.')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Close the capsule' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(shelfHeading(page)).toBeFocused()
    expect((await stored(page))[0].opening).toMatchObject({ outcome: 'no', note: 'Told you.' })
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`no accessibility violations in the ${theme} theme`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('verygoodmelon:accessibility:settings', JSON.stringify({ theme: t })), theme)
      await openKeeper(page)
      await expect(composerHeading(page)).toBeVisible()
      expect(await runAxe(page)).toEqual([])

      const opened = { at: new Date(T0 - DAY).toISOString(), outcome: 'partly', note: 'It was fine' }
      await seed(page, [capsule('a', -1), capsule('b', 5), capsule('c', -3, opened)])
      await expect(shelfHeading(page)).toBeVisible()
      expect(await runAxe(page)).toEqual([])

      await page.getByRole('button', { name: /Ready to open/ }).click()
      await page.getByRole('button', { name: 'Open it' }).click()
      await page.getByRole('radio', { name: 'Partly', exact: true }).locator('..').click()
      // Let the opening scene finish so contrast is measured on the settled page.
      await page.clock.runFor(3000)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      expect(await runAxe(page)).toEqual([])
    })
  }
})

test.describe('The Keeper with reduced motion on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

  test('the same scenes appear at once, with nothing moving and nothing scrolling sideways', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openKeeper(page)
    await sealWorry(page)
    const sealedText = page.getByText('It comes back on Saturday, November 28.')
    await expect(sealedText).toBeVisible()
    for (const frame of ['Folded', 'Set inside', 'Sealed']) await expect(page.getByText(frame, { exact: true })).toBeVisible()
    const motion = await page.evaluate(() =>
      [...document.querySelectorAll('svg *, p, h2')].filter((el) => getComputedStyle(el).animationName !== 'none').length,
    )
    expect(motion).toBe(0)
    expect(await sealedText.evaluate((el) => getComputedStyle(el.parentElement!).opacity)).toBe('1')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

    await returnOn(page, T0 + 7 * DAY)
    await page.getByRole('button', { name: /Ready to open/ }).tap()
    await page.getByRole('button', { name: 'Open it' }).tap()
    await expect(page.getByText(WORRY)).toBeVisible()
    expect(await page.getByText(WORRY).evaluate((el) => getComputedStyle(el.closest('figure')!.parentElement!).opacity)).toBe('1')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    expect(errors).toEqual([])
  })

  test('the site’s own Reduce Motion setting is honoured too', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    await page.addInitScript(() => localStorage.setItem('verygoodmelon:accessibility:settings', JSON.stringify({ reduceMotion: true })))
    await openKeeper(page)
    await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true')
    await sealWorry(page)
    const moving = await page.evaluate(() => [...document.querySelectorAll('svg *')].filter((el) => getComputedStyle(el).animationName !== 'none').length)
    expect(moving).toBe(0)
    await context.close()
  })

  test('with the phone keyboard up, the worry box and the next step stay reachable', async ({ page }) => {
    await openKeeper(page)
    await page.setViewportSize({ width: 390, height: 450 })
    await page.getByLabel('Your worry').fill(WORRY)
    await expect(page.getByLabel('Your worry')).toBeInViewport()
    await page.getByRole('button', { name: 'Fold it up' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Fold it up' })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})
