import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { SHOWCASE_GROUPS } from '@/lib/games/config'
import { PICK_REASONS, dailyPick } from '@/lib/games/daily-pick'
import { gamesForMood } from '@/lib/games/moods'
import { axeViolations } from './helpers/writing-game'

/**
 * The shared shell every page sits in: accessibility settings, the feedback
 * dialog, the header, the footer and the two game listings.
 */

const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')
const STORAGE_KEY = 'verygoodmelon:accessibility:settings'
const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 390, height: 844 }

async function storeSettings(page: Page, settings: Record<string, unknown>): Promise<void> {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(settings)] as const
  )
}

async function settledContrastViolations(page: Page): Promise<string[]> {
  // Entrance fades would be measured mid-way as low contrast; endless ambient animations are left running.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined))
    )
  )
  await page.evaluate(AXE_SOURCE)
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: {
        run: (
          context: unknown,
          options: unknown
        ) => Promise<{ violations: { id: string; nodes: { target: string[]; failureSummary?: string }[] }[] }>
      }
    }).axe
    const result = await axe.run(
      { exclude: [['nextjs-portal']] },
      { runOnly: { type: 'rule', values: ['color-contrast'] } }
    )
    return result.violations.flatMap((v) =>
      v.nodes.map((n) => `${n.target.join(' ')}: ${n.failureSummary?.split('\n').pop()?.trim()}`)
    )
  })
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

async function openSettings(page: Page) {
  const panel = page.getByRole('dialog', { name: 'Accessibility settings' })
  // A tap that lands before the page has hydrated does nothing, so it is tried again
  await expect(async () => {
    if (!(await panel.isVisible())) await page.getByRole('button', { name: 'Open accessibility settings' }).click()
    await expect(panel).toBeVisible({ timeout: 1000 })
  }).toPass()
  return panel
}

test.describe('Every theme and contrast combination stays readable', () => {
  const THEMES = [
    { theme: 'light', scheme: 'light' },
    { theme: 'dark', scheme: 'light' },
    { theme: 'auto', scheme: 'light' },
    { theme: 'auto', scheme: 'dark' },
  ] as const
  const CONTRASTS = ['normal', 'high', 'extra-high'] as const
  const PAGES = ['/', '/games', '/about']

  for (const { theme, scheme } of THEMES) {
    for (const contrast of CONTRASTS) {
      test(`theme ${theme} (device ${scheme}) with ${contrast} contrast`, async ({ page }) => {
        test.setTimeout(90_000)
        await page.emulateMedia({ colorScheme: scheme })
        await storeSettings(page, { theme, contrast })

        for (const pagePath of PAGES) {
          await page.goto(pagePath)
          await expect(page.locator('html')).toHaveAttribute('data-contrast', contrast)
          await page.waitForLoadState('networkidle')
          expect(await settledContrastViolations(page), `${pagePath}`).toEqual([])
        }
      })
    }
  }
})

