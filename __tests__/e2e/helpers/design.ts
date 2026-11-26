import { expect, type Page } from '@playwright/test'

/** One focal point, one go: at most one visible go-action in the page's main region and in any open dialog. */
export async function expectOneGo(page: Page): Promise<void> {
  const counts = await page.evaluate(() => {
    const visible = (el: Element) => {
      const box = el.getBoundingClientRect()
      return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== 'hidden'
    }
    const scopes = [...document.querySelectorAll('main, dialog[open], [role="dialog"]')]
    // A dialog open inside main is counted as its own scope, not again as part of main
    const inDialog = (el: Element) => Boolean(el.closest('dialog[open], [role="dialog"]'))
    return scopes.map((scope) => {
      const isDialog = scope.matches('dialog[open], [role="dialog"]')
      return [...scope.querySelectorAll('[data-go]')].filter((el) => visible(el) && (isDialog || !inDialog(el))).length
    })
  })
  for (const count of counts) expect(count).toBeLessThanOrEqual(1)
}

/** In care mode the Support block stays still and plain: no running animation, no go-action, nothing to give. */
export async function expectStillCare(page: Page): Promise<void> {
  const care = await page.evaluate(async () => {
    const blocks = [...document.querySelectorAll('[aria-label="Support"]')]
    const targetOf = (a: Animation) => (a.effect as KeyframeEffect | null)?.target
    // A dialog or panel around the block may still be arriving: let its finite entrance finish first.
    // The block's own animations, and anything that never ends, are not waited for.
    const arriving = document.getAnimations().filter((a) => {
      const target = targetOf(a)
      return target && a.effect?.getTiming().iterations !== Infinity && blocks.some((block) => target !== block && target.contains(block))
    })
    await Promise.all(arriving.map((a) => a.finished.catch(() => undefined)))
    return {
      blocks: blocks.length,
      // A hover or press transition on a button is a response, not motion the block makes on its own
      animations: document.getAnimations().filter((a) => {
        if (a instanceof CSSTransition) return false
        if (a.playState !== 'running') return false
        const target = (a.effect as KeyframeEffect | null)?.target
        // The block, anything inside it and anything that contains it (a fading parent counts too)
        return target ? blocks.some((block) => block.contains(target) || target.contains(block)) : false
      }).map((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target
        return `${(a as CSSAnimation).animationName ?? a.constructor.name} on <${target?.tagName.toLowerCase()} class="${target?.className}">`
      }),
      goes: blocks.reduce((sum, block) => sum + block.querySelectorAll('[data-go]').length, 0),
      gives: blocks.reduce((sum, block) => sum + block.querySelectorAll('[data-give]').length + (/\b(donat\w*|giv(e|ing))\b/i.test(block.textContent ?? '') ? 1 : 0), 0),
    }
  })
  expect(care.blocks).toBeGreaterThan(0)
  expect(care.animations).toEqual([])
  expect(care.goes).toBe(0)
  expect(care.gives).toBe(0)
}
