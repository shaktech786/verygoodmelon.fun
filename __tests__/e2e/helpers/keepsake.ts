import { readFile } from 'fs/promises'
import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Checks a keepsake end to end: the picture is described for screen readers, and
 * "Save image" hands the browser a real PNG named after the game and the day.
 */
export async function expectKeepsakeSaves(page: Page, options: { within?: Locator; fileName: RegExp; describedAs?: RegExp }) {
  const scope = options.within ?? page.locator('main')
  const canvas = scope.getByTestId('keepsake-canvas')
  await expect(canvas).toBeVisible()
  if (options.describedAs) await expect(canvas).toHaveAccessibleDescription(options.describedAs)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    scope.getByRole('button', { name: 'Save image' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(options.fileName)
  const file = await readFile(await download.path())
  // Every PNG begins with the same eight bytes.
  expect([...file.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  await expect(scope.getByRole('status').filter({ hasText: 'Saved to your device.' })).toBeVisible()
}