test.describe('Accessibility settings panel', () => {
  test.use({ viewport: DESKTOP })

  test('every control has a name and the panel promises nothing it does not do', async ({ page }) => {
    await page.goto('/about')
    const panel = await openSettings(page)

    for (const name of ['Light', 'Match device', 'Dark']) {
      await expect(panel.getByRole('group', { name: 'Theme' }).getByRole('radio', { name, exact: true })).toBeAttached()
    }
    for (const name of ['Default', 'Large', 'Larger']) {
      await expect(panel.getByRole('group', { name: 'Text size' }).getByRole('radio', { name, exact: true })).toBeAttached()
    }
    for (const name of ['Standard', 'High', 'Highest']) {
      await expect(panel.getByRole('group', { name: 'Contrast' }).getByRole('radio', { name, exact: true })).toBeAttached()
    }
    await expect(panel.getByRole('switch', { name: 'Greyscale' })).toBeVisible()
    await expect(panel.getByRole('switch', { name: 'Reduce motion' })).toBeVisible()
    await expect(panel.getByRole('switch', { name: 'Mute all sound' })).toBeVisible()
    await expect(panel.getByRole('slider', { name: 'Volume' })).toBeVisible()

    await expect(panel).not.toContainText(/colou?r ?blind|deuteranopia|animation speed|always-visible instructions/i)
    await expect(panel).not.toContainText(/Mute\/Unmute|SPACE/)

    const unnamed = await panel.evaluate((root) =>
      Array.from(root.querySelectorAll('input, select, textarea, button'))
        .filter((element) => {
          const labelled =
            element.getAttribute('aria-label') ||
            element.getAttribute('aria-labelledby') ||
            (element as HTMLInputElement).labels?.length ||
            element.textContent?.trim()
          return !labelled
        })
        .map((element) => element.outerHTML.slice(0, 80))
    )
    expect(unnamed).toEqual([])
  })

  test('the dial and Spacing change the page at once, are saved, and the dial says when the rest is your own mix', async ({ page }) => {
    await page.goto('/about')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-sense', 'gentle')
    await expect(html).toHaveAttribute('data-spacing', 'standard')
    const panel = await openSettings(page)
    const dial = panel.getByRole('group', { name: 'How it feels' })
    await expect(dial.getByRole('radio')).toHaveCount(3)

    await dial.locator('label.sp-choice', { hasText: 'Quiet' }).click()
    await expect(html).toHaveAttribute('data-sense', 'quiet')
    await panel.getByRole('group', { name: 'Spacing' }).locator('label.sp-choice', { hasText: 'Roomy' }).click()
    await expect(html).toHaveAttribute('data-spacing', 'roomy')
    expect(await page.locator('main p').first().evaluate((el) => getComputedStyle(el).wordSpacing)).not.toBe('normal')

    await expect(dial.getByText('Your own mix')).toHaveCount(0)
    await panel.getByRole('switch', { name: 'Greyscale' }).click()
    await expect(dial.getByText('Your own mix')).toBeVisible()
    await expect(panel.getByRole('status')).toHaveText(/Your own mix/)

    await page.reload()
    await expect(html).toHaveAttribute('data-sense', 'quiet')
    await expect(html).toHaveAttribute('data-spacing', 'roomy')
  })

  test('keeps focus inside, closes on Escape and gives focus back', async ({ page }) => {
    await page.goto('/about')
    const opener = page.getByRole('button', { name: 'Open accessibility settings' })
    await openSettings(page)

    for (let i = 0; i < 30; i++) {
      await page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab')
      const inside = await page.evaluate(
        () => !!document.activeElement?.closest('[role="dialog"][aria-modal="true"]')
      )
      expect(inside, `focus left the panel after ${i + 1} key presses`).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Accessibility settings' })).toHaveCount(0)
    await expect(opener).toBeFocused()
  })

  test('changes apply at once and reset asks inside the panel, never in a browser pop-up', async ({ page }) => {
    page.on('dialog', () => {
      throw new Error('A browser dialog was opened')
    })
    await page.goto('/about')
    const panel = await openSettings(page)
    const html = page.locator('html')

    await panel.locator('label.sp-choice', { hasText: 'Highest' }).click()
    await expect(html).toHaveAttribute('data-contrast', 'extra-high')
    await panel.locator('label.sp-choice', { hasText: /^Dark$/ }).click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await panel.getByRole('switch', { name: 'Greyscale' }).click()
    await expect(html).toHaveAttribute('data-greyscale', 'true')

    await panel.getByRole('button', { name: /Reset all settings/ }).click()
    const keep = panel.getByRole('button', { name: 'Keep my settings' })
    await expect(keep).toBeFocused()
    await keep.click()
    await expect(html).toHaveAttribute('data-contrast', 'extra-high')
    await expect(panel.getByRole('button', { name: /Reset all settings/ })).toBeFocused()

    await panel.getByRole('button', { name: /Reset all settings/ }).click()
    await panel.getByRole('button', { name: 'Yes, reset' }).click()
    await expect(html).toHaveAttribute('data-contrast', 'normal')
    await expect(html).toHaveAttribute('data-theme', 'auto')
    await expect(html).toHaveAttribute('data-greyscale', 'false')
    await expect(panel.getByRole('status')).toContainText('back to how they started')
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull()
  })

  test('settings saved by the previous version still load, minus the removed colour filters', async ({ page }) => {
    await storeSettings(page, {
      reduceMotion: false,
      contrast: 'high',
      animationSpeed: 0.5,
      colorblindMode: 'deuteranopia',
      pauseAnimations: false,
      theme: 'dark',
      volume: 30,
      muted: false,
      showKeyboardShortcuts: true,
      clickAssist: false,
      timingFlexibility: false,
      showInstructions: true,
      tutorialMode: true,
    })
    await page.goto('/games')
    const html = page.locator('html')

    await expect(html).toHaveAttribute('data-contrast', 'high')
    await expect(html).toHaveAttribute('data-theme', 'dark')
    await expect(html).toHaveAttribute('data-volume', '30')
    await expect(html).not.toHaveAttribute('data-colorblind-mode', /.*/)
    expect(await html.evaluate((el) => getComputedStyle(el).filter)).toBe('none')
  })

  test('the old Monochrome mode becomes greyscale', async ({ page }) => {
    await storeSettings(page, { colorblindMode: 'monochrome' })
    await page.goto('/games')
    await expect(page.locator('html')).toHaveAttribute('data-greyscale', 'true')
    expect(await page.locator('html').evaluate((el) => getComputedStyle(el).filter)).toBe('grayscale(1)')
  })
})

test.describe('Text size', () => {
  test('scales the whole site and still fits a phone screen', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize(PHONE)
    await page.goto('/about')
    const panel = await openSettings(page)
    await panel.locator('label.sp-choice', { hasText: 'Larger' }).click()
    await panel.getByRole('button', { name: 'Close accessibility settings' }).click()

    const rootSize = await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize)
    expect(rootSize).toBe('20px')

    for (const pagePath of ['/', '/games', '/about', '/thoughts', '/privacy']) {
      await page.goto(pagePath)
      await expect(page.locator('html')).toHaveAttribute('data-text-size', 'larger')
      await page.waitForLoadState('networkidle')
      expect(await horizontalOverflow(page), pagePath).toBeLessThanOrEqual(0)
    }
  })
})

