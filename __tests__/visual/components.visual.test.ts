import { test, expect } from '@playwright/test'

/**
 * Visual regression tests for UI components
 */
test.describe('Component Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page with components (adjust as needed)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('buttons render consistently', async ({ page }) => {
    const button = page.locator('button').first()
    if (await button.isVisible()) {
      await expect(button).toHaveScreenshot('button-default.png')
    }
  })

  test('button hover state', async ({ page }) => {
    const button = page.locator('button').first()
    if (await button.isVisible()) {
      await button.hover()
      await expect(button).toHaveScreenshot('button-hover.png')
    }
  })

  test('button focus state', async ({ page }) => {
    const button = page.locator('button').first()
    if (await button.isVisible()) {
      await button.focus()
      await expect(button).toHaveScreenshot('button-focus.png')
    }
  })

  test('cards render consistently', async ({ page }) => {
    const card = page.locator('[class*="card"]').first()
    if (await card.isVisible()) {
      await expect(card).toHaveScreenshot('card-default.png')
    }
  })
})
