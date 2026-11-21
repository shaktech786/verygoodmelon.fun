import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Locator, type Page, type WebSocketRoute } from '@playwright/test'
import { expectKeepsakeSaves } from './helpers/keepsake'

/**
 * The Dilemma (Hard Choices): choose A or B (or let it pass) on 12 dilemmas,
 * read both perspectives and a thought that holds them, see how others chose
 * when the vote store is reachable, and end with what you chose to protect.
 *
 * "DB down" is what the routes answer while Supabase is unreachable (HTTP 500);
 * "DB up" keeps vote counts in memory and stands in for Supabase Realtime.
 *
 * Run with: npx playwright test __tests__/e2e/the-crossroads.e2e.test.ts
 */

const DILEMMA_COUNT = 12
const FIRST_SCENARIO = 'Which would you choose for your life?'
const FIRST_PERSPECTIVE_A = /What good is purpose/
const FIRST_PERSPECTIVE_B = /Meaning sustains us/
const ENDING = 'What you chose to protect'
const SKY = "Tonight's sky of what you reached for"
const IDS = ['happiness-vs-meaning', 'career-passion', 'free-evening', 'love-or-freedom', 'radical-honesty',
  'friends-manuscript', 'right-or-close', 'forgiveness-limits', 'the-promotion', 'new-city', 'empty-weekend', 'last-slice']
const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')

const choiceA = (page: Page) => page.getByRole('button', { name: /^Choice A:/ })
const choiceB = (page: Page) => page.getByRole('button', { name: /^Choice B:/ })
const nextButton = (page: Page) => page.getByRole('button', { name: 'Next Dilemma' })
const progress = (page: Page, n: number) => page.getByText(`Dilemma ${n} of ${DILEMMA_COUNT}`)
const answerList = (page: Page) => page.getByRole('list', { name: 'The two answers' })
/** The card around a choice: its button, then the perspective and counts shown after choosing. */
const card = (page: Page, choice: Locator) => page.getByRole('listitem').filter({ has: choice })

async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() =>
    Promise.all(document.getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .map((a) => a.finished.catch(() => undefined))))
  await page.evaluate(AXE_SOURCE)
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> }
    }).axe
    const result = await axe.run({ exclude: [['nextjs-portal']] }, { runOnly: ['wcag2a', 'wcag2aa'] })
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  })
}

/** Clicks a choice, retrying only if the click landed before the page hydrated. */
async function choose(choice: Locator) {
  await expect(async () => {
    await choice.click()
    await expect(choice).toHaveAttribute('aria-pressed', 'true', { timeout: 500 })
  }).toPass()
}

interface VoteApi {
  posts: Array<{ dilemmaId: string; choice: 'A' | 'B' }>
  reads: string[]
}

async function databaseDown(page: Page): Promise<VoteApi> {
  const api: VoteApi = { posts: [], reads: [] }
  await page.route('**/api/hard-choices/vote', (route) => {
    api.posts.push(route.request().postDataJSON())
    return route.fulfill({ status: 500, json: { error: 'Failed to record vote' } })
  })
  await page.route('**/api/hard-choices/votes?*', (route) => {
    api.reads.push(new URL(route.request().url()).searchParams.get('dilemmaId') ?? '')
    return route.fulfill({ status: 500, json: { error: 'Failed to fetch vote counts' } })
  })
  return api
}

async function databaseUp(page: Page, initial: Record<string, { choiceA: number; choiceB: number }> = {}): Promise<VoteApi> {
  const api: VoteApi = { posts: [], reads: [] }
  const counts = (id: string) => (initial[id] ??= { choiceA: 0, choiceB: 0 })
  await page.route('**/api/hard-choices/vote', (route) => {
    const vote = route.request().postDataJSON()
    api.posts.push(vote)
    const current = counts(vote.dilemmaId)
    if (vote.choice === 'A') current.choiceA++
    else current.choiceB++
    return route.fulfill({ json: { success: true, results: { ...current } } })
  })
  await page.route('**/api/hard-choices/votes?*', (route) => {
    const id = new URL(route.request().url()).searchParams.get('dilemmaId') ?? ''
    api.reads.push(id)
    return route.fulfill({ json: { ...counts(id) } })
  })
  return api
}

