import { expect, test, type Page } from '@playwright/test'

/**
 * Games drawn on the server before they hydrate (lib/games/kept-boot.ts) mark that view `data-booting`.
 * A click on it before React attaches does nothing, so in these specs every load waits until no booting view is left.
 */
export function waitForHydrationOnEveryLoad(): void {
  test.beforeEach(({ page }) => {
    for (const name of ['goto', 'reload'] as const) {
      const load = page[name].bind(page) as (...args: unknown[]) => ReturnType<Page['reload']>
      ;(page as unknown as Record<string, unknown>)[name] = async (...args: unknown[]) => {
        const response = await load(...args)
        await expect(page.locator('[data-booting]')).toHaveCount(0)
        return response
      }
    }
  })
}
