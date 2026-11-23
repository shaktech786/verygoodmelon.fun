import { expect, type Locator, type Page } from '@playwright/test'

async function openSettings(page: Page): Promise<Locator> {
  const panel = page.getByRole('dialog', { name: 'Accessibility settings' })
  // A tap that lands before the page has hydrated does nothing, so it is tried again
  await expect(async () => {
    if (!(await panel.isVisible())) await page.getByRole('button', { name: 'Open accessibility settings' }).click()
    await expect(panel).toBeVisible({ timeout: 1000 })
  }).toPass()
  return panel
}

async function closeSettings(panel: Locator): Promise<void> {
  await panel.getByRole('button', { name: 'Close accessibility settings' }).click()
  await expect(panel).toHaveCount(0)
}

/** The game page's one ambient sound control: a switch in the settings panel, opened from the header gear. */
export async function setAmbientSound(page: Page, on: boolean): Promise<void> {
  const panel = await openSettings(page)
  const ambient = panel.getByRole('switch', { name: 'Ambient sound' })
  if ((await ambient.getAttribute('aria-checked')) !== String(on)) await ambient.click()
  await expect(ambient).toHaveAttribute('aria-checked', String(on))
  await closeSettings(panel)
}

/** Reads the switch without leaving the panel open. */
export async function ambientSoundIsOn(page: Page): Promise<boolean> {
  const panel = await openSettings(page)
  const on = (await panel.getByRole('switch', { name: 'Ambient sound' }).getAttribute('aria-checked')) === 'true'
  await closeSettings(panel)
  return on
}