/** Answers Supabase Realtime's join (protocol 2.0.0 frames) and can push inserts. */
async function realtimeServer(page: Page) {
  const joined: Array<{ ws: WebSocketRoute; topic: string }> = []
  let opened = 0
  await page.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
    opened++
    ws.onMessage((message) => {
      const [joinRef, ref, topic, event] = JSON.parse(String(message))
      if (event === 'phx_join') {
        joined.push({ ws, topic })
        ws.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', {
          status: 'ok',
          response: { postgres_changes: [{ id: 7, event: 'INSERT', schema: 'public', table: 'hard_choices_votes' }] },
        }]))
      } else if (event === 'heartbeat') {
        ws.send(JSON.stringify([null, ref, 'phoenix', 'phx_reply', { status: 'ok', response: {} }]))
      }
    })
  })
  return {
    opened: () => opened,
    insert: (dilemmaId: string, choice: 'A' | 'B') => {
      for (const { ws, topic } of joined) {
        ws.send(JSON.stringify([null, null, topic, 'postgres_changes', {
          ids: [7],
          data: {
            type: 'INSERT',
            schema: 'public',
            table: 'hard_choices_votes',
            commit_timestamp: new Date().toISOString(),
            columns: [{ name: 'id', type: 'uuid' }, { name: 'dilemma_id', type: 'text' }, { name: 'choice', type: 'text' }],
            record: { id: crypto.randomUUID(), dilemma_id: dilemmaId, choice },
            errors: null,
          },
        }]))
      }
    },
  }
}

async function failingRealtime(page: Page) {
  let opened = 0
  await page.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
    opened++
    ws.close({ code: 1006, reason: 'unreachable' })
  })
  return { opened: () => opened }
}