test.describe('Feedback', () => {
  test('is a real dialog: named, focus kept inside, Escape closes and focus returns', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/about')
    const opener = page.getByRole('button', { name: 'Feedback' })
    await opener.click()

    const dialog = page.getByRole('dialog', { name: 'Send feedback' })
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog.getByRole('textbox', { name: 'Your note' })).toBeFocused()
    await expect(dialog).toContainText('leave out your name, email or anything personal')
    await expect(dialog).not.toContainText(/\bAI\b|analy[sz]ed/)

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
  })

  test('opens from a comfortably sized footer link on phones', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/about')
    const link = page.getByRole('contentinfo').getByRole('button', { name: 'Feedback' })
    const box = await link.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)

    await link.click()
    await expect(page.getByRole('dialog', { name: 'Send feedback' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(link).toBeFocused()
  })
})

test.describe('Hydration', () => {
  for (const viewport of [DESKTOP, PHONE]) {
    test(`the shell hydrates without mismatches at ${viewport.width}px, with saved settings`, async ({ page }) => {
      test.setTimeout(120_000)
      const problems: string[] = []
      const record = (text: string) => {
        if (/hydrat|did not match|server rendered/i.test(text)) problems.push(text.slice(0, 300))
      }
      page.on('console', (msg) => record(msg.text()))
      page.on('pageerror', (error) => record(error.message))
      await page.setViewportSize(viewport)
      await storeSettings(page, { theme: 'dark', contrast: 'high', textSize: 'large', greyscale: true })

      for (const pagePath of ['/', '/games', '/about', '/thoughts', '/games/the-still-point', '/games/the-silver-lining', '/games/the-threshold']) {
        await page.goto(pagePath)
        await page.waitForLoadState('networkidle')
      }
      expect(problems).toEqual([])
    })
  }

  test('the homepage loads and reloads without hydration or console errors', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' || /hydrat|script tag/i.test(msg.text())) problems.push(msg.text().slice(0, 300))
    })
    page.on('pageerror', (error) => problems.push(error.message.slice(0, 300)))
    await page.route(/\/api\/(game-events|site-visits)/, (route) => route.fulfill({ json: {} }))

    await page.goto('/')
    await expect(page.getByRole('region', { name: 'The rack' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('region', { name: 'The rack' })).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(problems).toEqual([])
  })
})

