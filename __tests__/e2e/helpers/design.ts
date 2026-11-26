import { expect, type Page } from '@playwright/test'

/** One focal point, one go: at most one visible go-action in the page's main region and in any open dialog. */
export async function expectOneGo(page: Page): Promise<void> {
  const counts = await page.evaluate(() => {
    const visible = (el: Element) => {
      const box = el.getBoundingClientRect()
      return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== 'hidden'
    }
    const scopes = [...document.querySelectorAll('main, dialog[open], [role="dialog"]')]
    return scopes.map((scope) => [...scope.querySelectorAll('[data-go]')].filter(visible).length)
  })
  for (const count of counts) expect(count).toBeLessThanOrEqual(1)
}

/** In care mode the Support block stays still and plain: no running animation, no go-action, nothing to give. */
export async function expectStillCare(page: Page): Promise<void> {
  const care = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('[aria-label="Support"]')]
    return {
      blocks: blocks.length,
      // A hover or press transition on a button is a response, not motion the block makes on its own
      animations: document.getAnimations().filter((a) => {
        if (a instanceof CSSTransition) return false
        const target = (a.effect as KeyframeEffect | null)?.target
        return target ? blocks.some((block) => block.contains(target)) : false
      }).length,
      goes: blocks.reduce((sum, block) => sum + block.querySelectorAll('[data-go]').length, 0),
      gives: blocks.reduce((sum, block) => sum + block.querySelectorAll('[data-give]').length + (/\b(donate|give)\b/i.test(block.textContent ?? '') ? 1 : 0), 0),
    }
  })
  expect(care.blocks).toBeGreaterThan(0)
  expect(care.animations).toBe(0)
  expect(care.goes).toBe(0)
  expect(care.gives).toBe(0)
}