test.describe('database unreachable (the current reality)', () => {
  test('all 12 dilemmas play through to a calm ending instead of wrapping to the start', async ({ page }) => {
    const api = await databaseDown(page)
    const realtime = await failingRealtime(page)
    await page.goto('/games/the-crossroads')

    for (let n = 1; n <= DILEMMA_COUNT; n++) {
      await expect(progress(page, n)).toBeVisible()
      const pick = n % 2 ? choiceA(page) : choiceB(page)
      await choose(pick)
      await expect(pick).toHaveAttribute('aria-pressed', 'true')
      await expect(pick).toContainText('Your choice')
      await expect(page.getByRole('status')).toContainText(/^You chose \S/)
      await expect(page.getByText(/% chose this/)).toHaveCount(0)
      await page.getByRole('button', { name: n === DILEMMA_COUNT ? 'Finish' : 'Next Dilemma' }).click()
    }

    await expect(page.getByRole('heading', { name: ENDING })).toBeFocused()
    // Odd dilemmas were answered A, even ones B: one star per value, gathered by theme, under one reading line
    const sky = page.getByRole('img', { name: SKY })
    for (const group of [
      'Feeling settled: Joy.',
      'Stretching further: Purpose, Challenge, Making.',
      'The people around you: Friendship, Openness, Encouragement, Closeness, Roots.',
      'Your own footing: Selfhood, Self-respect, Self-kindness.',
    ]) {
      await expect(sky).toHaveAccessibleDescription(new RegExp(group))
    }
    await expect(sky).toHaveAccessibleDescription(/What kept returning today was the people around you\.$/)
    await expectKeepsakeSaves(page, { fileName: /^the-dilemma-\d{4}-\d{2}-\d{2}\.png$/ })
    await expect(page.getByRole('heading', { name: FIRST_SCENARIO })).toHaveCount(0)
    await expect(page.locator('main [role="alert"]')).toHaveCount(0)
    await expect(page.getByText('Live updates active')).toHaveCount(0)
    expect(api.posts).toHaveLength(DILEMMA_COUNT)
    // Nothing tries the realtime socket while the store is unreachable
    expect(realtime.opened()).toBe(0)

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hardChoicesVotes') ?? '{}'))
    expect(Object.keys(stored)).toHaveLength(DILEMMA_COUNT)
  })

  test('regression: a choice shows both perspectives right away, without the old wait for counts', async ({ page }) => {
    await databaseDown(page)
    // A slow failing count read, like the real 14 s one before the route stopped retrying
    await page.route('**/api/hard-choices/votes?*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 10_000))
      await route.fulfill({ status: 500, json: { error: 'Failed to fetch vote counts' } }).catch(() => {})
    })
    await page.addInitScript(() => localStorage.setItem('hardChoicesVotes', JSON.stringify({ 'happiness-vs-meaning': 'B' })))
    await page.goto('/games/the-crossroads')

    await expect(progress(page, 2)).toBeVisible()
    await page.getByRole('button', { name: 'Previous' }).click()
    await expect(answerList(page).getByText(FIRST_PERSPECTIVE_B)).toBeVisible({ timeout: 2000 })
    await expect(nextButton(page)).toBeVisible({ timeout: 2000 })
  })

  test('reloading mid-way resumes at the next unanswered dilemma and keeps earlier answers', async ({ page }) => {
    const api = await databaseDown(page)
    await page.goto('/games/the-crossroads')

    await choose(choiceA(page))
    await nextButton(page).click()
    await choose(choiceB(page))
    await nextButton(page).click()
    await expect(progress(page, 3)).toBeVisible()

    await page.reload()
    await expect(progress(page, 3)).toBeVisible()
    await expect(choiceA(page)).toHaveAttribute('aria-pressed', 'false')

    await page.getByRole('button', { name: 'Previous' }).click()
    await expect(progress(page, 2)).toBeVisible()
    await expect(choiceB(page)).toHaveAttribute('aria-pressed', 'true')

    // An answered dilemma stays answered; clicking the other side changes nothing
    await choiceA(page).click({ force: true })
    await expect(choiceA(page)).toHaveAttribute('aria-pressed', 'false')
    expect(api.posts).toHaveLength(2)
  })

  test('the ending offers a revisit and a fresh start that clears every answer', async ({ page }) => {
    const answers = Object.fromEntries(IDS.map((id) => [id, 'A']))
    const api = await databaseDown(page)
    await page.addInitScript((stored) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('hardChoicesVotes', stored)
        sessionStorage.setItem('seeded', '1')
      }
    }, JSON.stringify(answers))
    await page.goto('/games/the-crossroads')

    await expect(page.getByRole('heading', { name: ENDING })).toBeVisible()

    await page.getByRole('button', { name: 'Look back from the start' }).click()
    await expect(page.getByRole('heading', { name: FIRST_SCENARIO })).toBeFocused()
    await expect(choiceA(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(answerList(page).getByText(FIRST_PERSPECTIVE_A)).toBeVisible()

    for (let n = 1; n < DILEMMA_COUNT; n++) await nextButton(page).click()
    await page.getByRole('button', { name: 'Finish' }).click()
    await page.getByRole('button', { name: 'Clear my answers and start fresh' }).click()

    await expect(progress(page, 1)).toBeVisible()
    await expect(choiceA(page)).toHaveAttribute('aria-pressed', 'false')
    expect(await page.evaluate(() => localStorage.getItem('hardChoicesVotes'))).toBeNull()

    await choose(choiceB(page))
    await expect(choiceB(page)).toHaveAttribute('aria-pressed', 'true')
    // Never counted while the store was down, so the new answer is sent
    expect(api.posts).toEqual([{ dilemmaId: 'happiness-vs-meaning', choice: 'B' }])
  })

  test('keyboard only: Enter and Space choose, focus follows to each new dilemma', async ({ page }) => {
    await databaseDown(page)
    await page.goto('/games/the-crossroads')

    const a = choiceA(page)
    for (let i = 0; i < 40 && !(await a.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab')
    }
    await expect(a).toBeFocused()
    // Retried only if the key landed before the page hydrated
    await expect(async () => {
      await page.keyboard.press('Enter')
      await expect(a).toHaveAttribute('aria-pressed', 'true', { timeout: 500 })
    }).toPass()

    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(nextButton(page)).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'How do you want to spend your working life?' })).toBeFocused()

    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(choiceB(page)).toBeFocused()
    await page.keyboard.press('Space')
    await expect(choiceB(page)).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('reading it with a screen reader, and how it looks', () => {
  test('the perspectives sit outside the choice buttons and describe them; a choice announces only its result', async ({ page }) => {
    await databaseDown(page)
    await page.goto('/games/the-crossroads')
    await choose(choiceB(page))

    // The button's name is only its own answer, so the perspectives are not swallowed by it
    await expect(choiceA(page)).toHaveAccessibleName('Choice A: Constant happiness, less meaning')
    await expect(choiceA(page)).toHaveAccessibleDescription(FIRST_PERSPECTIVE_A)
    await expect(choiceB(page)).toHaveAccessibleDescription(FIRST_PERSPECTIVE_B)
    await expect(choiceA(page).getByText(FIRST_PERSPECTIVE_A)).toHaveCount(0)

    const status = page.getByRole('status')
    await expect(status).toContainText('You chose Meaning.')
    await expect(status).toContainText(/which you reach for first on a hard day/)
    await expect(status).not.toContainText(FIRST_PERSPECTIVE_A)
    await expect(status).not.toContainText(FIRST_PERSPECTIVE_B)
    await expect(status).toHaveAttribute('aria-atomic', 'false')
  })

  test('the chosen card is marked calmly, with words and a tick, not a red outline', async ({ page }) => {
    await databaseDown(page)
    await page.goto('/games/the-crossroads')
    await choose(choiceB(page))

    await expect(choiceB(page)).toContainText('Your choice')
    const colours = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const chosen = document.querySelector('li:has(button[aria-pressed="true"])') as HTMLElement
      const probe = document.createElement('div')
      probe.style.color = root.getPropertyValue('--accent')
      document.body.appendChild(probe)
      const accent = getComputedStyle(probe).color
      probe.remove()
      return { border: getComputedStyle(chosen).borderTopColor, accent }
    })
    expect(colours.border).not.toBe(colours.accent)
  })

  test('the header is centred like every other game and the category reads as a word', async ({ page }) => {
    await databaseDown(page)
    await page.goto('/games/the-crossroads')

    const title = page.getByRole('heading', { level: 1, name: 'The Dilemma' })
    await expect(title).toHaveCSS('text-align', 'center')
    await expect(page.locator('main')).toMatchAriaSnapshot('- text: Dilemma 1 of 12 Meaning')
  })

  test('answers saved by the earlier set of dilemmas are kept where they still apply and the rest dropped', async ({ page }) => {
    const api = await databaseDown(page)
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('hardChoicesVotes', JSON.stringify({
        'happiness-vs-meaning': 'A', 'career-passion': 'B', 'simulation-knowledge': 'A', 'trolley-personal': 'B',
        'lying-for-good': 'A', 'mortality-awareness': 'B', 'legacy-vs-experience': 'A', 'memory-erasure': 'skip',
        'children-climate': 'A', 'love-or-freedom': 'A', 'radical-honesty': 'B', 'forgiveness-limits': 'A',
      }))
      localStorage.setItem('hardChoicesCounted', JSON.stringify(['happiness-vs-meaning', 'trolley-personal']))
    })
    await page.goto('/games/the-crossroads')

    // The first new dilemma is the third one: the two before it were answered and still exist
    await expect(progress(page, 3)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Who gets your one free evening?' })).toBeVisible()
    const stored = await page.evaluate(() => ({
      votes: JSON.parse(localStorage.getItem('hardChoicesVotes') ?? '{}'),
      counted: JSON.parse(localStorage.getItem('hardChoicesCounted') ?? '[]'),
    }))
    expect(stored.votes).toEqual({
      'happiness-vs-meaning': 'A', 'career-passion': 'B', 'love-or-freedom': 'A', 'radical-honesty': 'B', 'forgiveness-limits': 'A',
    })
    expect(stored.counted).toEqual(['happiness-vs-meaning'])

    await page.getByRole('button', { name: 'Previous' }).click()
    await page.getByRole('button', { name: 'Previous' }).click()
    await expect(choiceA(page)).toHaveAttribute('aria-pressed', 'true')
    expect(api.posts).toEqual([])
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`no accessibility violations mid-game and at the ending (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await databaseUp(page, { 'happiness-vs-meaning': { choiceA: 3, choiceB: 5 } })
      await failingRealtime(page)
      await page.goto('/games/the-crossroads')
      await choose(choiceB(page))
      await expect(card(page, choiceB(page))).toContainText('% chose this')
      expect(await axeViolations(page)).toEqual([])

      await page.evaluate((ids) => localStorage.setItem('hardChoicesVotes',
        JSON.stringify(Object.fromEntries(ids.map((id, i) => [id, i % 3 ? 'A' : 'B'])))), IDS)
      await page.reload()
      await expect(page.getByRole('img', { name: SKY })).toBeVisible()
      await page.getByText('See or change each answer').click()
      expect(await axeViolations(page)).toEqual([])
    })
  }
})

test.describe('choosing at your own pace', () => {
  test('a question can be let pass, answered later, and the ending says so kindly', async ({ page }) => {
    const api = await databaseDown(page)
    await page.goto('/games/the-crossroads')

    await expect(async () => {
      await page.getByRole('button', { name: 'Let this one pass' }).click()
      await expect(progress(page, 2)).toBeVisible({ timeout: 500 })
    }).toPass()
    await expect(page.getByRole('heading', { name: 'How do you want to spend your working life?' })).toBeFocused()

    await page.getByRole('button', { name: 'Previous' }).click()
    await expect(page.getByText(/You let this one pass earlier/)).toBeVisible()
    await expect(choiceA(page)).toHaveAttribute('aria-pressed', 'false')
    await choose(choiceA(page))
    await expect(answerList(page).getByText(FIRST_PERSPECTIVE_A)).toBeVisible()
    expect(api.posts).toEqual([{ dilemmaId: 'happiness-vs-meaning', choice: 'A' }])

    await nextButton(page).click()
    for (let n = 2; n <= DILEMMA_COUNT; n++) {
      await expect(progress(page, n)).toBeVisible()
      await page.getByRole('button', { name: 'Let this one pass' }).click()
    }
    await expect(page.getByRole('heading', { name: ENDING })).toBeFocused()
    await expect(page.getByRole('img', { name: SKY })).toHaveAccessibleDescription(/Feeling settled: Joy\. Beneath it: A glimpse rather than a pattern/)
    await expect(page.getByText('You let 11 questions pass, and that is allowed too.')).toBeVisible()
    expect(api.posts).toHaveLength(1)
  })

  test('changing your mind keeps the new answer and never counts you twice', async ({ page }) => {
    const api = await databaseUp(page)
    await failingRealtime(page)
    await page.goto('/games/the-crossroads')

    await choose(choiceA(page))
    await expect(card(page, choiceA(page))).toContainText('1 vote')
    await page.getByRole('button', { name: 'Change my answer' }).click()
    await expect(choiceA(page)).toBeFocused()
    await expect(choiceA(page)).toHaveAttribute('aria-pressed', 'false')

    await choose(choiceB(page))
    await expect(page.getByRole('status')).toContainText('You chose Meaning.')
    expect(api.posts).toHaveLength(1)
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hardChoicesVotes') ?? '{}'))
    expect(stored).toEqual({ 'happiness-vs-meaning': 'B' })
  })

  test('from the ending, any single answer can be revisited', async ({ page }) => {
    await databaseDown(page)
    await page.addInitScript((stored) => localStorage.setItem('hardChoicesVotes', stored),
      JSON.stringify(Object.fromEntries(IDS.map((id) => [id, 'B']))))
    await page.goto('/games/the-crossroads')

    await expect(page.getByRole('heading', { name: ENDING })).toBeVisible()
    await page.getByText('See or change each answer').click()
    await page.getByRole('button', { name: 'Revisit: Start fresh, or stay known?' }).click()
    await expect(page.getByRole('heading', { name: 'Start fresh, or stay known?' })).toBeFocused()
    await expect(progress(page, 10)).toBeVisible()
    await expect(choiceB(page)).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('database reachable', () => {
  test('a vote shows how others chose, goes live, and counts other people’s votes as they arrive', async ({ page }) => {
    const api = await databaseUp(page, { 'happiness-vs-meaning': { choiceA: 29, choiceB: 70 } })
    const realtime = await realtimeServer(page)
    await page.goto('/games/the-crossroads')

    await choose(choiceA(page))
    await expect(card(page, choiceA(page))).toContainText('30% chose this')
    await expect(card(page, choiceA(page))).toContainText('30 votes')
    await expect(card(page, choiceB(page))).toContainText('70% chose this')
    await expect(page.getByText(/Fewer people chose this: 30% did\./)).toBeVisible()
    await expect(page.getByText('Live updates active')).toBeVisible()
    expect(api.posts).toEqual([{ dilemmaId: 'happiness-vs-meaning', choice: 'A' }])

    // The player's own insert echoes back over realtime and must not count twice
    realtime.insert('happiness-vs-meaning', 'A')
    realtime.insert('happiness-vs-meaning', 'B')
    await expect(card(page, choiceB(page))).toContainText('71 votes')
    await expect(card(page, choiceA(page))).toContainText('30 votes')
  })

  test('when the realtime socket cannot connect it gives up quietly instead of reconnecting forever', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await databaseUp(page)
    const realtime = await failingRealtime(page)
    await page.goto('/games/the-crossroads')

    await choose(choiceA(page))
    await expect(card(page, choiceA(page))).toContainText('100% chose this')
    await expect.poll(realtime.opened).toBeGreaterThan(0)
    const attempts = realtime.opened()
    // The client library would retry after 1 s, 2 s and 5 s if left alone
    await page.waitForTimeout(4000)
    expect(realtime.opened()).toBe(attempts)
    await expect(page.getByText('Live updates active')).toHaveCount(0)
    expect(errors.filter((e) => /realtime|websocket/i.test(e))).toEqual([])
  })

  test('a dilemma answered again after a fresh start is not counted twice', async ({ page }) => {
    const api = await databaseUp(page)
    await failingRealtime(page)
    await page.goto('/games/the-crossroads')

    await choose(choiceA(page))
    await expect(card(page, choiceA(page))).toContainText('1 vote')
    await page.evaluate(() => localStorage.removeItem('hardChoicesVotes'))
    await page.reload()

    await choose(choiceB(page))
    await expect(choiceB(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(card(page, choiceA(page))).toContainText('1 vote')
    expect(api.posts).toHaveLength(1)
    expect(api.reads).toContain('happiness-vs-meaning')
  })

  test.describe('on a phone with reduced motion', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

    test('fits the screen and shows the results', async ({ page }) => {
      await databaseUp(page, { 'happiness-vs-meaning': { choiceA: 5, choiceB: 4 } })
      await failingRealtime(page)
      await page.goto('/games/the-crossroads')

      await expect(async () => {
        await choiceB(page).tap()
        await expect(choiceB(page)).toHaveAttribute('aria-pressed', 'true', { timeout: 500 })
      }).toPass()
      await expect(card(page, choiceB(page))).toContainText('50% chose this')
      await expect(page.getByText(/almost evenly split/)).toBeVisible()
      // Regression: the way on is on screen without the player hunting for it
      await expect(nextButton(page)).toBeInViewport({ ratio: 1 })
      await nextButton(page).tap()
      await expect(progress(page, 2)).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  })

  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    test.describe(`the question and the way on at ${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport, reducedMotion: 'reduce' })

      test('after each choice the question stays clear of the header and Next is in view; each new card lands the same way', async ({ page }) => {
        await databaseUp(page)
        await failingRealtime(page)
        await page.goto('/games/the-crossroads')
        const question = page.getByRole('list', { name: 'The two answers' }).locator('xpath=preceding-sibling::h2')
        const questionTop = async () => {
          const header = await page.getByRole('banner').boundingBox()
          const box = await question.boundingBox()
          return (box?.y ?? -1) - ((header?.y ?? 0) + (header?.height ?? 0))
        }

        const landings: number[] = []
        for (let n = 1; n <= 5; n++) {
          await expect(progress(page, n)).toBeVisible()
          await choose(n % 2 ? choiceA(page) : choiceB(page))
          await expect(page.getByText(/% chose this/).first()).toBeVisible()
          await expect.poll(questionTop).toBeGreaterThanOrEqual(8)
          await expect(nextButton(page)).toBeInViewport({ ratio: 1 })
          await nextButton(page).click()
          await expect(progress(page, n + 1)).toBeVisible()
          await expect(question).toBeFocused()
          await expect.poll(questionTop).toBeGreaterThanOrEqual(8)
          landings.push(Math.round((await question.boundingBox())?.y ?? -1))
        }
        // The card lands at the same height every time: the context line can differ, so allow a line of slack
        expect(Math.max(...landings.slice(1)) - Math.min(...landings.slice(1))).toBeLessThanOrEqual(80)
      })
    })
  }
})
