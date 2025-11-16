import { test, expect } from '@playwright/test'

/**
 * Visual regression tests for homepage
 * These tests capture screenshots and compare them to baselines
 */
test.describe('Homepage Visual Tests', () => {
  test('homepage renders correctly on desktop', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
    })
  })

  test('homepage renders correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
    })
  })

  test('homepage header is consistent', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const header = page.locator('header')
    await expect(header).toHaveScreenshot('homepage-header.png')
  })

  test('homepage respects dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
      fullPage: true,
    })
  })

  test('homepage respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('homepage-reduced-motion.png', {
      fullPage: true,
    })
  })
})
