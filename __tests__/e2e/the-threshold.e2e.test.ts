import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { test, expect, type Locator, type Page } from '@playwright/test'
import { expectOneGo, expectStillCare } from './helpers/design'

/**
 * The Plain Speaker (/games/the-threshold): a player-paced minute before a hard conversation.
 * Everything typed stays in localStorage under one key and is never sent anywhere.
 */

const URL = '/games/the-threshold'
const KEY = 'verygoodmelon:hard-talk'
const DAY = 24 * 60 * 60 * 1000
const AXE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')

const FIRST = 'What kind of talk is coming up?'

function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

/** Every request body the page sends, to prove typed words never leave the browser. */
function collectOutgoing(page: Page): string[] {
  const bodies: string[] = []
  page.on('request', (request) => bodies.push(`${request.url()} ${request.postData() ?? ''}`))
  return bodies
}

async function openGame(page: Page) {
  await page.route('**/api/game-events', (route) => route.fulfill({ json: {} }))
  await page.route('**/api/site-visits', (route) => route.fulfill({ json: {} }))
  await page.goto(URL)
}

const heading = (page: Page, name: string | RegExp) => page.getByRole('heading', { level: 2, name })
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

async function expectStep(page: Page, name: string | RegExp) {
  await expect(heading(page, name)).toBeVisible()
  await expect(heading(page, name)).toBeFocused()
}

/** A step with a text box puts the cursor straight in it, with the step's words describing it. */
async function expectWritingStep(page: Page, name: string | RegExp) {
  await expect(heading(page, name)).toBeVisible()
  const field = page.getByRole('textbox')
  await expect(field).toBeFocused()
  await expect(field).toHaveAttribute('aria-describedby', /hard-talk-sub/)
}

async function next(page: Page, label: 'Next' | 'Skip' = 'Next') {
  await button(page, label).click()
}

/** From a filled-in "who" step, past the body steps, skipping the optional breaths. */
async function throughSettling(page: Page) {
  for (const label of ['Next', 'Next', 'Next', 'Skip'] as const) await next(page, label)
}

/** From the "who" step, past the body steps, skipping the optional breaths. */
async function throughSettlingFrom(page: Page, whoLabel: 'Next' | 'Skip') {
  for (const label of [whoLabel, 'Next', 'Next', 'Skip'] as const) await next(page, label)
}

async function finishedMinutesAgo(page: Page, minutes: number) {
  await page.evaluate(({ key, ms }) => {
    const s = JSON.parse(localStorage.getItem(key) ?? '{}')
    localStorage.setItem(key, JSON.stringify({ ...s, finishedAt: Date.now() - ms, updatedAt: Date.now() - ms }))
  }, { key: KEY, ms: minutes * 60 * 1000 })
}

async function saved(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY)
}

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  )
}

async function axeViolations(page: Page) {
  // Contrast is judged on the settled page, not part-way through a fade-in.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.effect?.getComputedTiming().endTime === Infinity || a.playState !== 'running'),
  )
  await page.addScriptTag({ content: AXE })
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe
    const result = await axe.run(
      { include: [['main']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } },
    )
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  })
}

