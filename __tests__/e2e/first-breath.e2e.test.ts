import { test, expect, type Page } from '@playwright/test'
import { describeWritingGame } from './helpers/writing-game'

/**
 * The Awakening (First Words): imagine the moment after your life ends, say
 * your first words, choose one small thing to bring back into tomorrow, and
 * wake at dawn with it. Others' words appear as a cloud when the store is
 * reachable.
 *
 * Run with: npx playwright test __tests__/e2e/first-breath.e2e.test.ts
 */
test.describe('The Awakening', () => {
  describeWritingGame({
    slug: 'first-breath',
    game: 'first-words',
    submitLabel: 'Speak',
    careAgainLabel: 'Start over',
    againLabel: 'Imagine it again',
    thanksHeading: 'Before you wake',
    textboxLabel: 'Your first words on arriving',
    cloudLabel: 'Most common first words',
    firstPrompt: 'Who do you hope is there?',
    secondPrompt: 'What do you notice first?',
    closingButton: 'Wake up',
    closingLine: /^Good morning$/,
    othersLine: /300 others have stood here and come back/,
    firstLine: /^You are the first to stand here and come back\.$/,
  })

  const INTENTION = 'Put on one song and dance in the kitchen.'
  const intentionBox = (page: Page) => page.getByRole('textbox', { name: 'One small thing to bring back into tomorrow' })
  const daySky = (page: Page) => page.locator('[data-sky="day"]')

  async function speak(page: Page, words: string) {
    await expect(async () => {
      await page.getByRole('textbox', { name: 'Your first words on arriving' }).fill(words)
      await expect(page.getByRole('button', { name: 'Speak', exact: true })).toBeEnabled({ timeout: 500 })
    }).toPass()
    await page.getByRole('button', { name: 'Speak', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Before you wake' })).toBeFocused()
  }

  async function offline(page: Page, reply: object) {
    await page.route('**/api/first-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    await page.route('**/api/first-words/reflect', (route) => route.fulfill({ json: reply }))
  }

  test('the words become one small thing for tomorrow, and the player wakes with it', async ({ page }) => {
    await offline(page, { reflection: 'Dancing sounds like joy you can still reach.', intention: INTENTION })
    await page.goto('/games/first-breath')
    await expect(page.getByText('You open your eyes. It is quiet, and nothing hurts.')).toBeVisible()

    await speak(page, 'I wish I had danced more.')
    await expect(intentionBox(page)).toHaveValue(INTENTION)
    await intentionBox(page).fill('Dance with Sam after dinner.')
    await page.getByRole('button', { name: 'Wake up' }).click()

    await expect(page.getByRole('heading', { name: 'Good morning' })).toBeFocused()
    await expect(page.getByText('Over there, you said “I wish I had danced more.” You woke up with this:')).toBeVisible()
    await expect(page.getByText('Dance with Sam after dinner.', { exact: true })).toBeVisible()
    await expect(daySky(page)).toHaveCSS('opacity', '1')
    await expect(page.getByRole('button', { name: 'Wake up' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Copy it for tomorrow' })).toBeVisible()
  })

  test('a suggestion never overwrites what the player has already started writing', async ({ page }) => {
    await page.route('**/api/first-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    let answer: () => void = () => {}
    const replied = new Promise<void>((resolve) => (answer = resolve))
    await page.route('**/api/first-words/reflect', async (route) => {
      await replied
      await route.fulfill({ json: { reflection: 'Carry it home.', intention: INTENTION } })
    })
    await page.goto('/games/first-breath')

    await speak(page, 'Where did everyone go?')
    await intentionBox(page).fill('Ring Grandad')
    answer()
    await expect(page.getByText('Carry it home.')).toBeVisible()
    await expect(intentionBox(page)).toHaveValue('Ring Grandad')
  })

  test('waking with nothing chosen still links back to what was said', async ({ page }) => {
    await offline(page, { reflection: 'Carry it home.', intention: INTENTION })
    await page.goto('/games/first-breath')

    await speak(page, 'Where is everyone?')
    await intentionBox(page).fill('')
    await page.getByRole('button', { name: 'Wake up' }).click()
    await expect(page.getByText(/^Over there, you said “Where is everyone\?” Whatever you reached for there/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy it for tomorrow' })).toHaveCount(0)
  })

  test('in care mode the return is offered without a plan to fill in and without repeating the words', async ({ page }) => {
    await offline(page, { reflection: 'Thank you for trusting this page.', care: true })
    await page.goto('/games/first-breath')

    await speak(page, 'I hope it is over for good this time')
    await expect(page.getByRole('complementary', { name: 'Support' })).toBeVisible()
    await expect(intentionBox(page)).toHaveCount(0)

    await page.getByRole('button', { name: 'Wake up' }).click()
    await expect(page.getByRole('heading', { name: 'Good morning' })).toBeFocused()
    await expect(page.getByText('You came back. It is good to have you here, today.')).toBeVisible()
    await expect(page.getByText(/Over there, you said/)).toHaveCount(0)
    await expect(page.getByRole('complementary', { name: 'Support' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start over' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Imagine it again' })).toHaveCount(0)
  })

  test('regression: a plan for tomorrow that sounds like danger brings care instead of being shown back', async ({ page }) => {
    await offline(page, { reflection: 'Carry it home.', intention: INTENTION })
    await page.goto('/games/first-breath')

    await speak(page, 'It is so quiet here.')
    await intentionBox(page).fill('never wake up again')
    await page.getByRole('button', { name: 'Wake up' }).click()

    await expect(page.getByRole('complementary', { name: 'Support' })).toBeVisible()
    await expect(page.getByText('You came back. It is good to have you here, today.')).toBeVisible()
    await expect(page.getByText('never wake up again', { exact: true })).toHaveCount(0)
    const related = page.getByRole('region', { name: 'Something gentle, if it helps' })
    await expect(related.locator('a[href="/games/first-breath"], a[href="/games/final-breath"]')).toHaveCount(0)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('regression: the sky turning to morning happens on screen, beside the greeting', async ({ page }) => {
      await offline(page, { reflection: 'Dancing sounds like joy you can still reach.', intention: INTENTION })
      await page.goto('/games/first-breath')

      await speak(page, 'Oh. Mum? I was so scared of this part and it was just quiet. I wish I had danced more.')
      // Push the sky well off screen, as reading down to the button does
      await page.getByRole('button', { name: 'Wake up' }).scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: 'Wake up' }).click()

      await expect(page.getByRole('heading', { name: 'Good morning' })).toBeFocused()
      await expect(async () => {
        const sky = await daySky(page).boundingBox()
        const heading = await page.getByRole('heading', { name: 'Good morning' }).boundingBox()
        // Below the site's sticky header, not tucked under it
        const header = await page.locator('header').first().boundingBox()
        expect(sky!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1)
        expect(heading!.y + heading!.height).toBeLessThanOrEqual(844)
      }).toPass()
      await expect(page.getByText(INTENTION, { exact: true })).toBeInViewport()
    })
  })
})
