import type { Page } from '@playwright/test'

/**
 * Waits until every finite animation that is running has finished, so no fade is measured half-way.
 * Endless loops and paused animations never finish, so they are not waited for; and the wait is capped, so a very long
 * one cannot hang the test (what is still moving then is for the test's own checks to see).
 */
export async function settle(page: Page, capMs = 5000): Promise<void> {
  await page.evaluate(
    (cap) =>
      Promise.race([
        Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity)
            .map((animation) => animation.finished.catch(() => undefined))
        ),
        new Promise((resolve) => setTimeout(resolve, cap)),
      ]),
    capMs
  )
}
