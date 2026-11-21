import { test, expect } from '@playwright/test'
import { describeWritingGame } from './helpers/writing-game'

/**
 * The Awakening (First Words): imagine the moment after your life ends, say
 * your first words, hear a quiet welcome, and wake back up into today. Others'
 * words appear as a cloud when the store is reachable.
 *
 * Run with: npx playwright test __tests__/e2e/first-breath.e2e.test.ts
 */
test.describe('The Awakening', () => {
  describeWritingGame({
    slug: 'first-breath',
    game: 'first-words',
    submitLabel: 'Speak',
    againLabel: 'Imagine it again',
    thanksHeading: "You've arrived",
    textboxLabel: 'Your first words on arriving',
    cloudLabel: 'Most common first words',
    firstPrompt: 'Who do you hope is there?',
    secondPrompt: 'What do you notice first?',
    closingButton: 'Wake up',
    closingLine: /^Welcome back to today\./,
    othersLine: /300 others have arrived before you/,
    firstLine: /^You are the first to arrive\.$/,
  })

  test('waking up turns the dawn into ordinary daylight and says welcome back', async ({ page }) => {
    await page.route('**/api/first-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    await page.route('**/api/first-words/reflect', (route) => route.fulfill({ json: { reflection: 'Welcome. Rest as long as you like.' } }))
    await page.goto('/games/first-breath')

    await expect(page.getByText('You open your eyes. It is quiet, and nothing hurts.')).toBeVisible()
    await expect(async () => {
      await page.getByRole('textbox', { name: 'Your first words on arriving' }).fill('Oh. It is so quiet.')
      await expect(page.getByRole('button', { name: 'Speak', exact: true })).toBeEnabled({ timeout: 500 })
    }).toPass()
    await page.getByRole('button', { name: 'Speak', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Before you go back' })).toBeVisible()
    await page.getByRole('button', { name: 'Wake up' }).click()
    await expect(page.getByRole('heading', { name: 'Back on this side' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Wake up' })).toHaveCount(0)
  })
})
