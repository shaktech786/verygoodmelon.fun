import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { ALL_ROUTES, LOOKS, SETTINGS_KEY } from './helpers/routes'
import { settle } from './helpers/animations'
import { aiWordingIn } from './helpers/ai-wording'

/**
 * The route-wide gates of PLAN.md 12.1, run over every page (the content pages plus every game in the game config):
 *   - axe, with color-contrast and target-size, at 390 and 1440 in Light, Dark, Light-Quiet and High contrast
 *   - reduced motion leaves no transform animation and no opacity change longer than 160 ms
 *   - Quiet leaves nothing running outside the game's own stage
 *   - no player-facing words say AI, model or generating
 * The per-game specs hold each game's own behaviour; this file holds what every page owes.
 */

const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')
const WIDTHS = [390, 1440] as const

async function storeSettings(page: Page, settings: Record<string, unknown>) {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [SETTINGS_KEY, JSON.stringify(settings)] as const)
}

/** Opens a route and waits for real state: the document, then the server-drawn games' hydration, then fonts. */
async function open(page: Page, route: string) {
  const response = await page.goto(route)
  expect(response?.status(), route).toBe(200)
  await expect(page.locator('main#main-content')).toBeVisible()
  await expect(page.locator('[data-booting]')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
}

async function axeViolations(page: Page): Promise<string[]> {
  await settle(page)
  await page.evaluate(AXE_SOURCE)
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[]; passes: { id: string }[]; incomplete: { id: string }[]; inapplicable: { id: string }[] }> }
    }).axe
    const result = await axe.run(
      { exclude: [['nextjs-portal']] },
      {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: true }, 'target-size': { enabled: true } },
      }
    )
    // A run that never looked at contrast or target size would pass for the wrong reason
    const looked = new Set([...result.violations, ...result.passes, ...result.incomplete, ...result.inapplicable].map((rule) => rule.id))
    const skipped = ['color-contrast', 'target-size'].filter((id) => !looked.has(id)).map((id) => `${id}: never ran`)
    return [...skipped, ...result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)]
  })
}

test.describe('axe finds nothing, at phone and desktop widths, in every look', () => {
  for (const [look, settings] of Object.entries(LOOKS)) {
    for (const route of ALL_ROUTES) {
      test(`${route} in ${look}`, async ({ page }) => {
        test.slow()
        await storeSettings(page, settings)
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 })
          await open(page, route)
          const html = page.locator('html')
          if ('sense' in settings) await expect(html).toHaveAttribute('data-sense', settings.sense)
          if ('contrast' in settings) await expect(html).toHaveAttribute('data-contrast', settings.contrast)
          await expect(html).toHaveAttribute('data-theme', settings.theme)
          expect(await axeViolations(page), `${route} at ${width}px`).toEqual([])
        }
      })
    }
  }
})

/**
 * What an animation may be under reduced motion: an opacity change of 160 ms or less, or nothing at all
 * (the site clamps every duration to 0.01 ms, which is no motion). Anything else is listed by what animates it.
 */
async function motionThatIsNotAllowed(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document.getAnimations().flatMap((animation) => {
      const effect = animation.effect as KeyframeEffect | null
      const target = effect?.target
      if (!effect || !target || target.closest('nextjs-portal')) return []
      const timing = effect.getComputedTiming()
      // The active time, without any delay: a clamped animation that waits first is still no motion
      const lasts = Number(timing.activeDuration)
      if (lasts <= 0.01) return []
      const properties = new Set(effect.getKeyframes().flatMap((frame) => Object.keys(frame).filter((key) => !['offset', 'easing', 'composite', 'computedOffset'].includes(key))))
      const name = animation instanceof CSSAnimation ? animation.animationName : animation instanceof CSSTransition ? `transition ${animation.transitionProperty}` : 'script'
      const where = `<${target.tagName.toLowerCase()} class="${(target as HTMLElement).className}">`
      const onlyOpacity = [...properties].every((property) => property === 'opacity')
      if (onlyOpacity && lasts <= 160 && timing.iterations !== Infinity) return []
      return [`${name} [${[...properties].join(',')}] ${lasts === Infinity ? 'endless' : `${lasts} ms`} on ${where}`]
    })
  )
}

