import { test, expect, type Page } from '@playwright/test'
import { axeViolations, describeWritingGame } from './helpers/writing-game'
import { expectKeepsakeSaves } from './helpers/keepsake'

async function leaveWords(page: Page, words: string) {
  await page.route('**/api/last-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
  await page.route('**/api/last-words/reflect', (route) => route.fulfill({ json: { reflection: 'Say it soon.' } }))
  await page.goto('/games/final-breath')
  await expect(async () => {
    await page.getByRole('textbox', { name: 'Your final words' }).fill(words)
    await expect(page.getByRole('button', { name: 'Leave these words' })).toBeEnabled({ timeout: 500 })
  }).toPass()
  await page.getByRole('button', { name: 'Leave these words' }).click()
  await expect(page.getByText('Say it soon.')).toBeVisible()
}

const closingLine = (page: Page) => page.getByText(/^The candle is out\./)

/**
 * The Final Word (Last Words): by candlelight, write what you would say at the
 * end, hear it back, see that it does not have to wait, and blow out the
 * candle. Others' words appear as a cloud when the store is reachable.
 *
 * Run with: npx playwright test __tests__/e2e/final-breath.e2e.test.ts
 */
test.describe('The Final Word', () => {
  describeWritingGame({
    slug: 'final-breath',
    game: 'last-words',
    submitLabel: 'Leave these words',
    careAgainLabel: 'Write another',
    againLabel: 'Write another',
    thanksHeading: 'Thank you for writing this',
    careHeading: 'We’re glad you wrote this down',
    textboxLabel: 'Your final words',
    cloudLabel: 'Most common last words',
    firstPrompt: 'What do you want the people you love to know?',
    secondPrompt: 'What took you too long to learn?',
    closingButton: 'Blow out the candle',
    closingLine: /^The candle is out\./,
    othersLine: /It joins what 300 others would say/,
    firstLine: /^Yours are the first words here\.$/,
  })

  test('blowing out the candle lets smoke rise and the card fall to dusk, then gives the words back on a card to keep', async ({ page }) => {
    await leaveWords(page, 'Mum, you were right about the garden.')
    await expect(page.getByTestId('candle-smoke')).toHaveCount(0)
    await page.getByRole('button', { name: 'Blow out the candle' }).click()

    await expect(closingLine(page)).toBeFocused()
    await expect(page.getByTestId('candle-smoke')).toBeVisible()
    await expect(page.getByTestId('dusk')).toHaveCSS('opacity', '1', { timeout: 8000 })
    // The words wait for the smoke, then settle
    await expect(closingLine(page)).toHaveCSS('opacity', '1', { timeout: 8000 })
    await expect(page.getByRole('button', { name: 'Blow out the candle' })).toHaveCount(0)

    await expectKeepsakeSaves(page, {
      fileName: /^the-final-word-\d{4}-\d{2}-\d{2}\.png$/,
      describedAs: /begins “To Mum,” with your words beneath: “You were right about the garden\.”/,
    })
    await expect(page.getByRole('button', { name: 'Write another' })).toBeVisible()
  })

  test('the card is written to whoever the question was about', async ({ page }) => {
    await page.route('**/api/last-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    await page.route('**/api/last-words/reflect', (route) => route.fulfill({ json: { reflection: 'Say it soon.' } }))
    await page.goto('/games/final-breath')
    // Clicks before hydration do nothing, so ask until the question arrives
    await expect(async () => {
      await page.getByRole('button', { name: 'Another question' }).click()
      await expect(page.getByText('What would you tell your younger self?')).toBeVisible({ timeout: 300 })
    }).toPass()
    await expect(async () => {
      await page.getByRole('textbox', { name: 'Your final words' }).fill('Be gentler with yourself.')
      await expect(page.getByRole('button', { name: 'Leave these words' })).toBeEnabled({ timeout: 500 })
    }).toPass()
    await page.getByRole('button', { name: 'Leave these words' }).click()
    await page.getByRole('button', { name: 'Blow out the candle' }).click()
    await expect(page.getByTestId('keepsake-canvas')).toHaveAccessibleDescription(/“To my younger self,” with your words beneath: “Be gentler with yourself\.”/)
  })

  test('the first question writes to the people the player loves', async ({ page }) => {
    await leaveWords(page, 'It was worth every ordinary morning.')
    await page.getByRole('button', { name: 'Blow out the candle' }).click()
    await expect(page.getByTestId('keepsake-canvas')).toHaveAccessibleDescription(/“To the people I love,”/)
  })

  test('with no one named or asked about, the card goes to whoever needs it', async ({ page }) => {
    await page.route('**/api/last-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    await page.route('**/api/last-words/reflect', (route) => route.fulfill({ json: { reflection: 'Say it soon.' } }))
    await page.goto('/games/final-breath')
    await expect(async () => {
      await page.getByRole('button', { name: 'Another question' }).click()
      await expect(page.getByText('What took you too long to learn?')).toBeVisible({ timeout: 300 })
    }).toPass()
    await expect(async () => {
      await page.getByRole('textbox', { name: 'Your final words' }).fill('That rest is not a reward.')
      await expect(page.getByRole('button', { name: 'Leave these words' })).toBeEnabled({ timeout: 500 })
    }).toPass()
    await page.getByRole('button', { name: 'Leave these words' }).click()
    await page.getByRole('button', { name: 'Blow out the candle' }).click()
    await expect(page.getByTestId('keepsake-canvas')).toHaveAccessibleDescription(/“To whoever needs it,” with your words beneath: “That rest is not a reward\.”/)
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('the candle goes straight to its still last frame: a trace of smoke, dusk, the words and the card at once', async ({ page }) => {
      await leaveWords(page, 'Look after each other.')
      await page.getByRole('button', { name: 'Blow out the candle' }).click()
      await expect(closingLine(page)).toBeFocused()
      expect(await closingLine(page).evaluate((el) => [getComputedStyle(el).opacity, el.getAnimations().length])).toEqual(['1', 0])
      const smoke = page.getByTestId('candle-smoke').locator('path')
      expect(await smoke.evaluate((el) => [getComputedStyle(el).opacity, el.getAnimations().length])).toEqual(['0.45', 0])
      await expect(page.getByTestId('dusk')).toHaveCSS('opacity', '1')
      await expectKeepsakeSaves(page, { fileName: /^the-final-word-/ })
    })
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the ending, with its card, has no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await leaveWords(page, 'Dear Sam, keep singing in the car.')
      await page.getByRole('button', { name: 'Blow out the candle' }).click()
      await expect(page.getByTestId('keepsake-canvas')).toBeVisible()
      expect(await axeViolations(page)).toEqual([])
    })
  }

  test('the words can be copied to send to someone today', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.route('**/api/last-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    await page.route('**/api/last-words/reflect', (route) => route.fulfill({ json: { reflection: 'Say it soon.' } }))
    await page.goto('/games/final-breath')

    await expect(async () => {
      await page.getByRole('textbox', { name: 'Your final words' }).fill('Mum, you were right about the garden.')
      await expect(page.getByRole('button', { name: 'Leave these words' })).toBeEnabled({ timeout: 500 })
    }).toPass()
    await page.getByRole('button', { name: 'Leave these words' }).click()

    await expect(page.getByRole('heading', { name: "These don't have to wait" })).toBeVisible()
    await page.getByRole('button', { name: 'Copy my words' }).click()
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Mum, you were right about the garden.')
  })

  test('when the count cannot load nothing stands in for it, and "today" is said once at most', async ({ page }) => {
    await page.route('**/api/last-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    await page.route('**/api/last-words/reflect', (route) =>
      route.fulfill({ json: { reflection: 'This is about your sister. Someone could hear it from you today.' } })
    )
    await page.goto('/games/final-breath')
    await expect(async () => {
      await page.getByRole('textbox', { name: 'Your final words' }).fill('Tell my sister she was the brave one.')
      await expect(page.getByRole('button', { name: 'Leave these words' })).toBeEnabled({ timeout: 500 })
    }).toPass()
    await page.getByRole('button', { name: 'Leave these words' }).click()

    await expect(page.getByRole('heading', { name: "These don't have to wait" })).toBeVisible()
    await expect(page.getByText(/Take a moment|others would say|first words here/)).toHaveCount(0)
    const text = await page.locator('main').innerText()
    expect(text.match(/\btoday\b/gi) ?? []).toHaveLength(1)
  })

  test('someone who may be in danger is not offered a flame to put out', async ({ page }) => {
    await page.route('**/api/last-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    await page.route('**/api/last-words/reflect', (route) => route.fulfill({ status: 500, json: {} }))
    await page.goto('/games/final-breath')

    await expect(async () => {
      await page.getByRole('textbox', { name: 'Your final words' }).fill('I want to kill myself')
      await expect(page.getByRole('button', { name: 'Leave these words' })).toBeEnabled({ timeout: 500 })
    }).toPass()
    await page.getByRole('button', { name: 'Leave these words' }).click()

    await expect(page.getByRole('complementary', { name: 'Support' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Blow out the candle' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Copy my words' })).toHaveCount(0)
    // No flame at all beside the quoted words, lit or out
    await expect(page.getByTestId('candle')).toHaveCount(0)
    await expect(page.getByText(/candle is out/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Write another' })).toBeVisible()
  })

  test('regression: the candle goes when only the reply recognises the danger', async ({ page }) => {
    await page.route('**/api/last-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    await page.route('**/api/last-words/reflect', (route) =>
      route.fulfill({ json: { reflection: 'Thank you for trusting this page.', care: true } })
    )
    await page.goto('/games/final-breath')
    await expect(page.getByTestId('candle')).toBeVisible()

    await expect(async () => {
      await page.getByRole('textbox', { name: 'Your final words' }).fill('Honestly I am done with all of it.')
      await expect(page.getByRole('button', { name: 'Leave these words' })).toBeEnabled({ timeout: 500 })
    }).toPass()
    await page.getByRole('button', { name: 'Leave these words' }).click()

    await expect(page.getByRole('complementary', { name: 'Support' })).toBeVisible()
    await expect(page.getByTestId('candle')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Blow out the candle' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Write another' }).click()
    await expect(page.getByRole('textbox', { name: 'Your final words' })).toBeFocused()
    await expect(page.getByTestId('candle')).toHaveCount(0)
  })

  test('regression: the support panel stays for the rest of the visit, and the heading is gentle', async ({ page }) => {
    await page.route('**/api/last-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    await page.route('**/api/last-words/reflect', (route) => route.fulfill({ status: 500, json: {} }))
    await page.goto('/games/final-breath')

    await expect(async () => {
      await page.getByRole('textbox', { name: 'Your final words' }).fill('I want to kill myself')
      await expect(page.getByRole('button', { name: 'Leave these words' })).toBeEnabled({ timeout: 500 })
    }).toPass()
    await page.getByRole('button', { name: 'Leave these words' }).click()

    await expect(page.getByRole('heading', { name: 'We’re glad you wrote this down' })).toBeFocused()
    await expect(page.getByRole('heading', { name: 'Thank you for writing this' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Write another' }).click()
    await expect(page.getByRole('complementary', { name: 'Support' })).toBeVisible()

    await expect(async () => {
      await page.getByRole('textbox', { name: 'Your final words' }).fill('Look after the dog.')
      await expect(page.getByRole('button', { name: 'Leave these words' })).toBeEnabled({ timeout: 500 })
    }).toPass()
    await page.getByRole('button', { name: 'Leave these words' }).click()
    await expect(page.getByRole('complementary', { name: 'Support' })).toBeVisible()
    await expect(page.getByRole('heading', { name: "These don't have to wait" })).toHaveCount(0)
  })
})