test.describe('Finding your way', () => {
  test('the header links to every game from any page', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/about')
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Games' }).click()
    await expect(page).toHaveURL(/\/games$/)
  })

  for (const viewport of [DESKTOP, PHONE]) {
    test(`at ${viewport.width}px the header holds only the name, Games and the settings gear, and nothing floats over the page`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/games/the-threshold')
      const nav = page.getByRole('navigation', { name: 'Main navigation' })
      await expect(page.getByRole('banner').getByRole('link')).toHaveText(['VeryGoodMelon.Fun', 'Games'])
      await expect(nav.getByRole('link')).toHaveText(['Games'])
      await expect(nav.getByRole('button')).toHaveCount(1)
      const gear = nav.getByRole('button', { name: 'Open accessibility settings' })
      await expect(gear).toBeVisible()
      const box = await gear.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

      // Settings and feedback open from the header and the footer, so no control floats over a game
      const floating = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button, a'))
          .filter((el) => getComputedStyle(el).position === 'fixed' && el.getClientRects().length > 0)
          .map((el) => el.outerHTML.slice(0, 80))
      )
      expect(floating).toEqual([])
      await expect(page.getByRole('link', { name: /Back Home/ })).toHaveCount(0)
    })
  }

  test('the footer offers support first, then the site links, with no stray separators', async ({ page }) => {
    for (const viewport of [PHONE, DESKTOP]) {
      await page.setViewportSize(viewport)
      await page.goto('/games')
      const footer = page.getByRole('contentinfo')
      const columns = footer.getByRole('region')
      await expect(columns.first().getByRole('heading', { level: 2 })).toHaveText('Talk to someone')
      await expect(columns.first().getByRole('link')).toHaveText(['Need to talk?'])
      await expect(columns.nth(1).getByRole('listitem')).toHaveText([
        'About',
        'Thoughts',
        'Privacy',
        'Terms',
        'Feedback',
        'GitHub (opens in a new tab)',
      ])
      await expect(footer).not.toContainText('|')
      await expect(footer).not.toContainText('Made with purpose')
      await expect(footer.getByText(/©/)).toHaveCount(1)
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
    }
  })

  test('the footer records the visit anonymously but never shows a count', async ({ page }) => {
    const posts: string[] = []
    await page.route('**/api/site-visits', (route) => {
      posts.push(route.request().method())
      return route.fulfill({ json: { count: 48213 } })
    })
    await page.goto('/games')
    await expect.poll(() => posts).toEqual(['POST'])
    const footer = page.getByRole('contentinfo')
    await expect(footer).not.toContainText(/visit/i)
    await expect(footer).not.toContainText(/48,?213/)
  })

  test('the old analytics address sends visitors, permanently, to the numbers on the privacy page', async ({ page, request }) => {
    const response = await request.get('/analytics', { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(response.headers().location).toMatch(/\/privacy#analytics$/)

    await page.goto('/analytics')
    await expect(page).toHaveURL(/\/privacy#analytics$/)
    await expect(page.getByRole('heading', { level: 2, name: 'The Numbers, in Public' })).toBeVisible()
    await expect(page.getByText('Total visits')).toBeVisible()
  })

  test('ambient sound is one switch in the settings panel on a game page, off until chosen, and absent elsewhere', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/about')
    await expect((await openSettings(page)).getByRole('switch', { name: 'Ambient sound' })).toHaveCount(0)

    await page.goto('/games/the-threshold')
    await expect(page.getByRole('button', { name: 'Ambient sound' })).toHaveCount(0)
    const panel = await openSettings(page)
    const ambient = panel.getByRole('switch', { name: 'Ambient sound' })
    await expect(ambient).toHaveAttribute('aria-checked', 'false')
    await ambient.click()
    await expect(ambient).toHaveAttribute('aria-checked', 'true')
    await ambient.click()
    await expect(ambient).toHaveAttribute('aria-checked', 'false')
  })

  test("the homepage says what this is and offers one calm game for today, with a reason, the same all day", async ({ page }) => {
    const noon = new Date(2026, 2, 2, 12)
    await page.clock.setFixedTime(noon)
    await page.goto('/')
    await expect(page.getByRole('main')).toContainText('quiet games for a busy mind')
    await expect(page.getByRole('main')).not.toContainText(/see every game/i)
    const everyGame = await page
      .getByRole('region', { name: 'The rack' })
      .locator('a[href^="/games/"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')))
    expect(everyGame).toEqual(SHOWCASE_GROUPS.flatMap((group) => group.games.map((game) => `/games/${game.slug}`)))

    const expected = dailyPick(noon)
    if (!expected) throw new Error('no calm games to pick from')
    const hero = page.getByRole('region', { name: 'Today’s packet' })
    const pick = hero.getByRole('link', { name: /^Open today’s packet/ })
    await expect(pick).toBeVisible()
    await expect(pick).toHaveAttribute('href', `/games/${expected.game.slug}`)
    await expect(hero).toContainText(expected.game.title)
    await expect(hero).toContainText(expected.reason)
    expect(PICK_REASONS[expected.game.id]).toBe(expected.reason)
    const calmSlugs = SHOWCASE_GROUPS.find((group) => group.category === 'Calm')?.games.map((g) => `/games/${g.slug}`)
    expect(calmSlugs).toContain(`/games/${expected.game.slug}`)

    // Later the same day it is still today's pick; tomorrow brings another
    await page.clock.setFixedTime(new Date(2026, 2, 2, 23, 30))
    await page.reload()
    await expect(pick).toHaveAttribute('href', `/games/${expected.game.slug}`)
    await page.clock.setFixedTime(new Date(2026, 2, 3, 8))
    await page.reload()
    await expect(pick).not.toHaveAttribute('href', `/games/${expected.game.slug}`)
  })

  test('a mood on the homepage opens the games page filtered to it, changeable there, with a way back to all', async ({ page }) => {
    await page.goto('/')
    const moods = page.getByRole('navigation', { name: 'Start from how you feel' })
    await expect(moods.getByRole('link')).toHaveText(['Restless', 'Heavy', 'Want to play'])
    await moods.getByRole('link', { name: 'Restless' }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/games\?mood=restless$/)

    // A mood keeps the games it names, in the rack's one order
    const rackOrder = SHOWCASE_GROUPS.flatMap((group) => group.games.map((game) => `/games/${game.slug}`))
    const expectedFor = (id: Parameters<typeof gamesForMood>[0]) => {
      const named = new Set(gamesForMood(id).map((g) => `/games/${g.slug}`))
      return rackOrder.filter((href) => named.has(href))
    }
    const readList = () =>
      page.getByRole('region', { name: 'The rack' }).locator('a[href^="/games/"]').evaluateAll((links) => links.map((a) => a.getAttribute('href')))
    await expect(page.getByRole('main').getByRole('status')).toContainText('For a restless mind')
    await expect(moods.getByRole('link', { name: 'Restless' })).toHaveAttribute('aria-current', 'page')
    expect(await readList()).toEqual(expectedFor('restless'))

    await moods.getByRole('link', { name: 'Heavy' }).click()
    await expect(page).toHaveURL(/\/games\?mood=heavy$/)
    await expect(page.getByRole('main').getByRole('status')).toContainText('For when it feels heavy')
    await expect(moods.getByRole('link', { name: 'Heavy' })).toHaveAttribute('aria-current', 'page')
    await expect(moods.getByRole('link', { name: 'Restless' })).not.toHaveAttribute('aria-current', /.*/)
    expect(await readList()).toEqual(expectedFor('heavy'))
    // Someone who feels heavy is never pointed at the games about death
    await expect(page.locator('main a[href="/games/final-breath"], main a[href="/games/first-breath"]')).toHaveCount(0)

    await page.getByRole('link', { name: 'Show all games' }).click()
    await expect(page).toHaveURL(/\/games$/)
    await expect(moods.locator('[aria-current]')).toHaveCount(0)
    expect(await readList()).toEqual(rackOrder)

    // An address with a mood the site does not know shows everything
    await page.goto('/games?mood=sideways')
    expect(await readList()).toEqual(rackOrder)
  })

  test('the games page groups and orders games the one way the config does', async ({ page }) => {
    const expected = SHOWCASE_GROUPS.map((group) => ({
      heading: group.title,
      games: group.games.map((game) => `/games/${game.slug}`),
    }))
    await page.goto('/games')
    await expect(page.getByRole('region', { name: 'The rack' }).getByRole('heading', { level: 2 }).first()).toBeVisible()
    const groups = await page.locator('section[aria-label="The rack"] > section').evaluateAll((sections) =>
      sections.map((section) => ({
        heading: section.querySelector('h2')?.textContent?.trim() ?? '',
        games: Array.from(section.querySelectorAll('a[href^="/games/"]')).map((a) => a.getAttribute('href')),
      }))
    )
    expect(groups).toEqual(expected)
  })

  test('in care mode the game lists offer helplines once, list each gentle game once, and a new tab keeps the care', async ({ page, context }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('verygoodmelon:care', JSON.stringify({ until: Date.now() + 60 * 60 * 1000 })))

    for (const listing of ['/', '/games', '/games?mood=heavy']) {
      await page.goto(listing)
      const gentle = page.getByRole('region', { name: 'Something gentle, if it helps' })
      await expect(gentle).toBeVisible()
      await expect(gentle.getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988')
      await expect(gentle.getByRole('link', { name: '116 123' })).toHaveAttribute('href', 'tel:116123')
      await expect(gentle.getByRole('link', { name: 'findahelpline.com' })).toHaveAttribute('href', 'https://findahelpline.com')
      await expect(page.getByRole('link', { name: '988' })).toHaveCount(1)
      for (const slug of ['the-still-point', 'quiet-grove']) {
        await expect(page.locator(`main section a[href="/games/${slug}"]`)).toHaveCount(1)
      }
      await expect(page.locator('main a[href="/games/final-breath"], main a[href="/games/first-breath"]')).toHaveCount(0)
    }

    const secondTab = await context.newPage()
    await secondTab.goto('/games')
    await expect(secondTab.getByRole('region', { name: 'Something gentle, if it helps' })).toBeVisible()
    await secondTab.close()
  })
})

