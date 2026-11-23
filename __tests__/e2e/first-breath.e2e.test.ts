import { test, expect, type Page } from '@playwright/test'
import { axeViolations, describeWritingGame } from './helpers/writing-game'
import { expectKeepsakeSaves } from './helpers/keepsake'

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
    careAgainLabel: null,
    againLabel: 'Imagine it again',
    thanksHeading: 'Before you wake',
    careHeading: 'Before you wake',
    textboxLabel: 'Your first words on arriving',
    cloudLabel: 'Most common first words',
    firstPrompt: 'Who do you hope is there?',
    secondPrompt: 'What do you notice first?',
    closingButton: 'Wake up',
    closingNeedsJudgement: true,
    holdingLine: 'The quiet listens…',
    closingLine: /^Good morning$/,
    othersLine: /^Others have stood here and come back\.$/,
    keptLine: 'What you said stays with you. There is no hurry here.',
    firstLine: /^You are the first to stand here and come back\.$/,
    careGate: "I'd still like to",
  })

  const INTENTION = 'Put on one song and dance in the kitchen.'
  const OPENING_LINE = 'You open your eyes. It is quiet, and the light is soft.'
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
    await offline(page, { reflection: 'Dancing sounds like joy you can still reach.', intention: INTENTION, safe: true })
    await page.goto('/games/first-breath')
    await expect(page.getByText(OPENING_LINE)).toBeVisible()
    await expect(page.getByText(/nothing hurts/)).toHaveCount(0)

    await speak(page, 'I wish I had danced more.')
    await expect(intentionBox(page)).toHaveValue(INTENTION)
    await intentionBox(page).fill('Dance with Sam after dinner.')
    await page.getByRole('button', { name: 'Wake up' }).click()

    await expect(page.getByRole('heading', { name: 'Good morning' })).toBeFocused()
    await expect(page.getByText('Over there, you said “I wish I had danced more.” You woke up with this:')).toBeVisible()
    await expect(page.getByText('Dance with Sam after dinner.', { exact: true })).toBeVisible()
    // The sunrise takes about four seconds
    await expect(daySky(page)).toHaveCSS('opacity', '1', { timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Wake up' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Copy it for tomorrow' })).toBeVisible()
  })

  test('the plan for tomorrow is left as a handwritten note on the kitchen table, and the morning can be kept', async ({ page }) => {
    await offline(page, { reflection: 'Dancing sounds like joy you can still reach.', intention: INTENTION, safe: true })
    await page.goto('/games/first-breath')
    await speak(page, 'I wish I had danced more.')
    await intentionBox(page).fill('Dance with Sam after dinner.')
    await page.getByRole('button', { name: 'Wake up' }).click()

    const table = page.getByTestId('kitchen-table')
    await expect(table.getByText('For tomorrow')).toBeVisible()
    await expect(table.getByText('Dance with Sam after dinner.', { exact: true })).toBeVisible()
    // The sunrise plays out rather than cutting straight to day
    expect(await page.getByTestId('sunrise-glow').evaluate((el) => el.getAnimations().length)).toBe(1)
    await expect(daySky(page)).toHaveCSS('opacity', '1', { timeout: 10_000 })

    await expectKeepsakeSaves(page, {
      fileName: /^the-awakening-\d{4}-\d{2}-\d{2}\.png$/,
      describedAs: /sun rising.*handwritten note on a kitchen table.*“Dance with Sam after dinner\.”/,
    })
  })

  test('waking with no plan leaves no note and no card to keep', async ({ page }) => {
    await offline(page, { reflection: 'Carry it home.', intention: INTENTION, safe: true })
    await page.goto('/games/first-breath')
    await speak(page, 'Where is everyone?')
    await intentionBox(page).fill('')
    await page.getByRole('button', { name: 'Wake up' }).click()
    await expect(page.getByRole('heading', { name: 'Good morning' })).toBeFocused()
    await expect(page.getByTestId('kitchen-table')).toHaveCount(0)
    await expect(page.getByTestId('keepsake-canvas')).toHaveCount(0)
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('waking goes straight to the still morning: day sky, the note set down, the card ready', async ({ page }) => {
      await offline(page, { reflection: 'Carry it home.', intention: INTENTION, safe: true })
      await page.goto('/games/first-breath')
      await speak(page, 'It is so quiet here.')
      await page.getByRole('button', { name: 'Wake up' }).click()
      await expect(page.getByRole('heading', { name: 'Good morning' })).toBeFocused()

      expect(await page.getByTestId('sunrise-glow').evaluate((el) => [getComputedStyle(el).opacity, el.getAnimations().length])).toEqual(['0', 0])
      await expect(daySky(page)).toHaveCSS('opacity', '1', { timeout: 1000 })
      const note = page.getByTestId('kitchen-table').getByText(INTENTION, { exact: true })
      expect(await note.evaluate((el) => el.parentElement!.getAnimations().length)).toBe(0)
      await expectKeepsakeSaves(page, { fileName: /^the-awakening-/ })
    })
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the morning, with its note and card, has no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await offline(page, { reflection: 'Carry it home.', intention: INTENTION, safe: true })
      await page.goto('/games/first-breath')
      await speak(page, 'I wish I had danced more.')
      await page.getByRole('button', { name: 'Wake up' }).click()
      await expect(page.getByTestId('keepsake-canvas')).toBeVisible()
      expect(await axeViolations(page)).toEqual([])
    })
  }

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('a long plan for tomorrow is shown whole, growing past two rows, and Enter still wakes', async ({ page }) => {
      await offline(page, { reflection: 'Carry it home.', intention: INTENTION, safe: true })
      await page.goto('/games/first-breath')
      await speak(page, 'I wish I had called more often.')

      const box = intentionBox(page)
      await expect(box).toHaveAttribute('rows', '2')
      const long = 'Call Grandad after breakfast and ask him about the summer he spent fixing boats by the harbour'
      await box.fill(long)
      const fits = await box.evaluate((el) => el.scrollHeight <= el.clientHeight && el.clientHeight > 60)
      expect(fits).toBe(true)

      await box.press('Enter')
      await expect(page.getByRole('heading', { name: 'Good morning' })).toBeFocused()
      await expect(page.getByText(long, { exact: true })).toBeVisible()
    })
  })

  test('a suggestion never overwrites what the player has already started writing', async ({ page }) => {
    await page.route('**/api/first-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
    let answer: () => void = () => {}
    const replied = new Promise<void>((resolve) => (answer = resolve))
    await page.route('**/api/first-words/reflect', async (route) => {
      await replied
      await route.fulfill({ json: { reflection: 'Carry it home.', intention: INTENTION, safe: true } })
    })
    await page.goto('/games/first-breath')

    await speak(page, 'Where did everyone go?')
    await intentionBox(page).fill('Ring Grandad')
    answer()
    await expect(page.getByText('Carry it home.')).toBeVisible()
    await expect(intentionBox(page)).toHaveValue('Ring Grandad')
  })

  test('waking with nothing chosen still links back to what was said', async ({ page }) => {
    await offline(page, { reflection: 'Carry it home.', intention: INTENTION, safe: true })
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
    await expect(page.getByRole('button', { name: 'Start over' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Imagine it again' })).toHaveCount(0)
    const gentle = page.getByRole('region', { name: 'Something gentle, if it helps' })
    await expect(gentle.locator('a[href="/games/the-still-point"]')).toBeVisible()
    await expect(gentle.locator('a[href="/games/quiet-grove"]')).toBeVisible()
    // One helpline block and one list of calm games, not each said twice
    await expect(page.locator('main a[href="tel:988"]')).toHaveCount(1)
    await expect(page.locator('main a[href="/games/the-still-point"]')).toHaveCount(1)
    await expect(page.locator('main a[href="/games/quiet-grove"]')).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Somewhere calm to go next' })).toHaveCount(0)
  })

  test('regression: once care has begun, the next arrival never gets the ordinary flow', async ({ page }) => {
    await offline(page, { reflection: 'Thank you for trusting this page.', care: true })
    await page.goto('/games/first-breath')
    await speak(page, 'I hope it is over for good this time')
    await expect(page.getByRole('complementary', { name: 'Support' })).toBeVisible()

    // Coming back to the game later in the visit
    await page.unroute('**/api/first-words/reflect')
    await page.route('**/api/first-words/reflect', (route) =>
      route.fulfill({ json: { reflection: 'Carry it home.', intention: INTENTION, safe: true } })
    )
    await page.reload()
    await expect(page.getByRole('complementary', { name: 'Support' })).toBeVisible()
    await expect(page.getByText(/This one imagines the moment after a life ends/)).toBeVisible()
    await page.getByRole('button', { name: "I'd still like to" }).click()
    await speak(page, 'Hello? Is anyone here?')
    await expect(intentionBox(page)).toHaveCount(0)
    await expect(page.getByText('Carry it home.')).toHaveCount(0)
    await page.getByRole('button', { name: 'Wake up' }).click()
    await expect(page.getByText('You came back. It is good to have you here, today.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start over' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Something gentle, if it helps' })).toBeVisible()
  })

  test('regression: in care mode the premise and the form wait behind a choice, and a gentle note comes first', async ({ page }) => {
    await offline(page, { reflection: 'Carry it home.', intention: INTENTION, safe: true })
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('verygoodmelon:care', JSON.stringify({ until: Date.now() + 60 * 60 * 1000 })))
    await page.goto('/games/first-breath')

    await expect(page.getByText(/This one imagines the moment after a life ends/)).toBeVisible()
    await expect(page.getByText(OPENING_LINE)).toHaveCount(0)
    await expect(page.getByRole('textbox', { name: 'Your first words on arriving' })).toHaveCount(0)
    // Helplines once, in the game's own support; the gentle row below only offers the calm games
    await expect(page.getByRole('complementary', { name: 'Support' }).getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988')
    await expect(page.locator('main a[href="tel:988"]')).toHaveCount(1)
    await expect(page.getByRole('region', { name: 'Something gentle, if it helps' }).locator('a[href="/games/quiet-grove"]')).toBeVisible()

    await page.getByRole('button', { name: "I'd still like to" }).click()
    await expect(page.getByText(OPENING_LINE)).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Your first words on arriving' })).toBeFocused()
    await expect(page.getByRole('button', { name: "I'd still like to" })).toHaveCount(0)
  })

  test('the plan for tomorrow says plainly that it goes nowhere', async ({ page }) => {
    await offline(page, { reflection: 'Carry it home.', intention: INTENTION, safe: true })
    await page.goto('/games/first-breath')
    await speak(page, 'It is so quiet here.')
    await expect(page.getByText(/never sent or saved anywhere/)).toBeVisible()
    await expect(page.getByText(/It stays on this page/)).toHaveCount(0)
  })

  test('regression: a plan for tomorrow that sounds like danger brings care instead of being shown back', async ({ page }) => {
    await offline(page, { reflection: 'Carry it home.', intention: INTENTION, safe: true })
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

    test('regression: after speaking, the dawn sky is on screen below the header', async ({ page }) => {
      await offline(page, { reflection: 'Carry it home.', intention: INTENTION, safe: true })
      await page.goto('/games/first-breath')
      await expect(async () => {
        await page.getByRole('textbox', { name: 'Your first words on arriving' }).fill('Oh. Mum? I was so scared of this part and it was just quiet.')
        await expect(page.getByRole('button', { name: 'Speak', exact: true })).toBeEnabled({ timeout: 500 })
      }).toPass()
      // As the open keyboard leaves it: scrolled well down past the sky
      await page.evaluate(() => window.scrollBy(0, 600))
      await page.getByRole('button', { name: 'Speak', exact: true }).click()

      await expect(page.getByRole('heading', { name: 'Before you wake' })).toBeFocused()
      await expect(async () => {
        const sky = await page.locator('[data-sky="dawn"]').boundingBox()
        const header = await page.locator('header').first().boundingBox()
        expect(sky!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1)
        expect(sky!.y).toBeLessThan(400)
      }).toPass()
      await expect(page.getByRole('heading', { name: 'Before you wake' })).toBeInViewport()
    })

    test('regression: in care, the helplines come first on screen, with no sunrise and nothing red to press', async ({ page }) => {
      await offline(page, { reflection: 'Thank you for trusting this page.', care: true })
      await page.goto('/games/first-breath')
      // Indirect enough that only the reply's own judgement asks for care
      await speak(page, 'It is so quiet here. I think I would like to stay.')

      const support = page.getByRole('complementary', { name: 'Support' })
      await expect(support).toBeVisible()
      await expect(async () => {
        const helpline = await support.getByRole('link', { name: '988' }).boundingBox()
        const header = await page.locator('header').first().boundingBox()
        expect(helpline!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1)
        expect(helpline!.y + helpline!.height).toBeLessThanOrEqual(844)
      }).toPass()
      await expect(page.getByText('Morning is close.')).toHaveCount(0)
      await expect(page.locator('[data-sky]')).toHaveCount(0)

      const wake = page.getByRole('button', { name: 'Wake up' })
      await expect(wake).toBeVisible()
      const accent = await page.evaluate(() => {
        const probe = document.createElement('div')
        probe.className = 'bg-accent'
        document.body.append(probe)
        const color = getComputedStyle(probe).backgroundColor
        probe.remove()
        return color
      })
      const redButtons = await page.locator('main button').evaluateAll(
        (buttons, red) => buttons.filter((b) => getComputedStyle(b).backgroundColor === red).length,
        accent
      )
      expect(redButtons).toBe(0)

      await wake.click()
      await expect(page.getByRole('heading', { name: 'Good morning' })).toBeFocused()
      await expect(page.locator('[data-sky]')).toHaveCount(0)
      await expect(page.getByTestId('sunrise-glow')).toHaveCount(0)
      await expect(support.getByRole('link', { name: '988' })).toBeInViewport()
    })

    test('regression: when the reply never comes, support leads on screen, with no sky and no promise of morning', async ({ page }) => {
      // The reply is held until the game's own twenty-second wait gives up on it
      test.slow()
      await page.route('**/api/first-words', (route) => route.fulfill({ status: 503, json: { stored: false } }))
      await page.route('**/api/first-words/reflect', () => {})
      await page.goto('/games/first-breath')
      // Indirect enough that only a reply could judge it
      await speak(page, "I was hoping I wouldn't open my eyes again. I'm so tired of trying.")

      const quietSupport = page.getByText(/If any of this is close to home/)
      await expect(quietSupport).toBeVisible({ timeout: 30_000 })
      await expect(async () => {
        const helpline = await quietSupport.getByRole('link', { name: '988' }).boundingBox()
        const header = await page.locator('header').first().boundingBox()
        const scene = await page.getByRole('heading', { name: 'Before you wake' }).boundingBox()
        expect(helpline!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1)
        expect(helpline!.y + helpline!.height).toBeLessThanOrEqual(844)
        expect(helpline!.y).toBeLessThan(scene!.y)
      }).toPass()
      await expect(page.locator('[data-sky]')).toHaveCount(0)
      await expect(page.getByTestId('sunrise-glow')).toHaveCount(0)
      await expect(page.getByText('Morning is close.')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Wake up' })).toHaveCount(0)
      await expect(page.getByRole('navigation', { name: 'Somewhere calm to go next' }).locator('a[href="/games/the-still-point"]')).toBeVisible()
    })

    test('regression: the sky turning to morning happens on screen, beside the greeting', async ({ page }) => {
      await offline(page, { reflection: 'Dancing sounds like joy you can still reach.', intention: INTENTION, safe: true })
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
