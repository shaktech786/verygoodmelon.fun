import { test, expect } from '@playwright/test'
import { describeWritingGame } from './helpers/writing-game'

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
    textboxLabel: 'Your final words',
    cloudLabel: 'Most common last words',
    firstPrompt: 'What do you want the people you love to know?',
    secondPrompt: 'What took you too long to learn?',
    closingButton: 'Blow out the candle',
    closingLine: /^The candle is out\./,
    othersLine: /It joins what 300 others would say/,
    firstLine: /^Yours are the first words here\.$/,
  })

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
})
