import { test, expect } from '@playwright/test'

/**
 * E2E Tests for all VeryGoodMelon games
 *
 * Run with: npx playwright test __tests__/e2e/games.e2e.test.ts
 *
 * These tests verify:
 * - Each game page loads without errors
 * - Key interactive elements are present and functional
 * - No console errors occur
 * - Basic accessibility requirements are met
 */

test.describe('Homepage', () => {
  test('loads and displays game cards', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page).toHaveTitle(/VeryGoodMelon/)

    // Check tagline is visible
    await expect(page.getByText('Think deeply')).toBeVisible()
    await expect(page.getByText('lighter')).toBeVisible()

    // Check game cards are rendered (should be 6 games)
    const gameCards = page.locator('a[href^="/games/"]')
    await expect(gameCards).toHaveCount(6)
  })

  test('constellation background renders', async ({ page }) => {
    await page.goto('/')

    // Canvas element should exist (constellation background)
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
  })
})

test.describe('The Optimist (Hope Daily)', () => {
  test('game loads and shows word grid', async ({ page }) => {
    await page.goto('/games/the-silver-lining')

    // Check page loads
    await expect(page.getByRole('application', { name: /Hope Daily/i })).toBeVisible()

    // Check keyboard is visible
    await expect(page.getByRole('button', { name: 'Q' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ENTER' })).toBeVisible()

    // Check instructions are shown
    await expect(page.getByText(/Guess the/i)).toBeVisible()
  })

  test('keyboard input works', async ({ page }) => {
    await page.goto('/games/the-silver-lining')

    // Wait for game to load
    await page.waitForSelector('[role="application"]')

    // Type a letter using keyboard
    await page.keyboard.press('H')
    await page.keyboard.press('E')
    await page.keyboard.press('L')
    await page.keyboard.press('L')
    await page.keyboard.press('O')

    // Check letters appear in grid (gridcells with letters)
    const filledCells = page.locator('[role="gridcell"]').filter({ hasText: /[A-Z]/ })
    await expect(filledCells.first()).toBeVisible()
  })
})

test.describe('The Sage (Timeless Minds)', () => {
  test('game loads with a thinker', async ({ page }) => {
    await page.goto('/games/ancient-voices')

    // Check video call UI loads
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10000 })

    // Check chat input exists
    await expect(page.getByPlaceholder(/Type a message/i)).toBeVisible()

    // Check thinker name is displayed (name tag in bottom left)
    const nameTag = page.locator('.absolute.bottom-2').first()
    await expect(nameTag).toBeVisible()
  })

  test('topic suggestions appear', async ({ page }) => {
    await page.goto('/games/ancient-voices')

    // Wait for opening message and topic suggestions
    await page.waitForSelector('text=Try asking about', { timeout: 10000 })

    // Topic suggestion buttons should be visible
    const topicButtons = page.locator('button').filter({ hasText: /\?$/ })
    await expect(topicButtons.first()).toBeVisible()
  })

  test('can send a message', async ({ page }) => {
    await page.goto('/games/ancient-voices')

    // Wait for chat to be ready
    await page.waitForSelector('[placeholder*="Type a message"]')

    // Type and send a message
    await page.fill('[placeholder*="Type a message"]', 'Hello')
    await page.click('button[aria-label="Send message"]')

    // User message should appear
    await expect(page.getByText('Hello')).toBeVisible()

    // Wait for response (loading dots then response)
    await page.waitForSelector('.animate-bounce', { state: 'hidden', timeout: 30000 })
  })
})

test.describe('The Dilemma (Hard Choices)', () => {
  test('game loads with a dilemma', async ({ page }) => {
    await page.goto('/games/the-crossroads')

    // Check title
    await expect(page.getByRole('heading', { name: /The Dilemma/i })).toBeVisible()

    // Check two choice buttons exist
    const choiceA = page.getByRole('button', { name: /Choice A/i })
    const choiceB = page.getByRole('button', { name: /Choice B/i })
    await expect(choiceA).toBeVisible()
    await expect(choiceB).toBeVisible()
  })

  test('can vote on a dilemma', async ({ page }) => {
    await page.goto('/games/the-crossroads')

    // Clear any existing votes from localStorage
    await page.evaluate(() => localStorage.removeItem('hardChoicesVotes'))
    await page.reload()

    // Click choice A
    const choiceA = page.getByRole('button', { name: /Choice A/i })
    await choiceA.click()

    // Results should appear (percentage text)
    await expect(page.getByText(/% chose this/i).first()).toBeVisible({ timeout: 5000 })

    // Next button should appear
    await expect(page.getByRole('button', { name: /Next Dilemma/i })).toBeVisible()
  })

  test('has deeper philosophical dilemmas', async ({ page }) => {
    await page.goto('/games/the-crossroads')

    // Navigate through to find philosophical content
    // Check for existential/ethics categories
    const categoryText = page.locator('text=/existential|ethics|meaning|metaphysics|love|identity/i')

    // Should find at least one philosophical category
    let found = false
    for (let i = 0; i < 5; i++) {
      if (await categoryText.count() > 0) {
        found = true
        break
      }
      // Vote and go next
      await page.getByRole('button', { name: /Choice A/i }).click()
      await page.waitForTimeout(500)
      const nextBtn = page.getByRole('button', { name: /Next Dilemma/i })
      if (await nextBtn.isVisible()) {
        await nextBtn.click()
      }
    }
    expect(found).toBe(true)
  })
})

test.describe('The Patient One (The Unrusher)', () => {
  test('game loads with task selection', async ({ page }) => {
    await page.goto('/games/the-long-breath')

    // Check title
    await expect(page.getByText(/Anti-Game/i)).toBeVisible()

    // Check tasks are visible
    await expect(page.getByText('Just Breathe')).toBeVisible()
    await expect(page.getByText('Watch the Seeds')).toBeVisible()
    await expect(page.getByText('Listen to Silence')).toBeVisible()
  })

  test('can start a breathing task', async ({ page }) => {
    await page.goto('/games/the-long-breath')

    // Click on breathing task
    await page.click('text=Just Breathe')

    // Should show breathing guidance
    await expect(page.getByText(/Inhale|Exhale|Hold/i)).toBeVisible({ timeout: 5000 })

    // Timer should be visible
    await expect(page.getByText(/\d:\d{2}/)).toBeVisible()

    // Stop button should be available
    await expect(page.getByText(/I need to stop/i)).toBeVisible()
  })

  test('breathing circle visualization works', async ({ page }) => {
    await page.goto('/games/the-long-breath')

    // Start breathing task
    await page.click('text=Just Breathe')

    // Check for breathing circle (the animated element)
    const breathingCircle = page.locator('[aria-label*="Breathing circle"]')
    await expect(breathingCircle).toBeVisible()
  })
})

test.describe('The Final Word (Last Words)', () => {
  test('game loads with input form', async ({ page }) => {
    await page.goto('/games/final-breath')

    // Check title and prompt
    await expect(page.getByText(/final message/i)).toBeVisible()

    // Check textarea exists
    await expect(page.getByRole('textbox')).toBeVisible()

    // Check submit button
    await expect(page.getByRole('button', { name: /Leave Your Mark/i })).toBeVisible()
  })

  test('has rotating reflection prompts', async ({ page }) => {
    await page.goto('/games/final-breath')

    // Check for reflection prompt area
    const promptArea = page.locator('text=/💭/')
    await expect(promptArea).toBeVisible()
  })

  test('can type in textarea', async ({ page }) => {
    await page.goto('/games/final-breath')

    const textarea = page.getByRole('textbox')
    await textarea.fill('Test message')

    // Character count should update (12 chars)
    await expect(page.getByText(/12\/500/)).toBeVisible()
  })
})

test.describe('The Awakening (First Words)', () => {
  test('game loads with ethereal theme', async ({ page }) => {
    await page.goto('/games/first-breath')

    // Check title
    await expect(page.getByRole('heading', { name: /crossed over/i })).toBeVisible()

    // Check textarea exists
    await expect(page.getByRole('textbox')).toBeVisible()

    // Check for ethereal prompt indicator
    await expect(page.locator('text=/✦/')).toBeVisible()
  })

  test('has unique contemplative prompts', async ({ page }) => {
    await page.goto('/games/first-breath')

    // Check for awakening-specific prompts (different from last-words)
    const prompts = [
      'Do you recognize this place',
      'Who do you hope to see',
      'What do you feel now',
      'Is it what you expected'
    ]

    // At least one prompt should be visible
    let foundPrompt = false
    for (const prompt of prompts) {
      if (await page.locator(`text=${prompt}`).count() > 0) {
        foundPrompt = true
        break
      }
    }

    // If not immediately visible, wait for rotation
    if (!foundPrompt) {
      await page.waitForTimeout(7000) // Wait for prompt rotation
      for (const prompt of prompts) {
        if (await page.locator(`text=${prompt}`).count() > 0) {
          foundPrompt = true
          break
        }
      }
    }

    expect(foundPrompt).toBe(true)
  })

  test('submit button has ethereal text', async ({ page }) => {
    await page.goto('/games/first-breath')

    await expect(page.getByRole('button', { name: /Share Your Vision/i })).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/games/the-silver-lining', name: 'The Optimist' },
    { path: '/games/the-crossroads', name: 'The Dilemma' },
    { path: '/games/the-long-breath', name: 'The Patient One' },
    { path: '/games/final-breath', name: 'The Final Word' },
    { path: '/games/first-breath', name: 'The Awakening' },
  ]

  for (const { path, name } of pages) {
    test(`${name} has no obvious accessibility issues`, async ({ page }) => {
      await page.goto(path)

      // Check skip link exists
      await expect(page.locator('a[href="#main-content"]')).toBeAttached()

      // Check main landmark exists
      await expect(page.locator('main#main-content')).toBeVisible()

      // Check no images without alt text (excluding decorative)
      const imagesWithoutAlt = page.locator('img:not([alt]):not([aria-hidden="true"])')
      await expect(imagesWithoutAlt).toHaveCount(0)
    })
  }
})

test.describe('No Console Errors', () => {
  const pages = [
    '/',
    '/games/the-silver-lining',
    '/games/ancient-voices',
    '/games/the-crossroads',
    '/games/the-long-breath',
    '/games/final-breath',
    '/games/first-breath',
  ]

  for (const path of pages) {
    test(`${path} has no console errors`, async ({ page }) => {
      const errors: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // Filter out expected/acceptable errors
      const criticalErrors = errors.filter(err =>
        !err.includes('favicon') &&
        !err.includes('Failed to load resource') &&
        !err.includes('third-party') &&
        !err.includes('SpeechSynthesis') // Headless browsers don't support speech synthesis
      )

      expect(criticalErrors).toHaveLength(0)
    })
  }
})
