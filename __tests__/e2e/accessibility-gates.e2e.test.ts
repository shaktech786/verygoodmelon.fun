import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { ALL_ROUTES, LOOKS, SETTINGS_KEY } from './helpers/routes'

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

/** Waits for every finite animation to finish, so no fade is measured half-way. Endless game loops are left running. */
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined))
    )
  )
}

async function axeViolations(page: Page): Promise<string[]> {
  await settle(page)
  await page.evaluate(AXE_SOURCE)
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[]; passes: { id: string }[]; incomplete: { id: string }[] }> }
    }).axe
    const result = await axe.run(
      { exclude: [['nextjs-portal']] },
      {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: true }, 'target-size': { enabled: true } },
      }
    )
    // A run that never looked at contrast or target size would pass for the wrong reason
    const looked = new Set([...result.violations, ...result.passes, ...result.incomplete].map((rule) => rule.id))
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
      const lasts = Number(timing.endTime)
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

/**
 * The player never reads that the site is made with AI, or about a model, or about something being generated.
 * Each entry says why a match is not that.
 */
const ALLOWED_WORDS: RegExp[] = [
  // Ordinary English, not a system: a person to look up to, and the people who come after us
  /role models?/i,
  /(?:future|coming|next) generations?/i,
]

const AI_WORDING = /\bAI\b|artificial intelligence|model|generat/i

test.describe('no player-facing words say AI, model or generating', () => {
  for (const route of ALL_ROUTES) {
    test(route, async ({ page }) => {
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
      const found = texts.filter((line) => AI_WORDING.test(line) && !ALLOWED_WORDS.some((allowed) => allowed.test(line)))
      expect(found).toEqual([])
    })
  }
})