test.describe('Care and support', () => {
  const enterCare = async (page: Page) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('verygoodmelon:care', JSON.stringify({ until: Date.now() + 60 * 60 * 1000 })))
  }

  test('every page offers a quiet "Need to talk?" link that leads by keyboard to calm support lines', async ({ page }) => {
    for (const path of ['/', '/games/quiet-grove', '/privacy', '/no-such-page']) {
      await page.goto(path)
      await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Need to talk?' })).toHaveAttribute('href', '/support')
    }
    await page.getByRole('contentinfo').getByRole('link', { name: 'Need to talk?' }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/support$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Need to talk?' })).toBeVisible()
    const main = page.locator('main')
    await expect(main.getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988')
    await expect(main.getByRole('link', { name: '116 123' })).toHaveAttribute('href', 'tel:116123')
    await expect(main.getByRole('link', { name: 'findahelpline.com' })).toHaveAttribute('href', 'https://findahelpline.com')
    await expect(main).not.toContainText(/emergency|crisis line|danger|urgent/i)
    // The page fades in; contrast is measured once it has settled
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))))
    expect(await axeViolations(page)).toEqual([])
  })

  test('in care mode every gentle row comes with the helpline sentence: on a game page and on the lost page', async ({ page }) => {
    await enterCare(page)
    await page.goto('/games/quiet-grove')
    const gentle = page.getByRole('region', { name: 'Something gentle, if it helps' })
    await expect(gentle.getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988')

    await page.goto('/no-such-page')
    const calm = page.getByRole('region', { name: 'Or slow down for a minute' })
    await expect(calm.getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988')
    await expect(calm.getByRole('link', { name: 'findahelpline.com' })).toBeVisible()
  })

  test('the lost page offers no helpline outside care mode', async ({ page }) => {
    await page.goto('/no-such-page')
    await expect(page.getByRole('region', { name: 'Or slow down for a minute' })).toBeVisible()
    await expect(page.locator('main').getByRole('link', { name: '988' })).toHaveCount(0)
  })
})

