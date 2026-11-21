import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * The Arena (/games/the-arena): pick two people and a topic, watch six rounds, then read a
 * closing that names what each side got right instead of crowning a winner.
 * Both endpoints are mocked so the suite never reaches the paid model.
 */

interface TurnBody {
  person1: string
  person2: string
  topic: string
  round: number
  history: Array<{ speaker: string; argument: string }>
}

interface JudgeBody {
  person1: string
  person2: string
  history: Array<{ speaker: string; argument: string }>
}

type TurnHandler = (route: Route, body: TurnBody) => Promise<void> | void

function argumentFor(body: TurnBody): string {
  const speaker = body.round % 2 === 1 ? body.person1 : body.person2
  return `${speaker} makes point ${body.round} on ${body.topic}.`
}

const CLOSING = {
  firstInsight: 'The first voice showed that doubt still needs a doubter.',
  secondInsight: 'The second voice showed that reasons can be instincts in disguise.',
  revealed: 'Both treated freedom as something practised rather than owned.',
  question: 'Which of your habits did you actually choose?',
}

async function mockDebate(page: Page, opts: { turn?: TurnHandler; judgeStatus?: number } = {}) {
  const turns: TurnBody[] = []
  const judged: JudgeBody[] = []
  await page.route('**/api/mind-debate', async (route) => {
    const body = route.request().postDataJSON() as TurnBody
    turns.push(body)
    if (opts.turn) return opts.turn(route, body)
    return route.fulfill({ json: { speaker: 'ignored', argument: argumentFor(body), round: body.round } })
  })
  await page.route('**/api/mind-debate/judge', async (route) => {
    const body = route.request().postDataJSON() as JudgeBody
    judged.push(body)
    if (opts.judgeStatus) return route.fulfill({ status: opts.judgeStatus, json: { error: 'No verdict this time' } })
    return route.fulfill({ json: CLOSING })
  })
  return { turns, judged }
}

async function openArena(page: Page) {
  await page.route(/\/api\/(game-events|site-visits)/, (route) => route.fulfill({ status: 503, json: {} }))
  await page.goto('/games/the-arena')
  await expect(page.getByLabel('First debater')).toBeVisible()
}

async function setUp(page: Page, first: string, second: string, topic: string) {
  await page.getByLabel('First debater').fill(first)
  await page.getByLabel('Second debater').fill(second)
  await page.getByLabel('Topic').fill(topic)
}

const transcript = (page: Page) => page.getByRole('log', { name: 'Debate transcript' })
const closing = (page: Page) => page.getByRole('region', { name: 'Closing thoughts' })
const debate = (page: Page) => page.getByRole('region', { name: /^Debate:/ })

