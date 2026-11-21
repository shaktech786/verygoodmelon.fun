import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { SHOWCASE_GROUPS } from '@/lib/games/config'

/**
 * The shared shell every page sits in: accessibility settings, the feedback
 * dialog, navigation and the two game listings.
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
  await page.getByRole('button', { name: 'Open accessibility settings' }).click()
  const panel = page.getByRole('dialog', { name: 'Accessibility settings' })
  await expect(panel).toBeVisible()
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

    await panel.getByText('Highest').click()
    await expect(html).toHaveAttribute('data-contrast', 'extra-high')
    await panel.getByText('Dark', { exact: true }).click()
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
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('button', { name: 'Accessibility settings' }).click()
    const panel = page.getByRole('dialog', { name: 'Accessibility settings' })
    await panel.getByText('Larger').click()
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

  test('the homepage loads, then reloads with today\'s line remembered, without hydration or console errors', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' || /hydrat|script tag/i.test(msg.text())) problems.push(msg.text().slice(0, 300))
    })
    page.on('pageerror', (error) => problems.push(error.message.slice(0, 300)))
    await page.route(/\/api\/(game-events|site-visits)/, (route) => route.fulfill({ json: {} }))
    await page.route('**/api/daily-wisdom', (route) => route.fulfill({ json: { wisdom: 'Rest is part of the work.' } }))

    await page.goto('/')
    await expect(page.getByText('Rest is part of the work.')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Rest is part of the work.')).toBeVisible()
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

  test('the phone menu closes on Escape and returns focus to its button', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/about')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const toggle = page.getByRole('button', { name: 'Close menu' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#mobile-menu').getByRole('link', { name: 'Games' })).toBeVisible()

    await page.keyboard.press('Escape')
    const reopened = page.getByRole('button', { name: 'Open menu' })
    await expect(reopened).toHaveAttribute('aria-expanded', 'false')
    await expect(reopened).toBeFocused()
  })

  test('the homepage says what this is and where to start', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('main')).toContainText('quiet games for a busy mind')
    const start = page.getByRole('link', { name: /^Start here/ })
    await expect(start).toBeVisible()
    const href = await start.getAttribute('href')
    const calmSlugs = SHOWCASE_GROUPS.find((group) => group.category === 'Calm')?.games.map((g) => `/games/${g.slug}`)
    expect(calmSlugs).toContain(href)
    // "Start here" and the card marked "Today" are two different invitations, never the same game
    const today = page.getByRole('link', { name: /, featured today\./ })
    await expect(today).toBeVisible()
    expect(await today.getAttribute('href')).not.toBe(href)
  })

  test('the homepage and the games page group and order games the same way', async ({ page }) => {
    const expected = SHOWCASE_GROUPS.map((group) => ({
      heading: group.title,
      games: group.games.map((game) => `/games/${game.slug}`),
    }))
    const readGroups = () =>
      page.locator('main section[aria-labelledby^="category-"]').evaluateAll((sections) =>
        sections.map((section) => ({
          heading: section.querySelector('h2')?.textContent?.trim() ?? '',
          games: Array.from(section.querySelectorAll('a[href^="/games/"]')).map((a) => a.getAttribute('href')),
        }))
      )

    await page.goto('/')
    await expect(page.locator('main section h2').first()).toBeVisible()
    expect(await readGroups()).toEqual(expected)

    await page.goto('/games')
    expect(await readGroups()).toEqual(expected)
  })

  test('in care mode the game lists offer helplines once, list each gentle game once, and a new tab keeps the care', async ({ page, context }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('verygoodmelon:care', JSON.stringify({ until: Date.now() + 60 * 60 * 1000 })))

    for (const listing of ['/', '/games']) {
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
