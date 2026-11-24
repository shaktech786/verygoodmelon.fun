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