test.describe('The Arena', () => {
  test.use({ reducedMotion: 'reduce' })

  test('a full debate runs six alternating rounds to a closing with no winner, and a second debate starts clean', async ({ page }) => {
    const { turns, judged } = await mockDebate(page)
    await openArena(page)

    const start = page.getByRole('button', { name: 'Start Debate' })
    await expect(start).toBeDisabled()
    await setUp(page, '   ', 'Nietzsche', 'Free will')
    await expect(start).toBeDisabled()

    await setUp(page, 'Socrates', 'Nietzsche', 'Is free will an illusion?')
    await page.getByLabel('Topic').press('Enter')

    await expect(closing(page).getByText(CLOSING.question)).toBeVisible()
    await expect(closing(page).getByText('What each got right')).toBeVisible()
    await expect(closing(page).getByText(CLOSING.firstInsight)).toBeVisible()
    await expect(closing(page).getByText(CLOSING.secondInsight)).toBeVisible()
    await expect(closing(page).getByText(CLOSING.revealed)).toBeVisible()
    await expect(debate(page).getByText(/\bwins\b|winner|trophy/i)).toHaveCount(0)
    await expect(debate(page).getByText('Imagined voices, not real quotes.')).toBeVisible()
    for (let round = 1; round <= 6; round++) {
      const speaker = round % 2 === 1 ? 'Socrates' : 'Nietzsche'
      await expect(transcript(page).getByText(`${speaker} makes point ${round} on Is free will an illusion?.`)).toBeVisible()
    }
    expect(turns.map((t) => t.round)).toEqual([1, 2, 3, 4, 5, 6])
    expect(turns[5].history).toHaveLength(5)
    expect(judged).toHaveLength(1)
    expect(judged[0].history).toHaveLength(6)

    await page.getByRole('button', { name: 'New Debate' }).click()
    await expect(page.getByLabel('First debater')).toHaveValue('Socrates')
    await page.getByLabel('Topic').fill('Is music necessary?')
    await page.getByRole('button', { name: 'Start Debate' }).click()
    await expect(closing(page)).toBeVisible()
    await expect(transcript(page).getByText(/Is free will an illusion/)).toHaveCount(0)
    await expect(transcript(page).getByText(/makes point/)).toHaveCount(6)
  })

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('arguments type out with motion on and the debate still reaches its closing', async ({ page }) => {
      await mockDebate(page)
      await openArena(page)
      await setUp(page, 'Ada Lovelace', 'Alan Turing', 'Can machines dream?')
      await page.getByRole('button', { name: 'Start Debate' }).click()
      await expect(page.getByText('Round 1/6')).toBeVisible()
      await expect(transcript(page).getByText(/makes point 1/)).toBeVisible()
      await expect(closing(page).getByText(CLOSING.question)).toBeVisible({ timeout: 20_000 })
    })
  })

  test('stopping mid-debate halts requests and Continue picks up at the next round', async ({ page }) => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    const { turns } = await mockDebate(page, {
      turn: async (route, body) => {
        if (body.round === 3) await gate
        await route.fulfill({ json: { argument: argumentFor(body), round: body.round } }).catch(() => {})
      },
    })
    await openArena(page)
    await setUp(page, 'Plato', 'Aristotle', 'Are ideas real?')
    await page.getByRole('button', { name: 'Start Debate' }).click()

    await expect(page.getByText('Plato is thinking...')).toBeVisible()
    await expect(transcript(page).getByText(/makes point 2/)).toBeVisible()
    await page.getByRole('button', { name: 'Stop' }).click()
    release()

    await expect(transcript(page).getByText('The debate is paused.')).toBeVisible()
    await page.waitForTimeout(300)
    await expect(transcript(page).getByText(/makes point 3/)).toHaveCount(0)
    expect(turns.map((t) => t.round)).toEqual([1, 2, 3])

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(closing(page)).toBeVisible()
    expect(turns.map((t) => t.round)).toEqual([1, 2, 3, 3, 4, 5, 6])
    await expect(transcript(page).getByText(/makes point/)).toHaveCount(6)
  })

  test('a reply from an abandoned debate never leaks into the next one', async ({ page }) => {
    // Regression: the old loop read the newest controller, so an abandoned debate kept running
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    await mockDebate(page, {
      turn: async (route, body) => {
        if (body.topic === 'First topic') await gate
        await route.fulfill({ json: { argument: argumentFor(body), round: body.round } }).catch(() => {})
      },
    })
    await openArena(page)
    await setUp(page, 'Kant', 'Hume', 'First topic')
    await page.getByRole('button', { name: 'Start Debate' }).click()
    await expect(page.getByText('Kant is thinking...')).toBeVisible()

    await page.getByRole('button', { name: 'New Debate' }).click()
    await page.getByLabel('Topic').fill('Second topic')
    await page.getByRole('button', { name: 'Start Debate' }).click()
    release()

    await expect(closing(page)).toBeVisible()
    await expect(transcript(page).getByText(/First topic/)).toHaveCount(0)
    await expect(transcript(page).getByText(/makes point/)).toHaveCount(6)
  })

  test('a failing backend pauses calmly, says nothing technical, and Try again resumes', async ({ page }) => {
    let failures = 0
    await mockDebate(page, {
      turn: async (route, body) => {
        if (body.round === 2 && failures === 0) {
          failures++
          return route.fulfill({ status: 500, json: { error: 'API configuration error' } })
        }
        await route.fulfill({ json: { argument: argumentFor(body), round: body.round } }).catch(() => {})
      },
    })
    await openArena(page)
    await setUp(page, 'Simone de Beauvoir', 'Sartre', 'Is freedom a burden?')
    await page.getByRole('button', { name: 'Start Debate' }).click()

    await expect(transcript(page).getByText('Sartre lost their train of thought.')).toBeVisible()
    await expect(debate(page).getByText(/error|API|failed|generat/i)).toHaveCount(0)

    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(closing(page)).toBeVisible()
    await expect(transcript(page).getByText(/makes point/)).toHaveCount(6)
  })

  test('an empty reply counts as a pause instead of an empty speech bubble', async ({ page }) => {
    await mockDebate(page, {
      turn: (route, body) => route.fulfill({ json: { argument: body.round === 1 ? '   ' : argumentFor(body), round: body.round } }),
    })
    await openArena(page)
    await setUp(page, 'Hypatia', 'Euclid', 'Is math discovered?')
    await page.getByRole('button', { name: 'Start Debate' }).click()
    await expect(transcript(page).getByText('Hypatia lost their train of thought.')).toBeVisible()
    await expect(page.getByText('Round 1', { exact: true })).toHaveCount(0)
  })

  test('when no closing comes back the debate still ends with a calm, complete one', async ({ page }) => {
    await mockDebate(page, { judgeStatus: 500 })
    await openArena(page)
    await setUp(page, 'Marie Curie', 'Batman', 'Should we fear the dark?')
    await page.getByRole('button', { name: 'Start Debate' }).click()
    await expect(closing(page).getByText('Marie Curie held to what they believed and said it plainly.')).toBeVisible()
    await expect(closing(page).getByText('Batman kept pressing on the question underneath.')).toBeVisible()
    await expect(closing(page).getByText('If you had joined them, what would you have added?')).toBeVisible()
    await expect(debate(page).getByText(/error|failed|closing this time/i)).toHaveCount(0)
  })

  test('a pairing the debaters will not voice ends quietly, with no refusal, no closing and a way forward', async ({ page }) => {
    const { turns, judged } = await mockDebate(page, {
      turn: (route) => route.fulfill({ json: { declined: true } }),
    })
    await openArena(page)
    await setUp(page, 'A notorious dictator', 'Gandhi', 'Which people deserve less?')
    await page.getByRole('button', { name: 'Start Debate' }).click()

    await expect(transcript(page).getByText(/The Arena will sit out/)).toBeVisible()
    await expect(transcript(page).getByText(/Round 1/)).toHaveCount(0)
    await expect(debate(page).getByText(/cannot|unable|guidelines|request|\bAI\b/)).toHaveCount(0)
    await page.waitForTimeout(300)
    expect(turns).toHaveLength(1)
    expect(judged).toHaveLength(0)

    await debate(page).getByRole('button', { name: 'Surprise me' }).click()
    await expect(page.getByLabel('First debater')).not.toHaveValue('A notorious dictator')
    await expect(page.getByLabel('Topic')).not.toHaveValue('')
    await expect(page.getByRole('button', { name: 'Start Debate' })).toBeEnabled()
  })

  test('a decline partway through keeps what was said and asks for nothing more', async ({ page }) => {
    const { turns, judged } = await mockDebate(page, {
      turn: (route, body) =>
        route.fulfill({ json: body.round === 3 ? { declined: true } : { argument: argumentFor(body), round: body.round } }),
    })
    await openArena(page)
    await setUp(page, 'Kant', 'Hume', 'Is it ever right to lie?')
    await page.getByRole('button', { name: 'Start Debate' }).click()

    await expect(transcript(page).getByText(/The Arena will sit out/)).toBeVisible()
    await expect(transcript(page).getByText(/makes point/)).toHaveCount(2)
    await page.waitForTimeout(300)
    expect(turns.map((t) => t.round)).toEqual([1, 2, 3])
    expect(judged).toHaveLength(0)
  })

  test('Surprise me fills a ready-made pairing that can start straight away', async ({ page }) => {
    const { turns } = await mockDebate(page)
    await openArena(page)
    await page.getByRole('button', { name: 'Surprise me' }).click()

    for (const field of ['First debater', 'Second debater', 'Topic']) {
      await expect(page.getByLabel(field)).not.toHaveValue('')
    }
    const first = await page.getByLabel('First debater').inputValue()
    await page.getByRole('button', { name: 'Start Debate' }).click()
    await expect(closing(page)).toBeVisible()
    expect(turns[0].person1).toBe(first)
  })

  test('a reader scrolled back to an earlier turn is not pulled down by new ones', async ({ page }) => {
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    const long = 'A long and winding thought that takes its time to arrive somewhere. '.repeat(6)
    await mockDebate(page, {
      turn: async (route, body) => {
        if (body.round === 4) await gate
        await route.fulfill({ json: { argument: `${long}(${body.round})`, round: body.round } }).catch(() => {})
      },
    })
    await openArena(page)
    await setUp(page, 'Plato', 'Aristotle', 'Are ideas real?')
    await page.getByRole('button', { name: 'Start Debate' }).click()
    await expect(transcript(page).getByText(/\(3\)$/)).toBeVisible()

    await expect(transcript(page)).toHaveAttribute('tabindex', '0')
    await transcript(page).evaluate((el) => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')) })
    release()
    await expect(transcript(page).getByText(/\(5\)$/)).toBeAttached()
    expect(await transcript(page).evaluate((el) => el.scrollTop)).toBeLessThan(40)
  })

  test('two debaters with the same name still alternate sides', async ({ page }) => {
    // Regression: sides were chosen by name, so a mirror match put every bubble on the left
    await mockDebate(page)
    await openArena(page)
    await setUp(page, 'Socrates', 'Socrates', 'Know thyself?')
    await page.getByRole('button', { name: 'Start Debate' }).click()
    await expect(closing(page)).toBeVisible()

    const lefts = await transcript(page).locator('.justify-start').count()
    const rights = await transcript(page).locator('.justify-end').count()
    expect([lefts, rights]).toEqual([3, 3])
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('long names and a long topic wrap without sideways scrolling', async ({ page }) => {
      await mockDebate(page)
      await openArena(page)
      const long = 'Ada Lovelace-Byron the Extraordinarily Long Named Countess X'
      await setUp(page, long, 'Bartholomew Montgomery-Featherstonehaugh III of Somewhere', 'x'.repeat(140))
      await expect(page.getByLabel('Topic')).toHaveValue('x'.repeat(120))
      await page.getByRole('button', { name: 'Start Debate' }).tap()
      await expect(closing(page)).toBeVisible()

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  })
})
