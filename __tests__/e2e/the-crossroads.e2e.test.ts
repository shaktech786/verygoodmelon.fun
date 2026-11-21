import { test, expect, type Locator, type Page, type WebSocketRoute } from '@playwright/test'

/**
 * The Dilemma (Hard Choices): choose A or B on 12 dilemmas, read both
 * perspectives, and see how others chose when the vote store is reachable.
 *
 * "DB down" is what the routes answer while Supabase is unreachable (HTTP 500);
 * "DB up" keeps vote counts in memory and stands in for Supabase Realtime.
 *
 * Run with: npx playwright test __tests__/e2e/the-crossroads.e2e.test.ts
 */

const DILEMMA_COUNT = 12
const FIRST_SCENARIO = 'If you knew the exact date of your death...'
const FIRST_PERSPECTIVE_A = /Knowledge is power/
const FIRST_PERSPECTIVE_B = /The beauty of life is in its unpredictability/

const choiceA = (page: Page) => page.getByRole('button', { name: /^Choice A:/ })
const choiceB = (page: Page) => page.getByRole('button', { name: /^Choice B:/ })
const nextButton = (page: Page) => page.getByRole('button', { name: 'Next Dilemma' })
const progress = (page: Page, n: number) => page.getByText(`Dilemma ${n} of ${DILEMMA_COUNT}`)

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
      await expect(page.getByText('Neither choice is wrong.')).toBeVisible()
      await expect(page.getByText(/% chose this/)).toHaveCount(0)
      await page.getByRole('button', { name: n === DILEMMA_COUNT ? 'Finish' : 'Next Dilemma' }).click()
    }

    await expect(page.getByRole('heading', { name: `You've sat with all ${DILEMMA_COUNT} dilemmas` })).toBeFocused()
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
    await page.addInitScript(() => localStorage.setItem('hardChoicesVotes', JSON.stringify({ 'mortality-awareness': 'B' })))
    await page.goto('/games/the-crossroads')

    await expect(progress(page, 2)).toBeVisible()
    await page.getByRole('button', { name: 'Previous' }).click()
    await expect(page.getByText(FIRST_PERSPECTIVE_B)).toBeVisible({ timeout: 2000 })
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
    const answers = Object.fromEntries(
      ['mortality-awareness', 'legacy-vs-experience', 'trolley-personal', 'lying-for-good', 'happiness-vs-meaning',
        'simulation-knowledge', 'love-or-freedom', 'forgiveness-limits', 'career-passion', 'children-climate',
        'memory-erasure', 'radical-honesty'].map((id) => [id, 'A'])
    )
    const api = await databaseDown(page)
    await page.addInitScript((stored) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('hardChoicesVotes', stored)
        sessionStorage.setItem('seeded', '1')
      }
    }, JSON.stringify(answers))
    await page.goto('/games/the-crossroads')

    await expect(page.getByRole('heading', { name: `You've sat with all ${DILEMMA_COUNT} dilemmas` })).toBeVisible()

    await page.getByRole('button', { name: 'Revisit your answers' }).click()
    await expect(page.getByRole('heading', { name: FIRST_SCENARIO })).toBeFocused()
    await expect(choiceA(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText(FIRST_PERSPECTIVE_A)).toBeVisible()

    for (let n = 1; n < DILEMMA_COUNT; n++) await nextButton(page).click()
    await page.getByRole('button', { name: 'Finish' }).click()
    await page.getByRole('button', { name: 'Clear my answers and start fresh' }).click()

    await expect(progress(page, 1)).toBeVisible()
    await expect(choiceA(page)).toHaveAttribute('aria-pressed', 'false')
    expect(await page.evaluate(() => localStorage.getItem('hardChoicesVotes'))).toBeNull()

    await choose(choiceB(page))
    await expect(choiceB(page)).toHaveAttribute('aria-pressed', 'true')
    // Never counted while the store was down, so the new answer is sent
    expect(api.posts).toEqual([{ dilemmaId: 'mortality-awareness', choice: 'B' }])
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
    await expect(page.getByRole('heading', { name: 'How would you spend your final year?' })).toBeFocused()

    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(choiceB(page)).toBeFocused()
    await page.keyboard.press('Space')
    await expect(choiceB(page)).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('database reachable', () => {
  test('a vote shows how others chose, goes live, and counts other people’s votes as they arrive', async ({ page }) => {
    const api = await databaseUp(page, { 'mortality-awareness': { choiceA: 29, choiceB: 70 } })
    const realtime = await realtimeServer(page)
    await page.goto('/games/the-crossroads')

    await choose(choiceA(page))
    await expect(choiceA(page)).toContainText('30% chose this')
    await expect(choiceA(page)).toContainText('30 votes')
    await expect(choiceB(page)).toContainText('70% chose this')
    await expect(page.getByText(/Most people lean one way here/)).toBeVisible()
    await expect(page.getByText('Live updates active')).toBeVisible()
    expect(api.posts).toEqual([{ dilemmaId: 'mortality-awareness', choice: 'A' }])

    // The player's own insert echoes back over realtime and must not count twice
    realtime.insert('mortality-awareness', 'A')
    realtime.insert('mortality-awareness', 'B')
    await expect(choiceB(page)).toContainText('71 votes')
    await expect(choiceA(page)).toContainText('30 votes')
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
    await expect(choiceA(page)).toContainText('100% chose this')
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
    await expect(choiceA(page)).toContainText('1 vote')
    await page.evaluate(() => localStorage.removeItem('hardChoicesVotes'))
    await page.reload()

    await choose(choiceB(page))
    await expect(choiceB(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(choiceA(page)).toContainText('1 vote')
    expect(api.posts).toHaveLength(1)
    expect(api.reads).toContain('mortality-awareness')
  })

  test.describe('on a phone with reduced motion', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

    test('fits the screen and shows the results', async ({ page }) => {
      await databaseUp(page, { 'mortality-awareness': { choiceA: 5, choiceB: 4 } })
      await failingRealtime(page)
      await page.goto('/games/the-crossroads')

      await expect(async () => {
        await choiceB(page).tap()
        await expect(choiceB(page)).toHaveAttribute('aria-pressed', 'true', { timeout: 500 })
      }).toPass()
      await expect(choiceB(page)).toContainText('50% chose this')
      await expect(page.getByText(/A true dilemma/)).toBeVisible()
      await nextButton(page).scrollIntoViewIfNeeded()
      await expect(nextButton(page)).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  })
})