test.describe('The Plain Speaker', () => {
  test('a full run for asking for something: settles, clarifies and ends with one line, words staying local', async ({ page }) => {
    const errors = collectPageErrors(page)
    const outgoing = collectOutgoing(page)
    await openGame(page)
    await expect(heading(page, FIRST)).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Support' })).toContainText('not a substitute for support')
    await expect(page.getByRole('link', { name: 'findahelpline.com' })).toHaveAttribute('href', 'https://findahelpline.com')

    await expect(page.getByText('Settling in')).toBeVisible()
    await expect(page.getByText(/Step \d+ of/)).toHaveCount(0)
    await page.getByRole('button', { name: /Asking for something/ }).click()
    await expectWritingStep(page, 'Who is it with?')
    await expect(button(page, 'Skip')).toBeVisible()
    await page.getByLabel('Who the talk is with').fill('my manager')
    await expect(button(page, 'Next')).toBeVisible()
    await page.getByLabel('Who the talk is with').press('Enter')

    await expectStep(page, 'Let your shoulders drop.')
    await next(page)
    await expectStep(page, 'Feel your feet on the floor.')
    await next(page)
    await expectStep(page, 'If you like, take three slow breaths.')
    for (const n of [1, 2, 3]) {
      await button(page, 'I’m breathing in').click()
      await button(page, 'I’m breathing out').click()
      if (n < 3) await expect(page.getByText(n === 1 ? 'Good. Another, whenever you’re ready.' : 'One more, if you like.')).toBeVisible()
    }
    await expect(page.getByText('That’s three. Carry on whenever you like.')).toBeVisible()
    await next(page)

    await expectWritingStep(page, 'What do you most want them to understand?')
    await expect(page.getByText('Finding your words')).toBeVisible()
    await page.keyboard.type('SECRET-WORDS I have grown into this role')
    await next(page)
    await expectStep(page, 'Which moment worries you most?')
    await page.getByText('They say no').click()
    await expect(page.getByText('A no today isn’t a no forever.', { exact: false })).toBeVisible()
    await next(page)

    await expectStep(page, 'Choose a first sentence.')
    await page.getByText('Is now a good time?').click()
    await next(page)
    await expectStep(page, 'For your manager, today comes with its own pressures too.')
    await expect(page.getByText('Nearly there')).toBeVisible()
    await next(page)
    await expectStep(page, /you’re allowed to be kind to yourself/)
    await next(page)

    await expectStep(page, 'One line to carry in')
    await expect(page.getByText('In your own words.')).toBeVisible()
    await expect(page.locator('blockquote')).toHaveText('SECRET-WORDS I have grown into this role.')
    await expect(page.getByText('Ask clearly, then let them answer.')).toHaveCount(0)
    await expect(page.getByText('Begin with', { exact: true })).toBeVisible()
    // The opener is said first, so it reads first, as on the full-screen card
    const top = async (target: Locator) => (await target.boundingBox())!.y
    expect(await top(page.getByText('Begin with', { exact: true }))).toBeLessThan(await top(page.locator('blockquote')))
    await expect(page.getByText('“There’s something I’d like to ask for. Is now a good time?”', { exact: true })).toBeVisible()
    await expect(button(page, 'Next')).toHaveCount(0)
    await expect(page.locator('#hard-talk').getByText(/\bready\b|\bsafe\b/i)).toHaveCount(0)

    expect((await saved(page)).finishedAt).toEqual(expect.any(Number))
    expect(outgoing.filter((o) => o.includes('SECRET-WORDS') || o.includes('my manager'))).toEqual([])
    expect(errors).toEqual([])
  })

  test('saying sorry meets the other person before the worry, with its own words', async ({ page }) => {
    await openGame(page)
    await page.getByRole('button', { name: /Saying sorry/ }).click()
    await page.getByLabel('Who the talk is with').fill('Jo')
    await next(page)
    await next(page)
    await next(page)
    await next(page, 'Skip')
    await expectWritingStep(page, 'What are you sorry for, in plain words?')
    await page.getByRole('textbox').fill('I missed your birthday.')
    await next(page)
    await expectStep(page, 'It hurt Jo, and those feelings get to be what they are.')
    await next(page)
    await expectStep(page, 'Which moment worries you most?')
    await page.getByText('I start explaining myself').click()
    await expect(page.getByText('Say sorry first, then pause for a breath.', { exact: false })).toBeVisible()
    await next(page)
    await page.getByText('Before anything else, I want to say sorry.').click()
    await next(page)
    await next(page)
    await expectStep(page, 'One line to carry in')
    await expect(page.locator('blockquote')).toHaveText('I missed your birthday.')
    await expect(page.getByText('“Before anything else, I want to say sorry.”', { exact: true })).toBeVisible()
  })

  test('a doctor’s appointment, played with the keyboard alone', async ({ page }) => {
    await openGame(page)
    await expect(heading(page, FIRST)).toBeVisible()

    const tabTo = async (target: Locator) => {
      for (let i = 0; i < 40; i++) {
        if (await target.evaluate((el) => el === document.activeElement)) break
        await page.keyboard.press('Tab')
      }
      await expect(target).toBeFocused()
      const ring = await target.evaluate((el) => {
        // A radio is visually hidden, so its focus ring is drawn on the label around it.
        const own = getComputedStyle(el)
        const label = getComputedStyle(el.closest('label') ?? el)
        return own.outlineStyle !== 'none' ? own.outlineStyle : label.boxShadow
      })
      expect(ring, 'keyboard focus is visible').not.toBe('none')
    }

    await tabTo(page.getByRole('button', { name: /A doctor or appointment/ }))
    await page.keyboard.press('Enter')
    await expectWritingStep(page, 'Who is it with?')
    await page.keyboard.type('Dr Okafor')
    await page.keyboard.press('Enter')
    for (const step of ['Let your shoulders drop.', 'Feel your feet on the floor.']) {
      await expectStep(page, step)
      await tabTo(button(page, 'Next'))
      await page.keyboard.press('Enter')
    }
    await expectStep(page, 'If you like, take three slow breaths.')
    await tabTo(button(page, 'I’m breathing in'))
    await page.keyboard.press('Space')
    await expect(button(page, 'I’m breathing out')).toBeFocused()
    await page.keyboard.press('Space')
    await expect(page.getByText('Good. Another, whenever you’re ready.')).toBeVisible()
    await tabTo(button(page, 'Next'))
    await page.keyboard.press('Enter')

    await expectWritingStep(page, 'What’s the main thing you want them to know?')
    await page.keyboard.type('the pain is worse at night')
    await tabTo(button(page, 'Next'))
    await page.keyboard.press('Enter')

    await expectStep(page, 'Which moment worries you most?')
    await tabTo(page.getByRole('radio', { name: 'I forget what to ask' }))
    await page.keyboard.press('Space')
    await expect(page.getByText('Reading from a list is completely normal.', { exact: false })).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('radio', { name: 'Feeling rushed' })).toBeChecked()
    await tabTo(button(page, 'Next'))
    await page.keyboard.press('Enter')

    await expectStep(page, 'Choose a first sentence.')
    await tabTo(page.getByRole('radio', { name: /The main thing I’d like help with today/ }))
    await page.keyboard.press('Space')
    await tabTo(button(page, 'Next'))
    await page.keyboard.press('Enter')
    await expectStep(page, 'With Dr Okafor, your questions are welcome. They’re part of why you’re there.')
    await tabTo(button(page, 'Back'))
    await page.keyboard.press('Enter')
    await expectStep(page, 'Choose a first sentence.')
    await expect(page.getByRole('radio', { name: /The main thing I’d like help with today/ })).toBeChecked()
    await tabTo(button(page, 'Next'))
    await page.keyboard.press('Enter')
    await tabTo(button(page, 'Next'))
    await page.keyboard.press('Enter')
    await tabTo(button(page, 'Next'))
    await page.keyboard.press('Enter')
    await expectStep(page, 'One line to carry in')
    await expect(page.locator('blockquote')).toHaveText('The pain is worse at night.')

    await tabTo(button(page, 'Keep this on screen'))
    await page.keyboard.press('Enter')
    const onScreen = page.getByRole('dialog', { name: 'Your line to carry in' })
    await expect(onScreen).toBeVisible()
    await expect(onScreen).toContainText('The pain is worse at night.')
    await expect(onScreen).toContainText('The main thing I’d like help with today is…')
    await expect(onScreen.getByRole('button', { name: 'Done' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(onScreen).toHaveCount(0)
    await expect(button(page, 'Keep this on screen')).toBeFocused()
  })

  test('skipping every question still ends with a line, and nothing is invented', async ({ page }) => {
    await openGame(page)
    await next(page, 'Skip')
    await expectWritingStep(page, 'Who is it with?')
    await next(page, 'Skip')
    await next(page)
    await next(page)
    await next(page, 'Skip')
    await expectWritingStep(page, 'What do you most want them to understand?')
    await next(page, 'Skip')
    await next(page, 'Skip')
    await page.getByText('In my own words').click()
    await expect(button(page, 'Skip')).toBeVisible()
    await next(page, 'Skip')
    await expectStep(page, 'They’re a whole person too, maybe a little nervous as well.')
    await next(page)
    await next(page)
    await expectStep(page, 'One line to carry in')
    await expect(page.getByText('Lead with what you want, then listen.', { exact: true })).toBeVisible()
    await expect(page.getByText('In your own words.')).toHaveCount(0)
    await expect(page.getByText('Begin with', { exact: true })).toHaveCount(0)
  })

  test('back keeps what was written, and changing the kind of talk clears only its own choices', async ({ page }) => {
    await openGame(page)
    await page.getByRole('button', { name: /Asking for something/ }).click()
    await page.getByLabel('Who the talk is with').fill('Sam')
    await throughSettling(page)
    await page.getByRole('textbox').fill('I would like a raise')
    await next(page)
    await page.getByText('They say no').click()

    await button(page, 'Back').click()
    await expectWritingStep(page, 'What do you most want them to understand?')
    await expect(page.getByRole('textbox')).toHaveValue('I would like a raise')
    for (let i = 0; i < 5; i++) await button(page, 'Back').click()
    await expectStep(page, FIRST)
    await expect(page.getByRole('button', { name: /Asking for something/ })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: /Raising a problem/ }).click()
    await expect(page.getByLabel('Who the talk is with')).toHaveValue('Sam')
    await throughSettling(page)
    await expect(page.getByRole('textbox')).toHaveValue('I would like a raise')
    await next(page)
    await expectStep(page, 'Sam may not see it the way you do yet.')
    await next(page)
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'They get defensive' })).toBeVisible()
  })

  test('an interrupted run resumes at the same step, and days later it asks first', async ({ page }) => {
    await openGame(page)
    await page.getByRole('button', { name: /Telling someone something hard/ }).click()
    await page.getByLabel('Who the talk is with').fill('Mum')
    await throughSettling(page)
    await page.getByRole('textbox').fill('I am moving abroad')
    await next(page)
    await expectStep(page, 'Which moment worries you most?')

    await page.reload()
    await expect(heading(page, 'Which moment worries you most?')).toBeVisible()
    await expect(page.getByText('Welcome back. You were here.')).toBeVisible()
    await button(page, 'Back').click()
    await expect(page.getByRole('textbox')).toHaveValue('I am moving abroad')
    await expect(page.getByText('Welcome back. You were here.')).toHaveCount(0)

    await page.evaluate(({ key, day }) => {
      const s = JSON.parse(localStorage.getItem(key) ?? '{}')
      localStorage.setItem(key, JSON.stringify({ ...s, updatedAt: Date.now() - 3 * day }))
    }, { key: KEY, day: DAY })
    await page.reload()
    await expect(heading(page, 'Welcome back.')).toBeVisible()
    await expect(page.getByText('telling someone something hard', { exact: false })).toBeVisible()
    await button(page, 'Carry on where I was').click()
    await expectWritingStep(page, 'What’s the one thing you need them to hear?')
    await expect(page.getByRole('textbox')).toHaveValue('I am moving abroad')

    await page.evaluate(({ key, day }) => {
      const s = JSON.parse(localStorage.getItem(key) ?? '{}')
      localStorage.setItem(key, JSON.stringify({ ...s, updatedAt: Date.now() - 3 * day }))
    }, { key: KEY, day: DAY })
    await page.reload()
    await button(page, 'Start fresh').click()
    await expectStep(page, FIRST)
    expect(JSON.stringify(await saved(page))).not.toContain('moving abroad')
  })

  test('words older than two weeks are let go on return', async ({ page }) => {
    await page.addInitScript(({ key, day }) => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem(key, JSON.stringify({
        version: 1, run: 0, step: 'worry', kind: 'ending', who: 'Alex', understand: 'OLD-WORDS', worry: null,
        openingPick: null, ownOpening: '', breaths: 0, updatedAt: Date.now() - 15 * day, finishedAt: null, checkIn: null,
      }))
    }, { key: KEY, day: DAY })
    await openGame(page)
    await expect(heading(page, FIRST)).toBeVisible()
    await expect.poll(async () => JSON.stringify(await saved(page))).not.toContain('OLD-WORDS')
  })

  test('in care mode the game keeps its own support and the shared care block does not add a second one', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('verygoodmelon:care', JSON.stringify({ until: Date.now() + 60 * 60 * 1000 })))
    await openGame(page)
    await expect(heading(page, FIRST)).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Support' })).toHaveCount(1)
    await expectStillCare(page)
    await expectOneGo(page)
    await expect(page.getByRole('region', { name: 'Something gentle, if it helps' })).toBeVisible()
  })

  test('start over asks first, and clears everything when confirmed', async ({ page }) => {
    await openGame(page)
    await page.getByRole('button', { name: /Ending or changing something/ }).click()
    await page.getByLabel('Who the talk is with').fill('Alex')
    await next(page)

    await button(page, 'Start over').click()
    await expect(page.getByRole('alertdialog')).toContainText('Anything you’ve written will be cleared.')
    await expect(button(page, 'Keep going')).toBeFocused()
    await button(page, 'Keep going').click()
    await expectStep(page, 'Let your shoulders drop.')

    await button(page, 'Start over').click()
    await button(page, 'Yes, start over').click()
    await expectStep(page, FIRST)
    await expect(page.getByRole('button', { name: /Ending or changing something/ })).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: /Asking for something/ }).click()
    await expect(page.getByLabel('Who the talk is with')).toHaveValue('')
    await expect(page.getByText(/Let your shoulders fall away|Let your shoulders drop/)).toHaveCount(0)
    for (let i = 0; i < 1; i++) await next(page, 'Skip')
    await expectStep(page, 'Let your shoulders fall away from your ears.')
  })

  test('reloading straight after finishing shows the line again; the check-in waits half an hour', async ({ page }) => {
    await openGame(page)
    await page.getByRole('button', { name: /A doctor or appointment/ }).click()
    for (const label of ['Skip', 'Next', 'Next', 'Skip', 'Skip', 'Skip', 'Skip', 'Next', 'Next'] as const) await next(page, label)
    await expectStep(page, 'One line to carry in')

    await page.reload()
    await expect(heading(page, 'One line to carry in')).toBeVisible()
    await expect(page.getByText('Your questions belong in the room.', { exact: true })).toBeVisible()
    await expect(page.getByText(/Welcome back/)).toHaveCount(0)

    await finishedMinutesAgo(page, 31)
    await page.reload()
    await expect(heading(page, 'Welcome back. How did it go?')).toBeVisible()
    await expect(page.getByText('Your questions belong in the room.')).toBeVisible()
    await page.getByText('It hasn’t happened yet').click()
    await expect(page.getByText('Your line is still here whenever you need it.', { exact: false })).toBeVisible()
    await button(page, 'See my notes again').click()
    await expectStep(page, 'One line to carry in')

    await finishedMinutesAgo(page, 31)
    await page.reload()
    await expect(page.getByRole('radio', { name: 'It hasn’t happened yet' })).toBeChecked()
    await page.getByText('It was hard').click()
    await expect(page.getByText('go gently today', { exact: false })).toBeVisible()
    await button(page, 'Start a new talk').click()
    await expectStep(page, FIRST)
  })

  test('the line can be copied, with its first sentence, from the pocket card', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openGame(page)
    await page.getByRole('button', { name: /Raising a problem/ }).click()
    await throughSettlingFrom(page, 'Skip')
    await page.keyboard.type('when plans change last minute I feel like an afterthought')
    await next(page)
    await next(page)
    await next(page, 'Skip')
    await page.getByText('In my own words').click()
    await page.getByRole('textbox').fill('Can we talk about weekends?')
    await next(page)
    await next(page)
    await expectStep(page, 'One line to carry in')
    await expect(page.locator('blockquote')).toHaveText('When plans change last minute I feel like an afterthought.')
    await button(page, 'Copy as text').click()
    await expect(page.getByRole('status').filter({ hasText: 'Copied.' })).toBeVisible()
    // Some systems store line breaks on the clipboard as \r\n.
    expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(
      'Begin with: “Can we talk about weekends?”\n\nWhen plans change last minute I feel like an afterthought.\n\nThe Plain Speaker · verygoodmelon.fun',
    )
  })

  test('ends with a pocket card to save, then a door left ajar to step through when they choose', async ({ page }) => {
    const errors = collectPageErrors(page)
    await openGame(page)
    await page.getByRole('button', { name: /Asking for something/ }).click()
    await page.getByLabel('Who the talk is with').fill('Ana')
    await throughSettling(page)
    await page.getByRole('textbox').fill('I have grown into this role')
    await next(page)
    await next(page, 'Skip')
    await page.getByText('Is now a good time?').click()
    await next(page)
    await next(page)
    await next(page)
    await expectStep(page, 'One line to carry in')

    // The card on the page is the only card; saving draws that same card as a picture
    await expect(page.locator('#hard-talk figure')).toHaveCount(1)
    await expect(page.getByTestId('keepsake-canvas')).toHaveCount(0)
    const [download] = await Promise.all([page.waitForEvent('download'), button(page, 'Save the card as a picture').click()])
    expect(download.suggestedFilename()).toMatch(/^the-plain-speaker-\d{4}-\d{2}-\d{2}\.png$/)
    const file = await readFile(await download.path())
    expect([...file.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    await expect(page.getByRole('status').filter({ hasText: 'Saved to your device.' })).toBeVisible()

    await button(page, 'I’m going in').click()
    await expectStep(page, 'Go in when you’re ready.')
    await expect(page.locator('#hard-talk .plain-speaker-crack')).toHaveCount(1)
    // The door opens only a crack, and settles there
    await expect.poll(() => page.locator('#hard-talk .plain-speaker-crack').evaluate((g) => g.getAnimations().every((a) => a.playState === 'finished'))).toBe(true)
    await expect(page.getByText('Here’s your line')).toHaveCount(0)

    await button(page, 'Keep this on screen').click()
    const onScreen = page.getByRole('dialog', { name: 'Your line to carry in' })
    await expect(onScreen).toContainText('I have grown into this role.')
    await page.keyboard.press('Escape')
    await expect(button(page, 'Keep this on screen')).toBeFocused()

    await button(page, 'Back to my line').click()
    await expectStep(page, 'One line to carry in')
    expect(errors).toEqual([])
  })

  test('works for this visit when the browser refuses storage', async ({ page }) => {
    const errors = collectPageErrors(page)
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError') } })
    })
    await openGame(page)
    await expect(page.getByText('This browser isn’t keeping anything', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: /Something else/ }).click()
    await expectWritingStep(page, 'Who is it with?')
    await next(page, 'Skip')
    await expectStep(page, 'Let your shoulders drop.')
    expect(errors).toEqual([])
  })

  test.describe('on a phone with reduced motion', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

    test('the last screen is one pocket card with its door, one main action, and everything else quiet', async ({ page }) => {
      await openGame(page)
      await page.getByRole('button', { name: /Asking for something/ }).click()
      await page.getByLabel('Who the talk is with').fill('Ana')
      await throughSettling(page)
      await page.getByRole('textbox').fill('I have grown into this role')
      await next(page)
      await next(page, 'Skip')
      await page.getByText('Is now a good time?').click()
      await next(page)
      await next(page)
      await next(page)
      await expectStep(page, 'One line to carry in')

      const card = page.locator('#hard-talk figure')
      await expect(card).toHaveCount(1)
      // The door lives on the card now, not above it as a second picture
      await expect(page.locator('#hard-talk svg[viewBox="0 0 160 100"]')).toHaveCount(1)
      await expect(card.locator('svg[viewBox="0 0 160 100"]')).toHaveCount(1)
      await expect(page.locator('#hard-talk').getByText('I have grown into this role.', { exact: true })).toHaveCount(1)
      await expect(page.getByTestId('keepsake-canvas')).toHaveCount(0)
      await expect(page.locator('#hard-talk button.bg-accent')).toHaveCount(1)
      await expect(page.locator('#hard-talk button.bg-accent')).toHaveText('Keep this on screen')
      await expect(page.locator('#hard-talk button.text-lg')).toHaveCount(1)
      // The card's words are real text at a readable size
      for (const text of [card.locator('blockquote'), card.getByText('“There’s something I’d like to ask for. Is now a good time?”')]) {
        expect(parseFloat(await text.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
      }
      await page.evaluate(() => window.scrollTo(0, 0))
      await card.scrollIntoViewIfNeeded()
      const box = (await card.boundingBox())!
      expect(box.height).toBeLessThanOrEqual(844)
      await noHorizontalScroll(page)
    })

    test('every step fits without sideways scrolling, long words wrap, and nothing moves', async ({ page }) => {
      await openGame(page)
      await expect(heading(page, FIRST)).toBeVisible()
      await noHorizontalScroll(page)
      await expect(page.locator('#hard-talk [style*="transition"]')).toHaveCount(0)
      await expect(page.locator('#hard-talk .animate-fade')).toHaveCount(0)

      await page.getByRole('button', { name: /Telling someone something hard/ }).click()
      await page.getByLabel('Who the talk is with').fill('W'.repeat(60))
      await expect(page.getByLabel('Who the talk is with')).toHaveValue('W'.repeat(40))
      await next(page)
      await next(page)
      await next(page)
      await button(page, 'I’m breathing in').click()
      await expect(page.locator('#hard-talk svg[class*="transition"]')).toHaveCount(0)
      await button(page, 'I’m breathing out').click()
      await noHorizontalScroll(page)
      await next(page)

      const box = page.getByRole('textbox')
      await box.fill('x'.repeat(400))
      await expect(box).toHaveValue('x'.repeat(280))
      await expect(page.getByText('That’s the most this box holds.')).toBeVisible()
      await expect(box).toBeInViewport()
      await noHorizontalScroll(page)
      await next(page)
      await expectStep(page, 'Which moment worries you most?')
      await page.getByText('Finding the words').tap()
      await expect(page.getByText('Plain words are kind words.', { exact: false })).toBeInViewport()
      await expect(page.locator('[aria-live="polite"]').filter({ hasText: 'Plain words are kind words.' })).toHaveCount(1)
      await noHorizontalScroll(page)
      for (const label of ['Next', 'Skip'] as const) {
        await next(page, label)
        await noHorizontalScroll(page)
      }
      await expectStep(page, new RegExp(`^${'W'.repeat(40)} might need a moment`))
      await noHorizontalScroll(page)
      await next(page)
      await next(page)
      await expectStep(page, 'One line to carry in')
      await noHorizontalScroll(page)
      await expect(page.locator('#hard-talk [style*="transition"]')).toHaveCount(0)
      await button(page, 'Keep this on screen').tap()
      const onScreen = page.getByRole('dialog', { name: 'Your line to carry in' })
      await expect(onScreen.getByText('x'.repeat(280) + '.')).toBeVisible()
      await noHorizontalScroll(page)
      await onScreen.getByRole('button', { name: 'Done' }).tap()
      await expect(onScreen).toHaveCount(0)

      await button(page, 'I’m going in').tap()
      await expectStep(page, 'Go in when you’re ready.')
      // Still: the door is simply already ajar
      await expect(page.locator('#hard-talk .plain-speaker-crack')).toHaveCount(0)
      await expect(page.locator('#hard-talk svg style')).toHaveCount(0)
      expect(await page.locator('#hard-talk svg g[style*="scaleX"]').evaluate((g) => getComputedStyle(g).transform)).not.toBe('none')
      await expect(page.locator('#hard-talk [style*="transition"]')).toHaveCount(0)
      await noHorizontalScroll(page)
    })
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`has no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await openGame(page)
      await expect(heading(page, FIRST)).toBeVisible()
      expect(await axeViolations(page)).toEqual([])
      await expectOneGo(page)

      await page.getByRole('button', { name: /Asking for something/ }).click()
      await page.getByLabel('Who the talk is with').fill('Ana')
      await throughSettling(page)
      await page.getByRole('textbox').fill('Something true')
      await next(page)
      await page.getByText('I lose my nerve').click()
      expect(await axeViolations(page)).toEqual([])
      await next(page)
      await page.getByText('In my own words').click()
      await page.getByRole('textbox').fill('Hello')
      expect(await axeViolations(page)).toEqual([])
      await next(page)
      await next(page)
      await next(page)
      await expectStep(page, 'One line to carry in')
      expect(await axeViolations(page)).toEqual([])
      await button(page, 'Keep this on screen').click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(await axeViolations(page)).toEqual([])
      await page.keyboard.press('Escape')
      await button(page, 'Start over').click()
      expect(await axeViolations(page)).toEqual([])
      await button(page, 'Keep going').click()
      await button(page, 'I’m going in').click()
      await expectStep(page, 'Go in when you’re ready.')
      expect(await axeViolations(page)).toEqual([])
      await finishedMinutesAgo(page, 45)
      await page.reload()
      await expect(heading(page, 'Welcome back. How did it go?')).toBeVisible()
      await page.getByText('Better than I feared').click()
      expect(await axeViolations(page)).toEqual([])
      await expectOneGo(page)
    })
  }
})