test.describe('reduced motion leaves only short opacity fades', () => {
  for (const route of ALL_ROUTES) {
    test(`${route}, asked for by the device and by the setting`, async ({ page }) => {
      test.slow()
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await open(page, route)
      expect(await motionThatIsNotAllowed(page), `${route} by device`).toEqual([])

      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await storeSettings(page, { reduceMotion: true })
      await open(page, route)
      await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true')
      expect(await motionThatIsNotAllowed(page), `${route} by setting`).toEqual([])
    })
  }
})

test.describe('reduced motion is set before first paint, from the server HTML and the boot script alone', () => {
  // With the page's scripts blocked, nothing can hydrate: only the HTML and its inline boot script can have set the attribute
  const attributeWithoutScripts = async (page: Page, route: string) => {
    await page.route('**/_next/static/**', (request) => request.abort())
    await page.goto(route, { waitUntil: 'commit' })
    await page.waitForLoadState('domcontentloaded')
    return page.locator('html').getAttribute('data-reduce-motion')
  }

  for (const route of ['/', '/games', '/games/the-mutation', '/games/quiet-grove']) {
    test(`${route}: saved on, saved off, and from the device when nothing is saved`, async ({ browser }) => {
      for (const { saved, media, expected } of [
        { saved: { reduceMotion: true }, media: 'no-preference', expected: 'true' },
        { saved: { reduceMotion: false }, media: 'reduce', expected: 'false' },
        { saved: null, media: 'reduce', expected: 'true' },
        { saved: null, media: 'no-preference', expected: 'false' },
      ] as const) {
        const context = await browser.newContext({ reducedMotion: media })
        const page = await context.newPage()
        if (saved) await storeSettings(page, saved)
        expect(await attributeWithoutScripts(page, route), `${route} saved ${JSON.stringify(saved)}, device ${media}`).toBe(expected)
        await context.close()
      }
    })
  }
})

test.describe('Quiet leaves nothing moving outside the game', () => {
  for (const route of ALL_ROUTES) {
    test(route, async ({ page }) => {
      test.slow()
      await storeSettings(page, { sense: 'quiet' })
      await open(page, route)
      await expect(page.locator('html')).toHaveAttribute('data-sense', 'quiet')
      const running = () =>
        page.evaluate(() =>
          document.getAnimations().flatMap((animation) => {
            const target = (animation.effect as KeyframeEffect | null)?.target
            if (!target || animation.playState !== 'running' || target.closest('nextjs-portal') || target.closest('.sp-stage')) return []
            const name = animation instanceof CSSAnimation ? animation.animationName : animation instanceof CSSTransition ? `transition ${animation.transitionProperty}` : 'script'
            return [`${name} on <${target.tagName.toLowerCase()} class="${(target as HTMLElement).className}">`]
          })
        )
      expect(await running()).toEqual([])
      // Moving through the page is no reason to move either
      const first = page.locator('main a, main button').first()
      if (await first.count()) await first.hover()
      expect(await running()).toEqual([])
    })
  }
})

/** Legal pages must name the AI services and what they do plainly; invisible AI is for play, never for disclosure. */
const DISCLOSURES = ['/privacy', '/terms']

test.describe('no player-facing words say AI, model or generating', () => {
  for (const route of ALL_ROUTES.filter((route) => !DISCLOSURES.includes(route))) {
    test(route, async ({ page }) => {
      // The Optimist's story changes daily; the date is fixed here, and every story is scanned in __tests__/lib/flash-detector.test.ts
      await page.clock.setFixedTime(new Date('2026-11-26T12:00:00Z'))
      await open(page, route)
      await settle(page)
      const texts = await page.evaluate(() => {
        const seen = new Set<string>()
        const add = (text: string | null | undefined) => {
          for (const line of (text ?? '').split('\n')) if (line.trim()) seen.add(line.trim())
        }
        add(document.title)
        add(document.querySelector('meta[name="description"]')?.getAttribute('content'))
        // What is on screen, and what a screen reader or a hover is given besides
        add(document.body.innerText)
        for (const el of document.body.querySelectorAll('[aria-label], [alt], [title], [placeholder]')) {
          if (el.closest('nextjs-portal')) continue
          for (const attribute of ['aria-label', 'alt', 'title', 'placeholder']) add(el.getAttribute(attribute))
        }
        // What only a screen reader meets
        for (const el of document.body.querySelectorAll('.sr-only, [role="status"], [aria-live]')) add(el.textContent)
        return [...seen]
      })
      const found = texts.filter((line) => aiWordingIn(line) !== null)
      expect(found).toEqual([])
    })
  }
})