test.describe('Homepage and header', () => {
  test('the homepage sign is set in the ink colour, never the red kept for actions, in both themes', async ({ page }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto('/')
      const lighter = page.getByRole('heading', { level: 1 })
      await expect(lighter).toHaveText('Small, quiet games for a busy mind')
      const [colour, green, red] = await lighter.evaluate((el) => {
        const probe = (value: string) => {
          const span = document.createElement('span')
          span.style.color = value
          document.body.appendChild(span)
          const result = getComputedStyle(span).color
          span.remove()
          return result
        }
        return [getComputedStyle(el).color, probe('var(--ink)'), probe('var(--accent)')]
      })
      expect(colour).toBe(green)
      expect(colour).not.toBe(red)
    }
  })

  test('on desktop the logo sits at the left edge of the header row, the nav at the right', async ({ page }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto('/')
    const header = page.getByRole('banner')
    const logo = await header.getByRole('link', { name: 'VeryGoodMelon.Fun home' }).boundingBox()
    const games = await header.getByRole('link', { name: 'Games', exact: true }).boundingBox()
    expect(logo!.x).toBeLessThan(DESKTOP.width * 0.2)
    expect(games!.x).toBeGreaterThan(DESKTOP.width * 0.5)
  })
})

test.describe('Thoughts', () => {
  test("today's fresh thought can be read in full, not just its first lines", async ({ page }) => {
    const opening = 'A seed does not hurry, and still it becomes a tree. '.repeat(4).trim()
    const ending = 'Whatever you are growing, it has made its work of you already.'
    await page.route('**/api/thoughts/fresh', (route) =>
      route.fulfill({ json: { thought: { title: 'The slow seed', theme: 'patience', body: `${opening}\n\n${ending}` } } })
    )
    await page.goto('/thoughts')
    const card = page.getByRole('article', { name: 'Fresh thought' })
    await expect(card).toContainText('The slow seed')
    await expect(card).not.toContainText(ending)

    const more = card.getByRole('button', { name: 'Read the whole thought' })
    await expect(more).toHaveAttribute('aria-expanded', 'false')
    await more.click()
    await expect(card).toContainText(opening)
    await expect(card).toContainText(ending)
    await expect(card.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
  })
})
