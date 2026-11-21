import { test, expect, type Page } from '@playwright/test'

/**
 * Shared play-through for the two writing games, The Final Word and The Awakening.
 * The browser sends words to the game's own route (/api/last-words or
 * /api/first-words), which filters them and writes with the server's
 * credentials. Both worlds are simulated at that route: "DB down" answers the
 * way it does while Supabase is unreachable (503, not stored), "DB up" keeps an
 * in-memory list. The route's filter itself is exercised for real in one test.
 */
export interface WritingGameConfig {
  slug: string
  /** Path segment of the game's routes: /api/<game> and /api/<game>/reflect. */
  game: 'last-words' | 'first-words'
  submitLabel: string
  againLabel: string
  thanksHeading: string
  textboxLabel: string
  cloudLabel: string
  firstPrompt: string
  secondPrompt: string
  /** The button that closes the experience, and the line it leaves the player with. */
  closingButton: string
  closingLine: RegExp
  /** How the thank-you line counts the others whose words are in the cloud. */
  othersLine: RegExp
  firstLine: RegExp
}

const REFLECTION =
  'There is a quiet steadiness in what you chose to say, as if kindness were the one thing worth carrying all the way through.'

const SAMPLE_WORDS = [
  'I love you all, be kind to each other',
  'Thank you for everything, it was beautiful',
  'Tell my family I love them',
  'Do not be afraid, love is all that matters',
  'Take care of each other and the garden',
  'Спасибо за всё, любите друг друга',
]

interface Mocks {
  posts: string[]
  reads: () => number
}

async function mockReflection(page: Page, config: WritingGameConfig, status = 200) {
  await page.route(`**/api/${config.game}/reflect`, (route) =>
    status === 200
      ? route.fulfill({ json: { reflection: REFLECTION } })
      : route.fulfill({ status, json: { error: 'Server error' } })
  )
}

async function databaseDown(page: Page, config: WritingGameConfig): Promise<Mocks> {
  const posts: string[] = []
  let reads = 0
  await page.route(`**/api/${config.game}`, (route) => {
    if (route.request().method() === 'POST') posts.push(route.request().postDataJSON().words)
    else reads++
    return route.fulfill({ status: 503, json: { stored: false } })
  })
  return { posts, reads: () => reads }
}

const STOP_WORDS = new Set(['the', 'and', 'you', 'for', 'all', 'each', 'other', 'them', 'was', 'not', 'that', 'had', 'are'])

/** Counts the stored words roughly the way the server does, which the cloud tests rely on. */
function cloudOf(rows: string[]) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const words = new Set(
      row.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    )
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  const words = Array.from(counts, ([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, 50)
  return { words, total: rows.length }
}

async function databaseUp(page: Page, config: WritingGameConfig, existing: string[]): Promise<Mocks> {
  const rows = [...existing]
  const posts: string[] = []
  let reads = 0
  await page.route(`**/api/${config.game}`, (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      const { words } = request.postDataJSON() as { words: string }
      posts.push(words)
      rows.unshift(words.trim())
      return route.fulfill({ status: 201, json: { stored: true } })
    }
    reads++
    return route.fulfill({ json: cloudOf(rows) })
  })
  return { posts, reads: () => reads }
}

const textbox = (page: Page, config: WritingGameConfig) => page.getByRole('textbox', { name: config.textboxLabel })

/** Fills the textbox once the page has hydrated, so the game's own state holds the text. */
async function fillWords(page: Page, config: WritingGameConfig, words: string) {
  const expected = Math.min(words.length, 500)
  await expect(async () => {
    await textbox(page, config).fill(words)
    await expect(page.getByText(`${expected}/500 characters`)).toBeVisible({ timeout: 500 })
  }).toPass()
}

async function write(page: Page, config: WritingGameConfig, words: string) {
  await fillWords(page, config, words)
  await page.getByRole('button', { name: config.submitLabel, exact: true }).click()
  await expect(page.getByRole('heading', { name: config.thanksHeading })).toBeFocused()
}

async function expectNoErrorPanel(page: Page) {
  await expect(page.locator('main [role="alert"]')).toHaveCount(0)
  await expect(page.locator('main')).not.toContainText(/went wrong|try again|error|failed/i)
}

export function describeWritingGame(config: WritingGameConfig) {
  const cloud = (page: Page) => page.getByRole('img', { name: new RegExp(`^${config.cloudLabel}:`) })
  const support = (page: Page) => page.getByRole('complementary', { name: 'Support' })

  test.describe('database unreachable (the current reality)', () => {
    test('the player writes, hears back, closes the moment gently and can write again', async ({ page }) => {
      const db = await databaseDown(page, config)
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'Thank you for the ordinary days.')

      await expect(page.locator('blockquote')).toHaveText('“Thank you for the ordinary days.”')
      await expect(page.getByText(REFLECTION)).toBeVisible()
      await expectNoErrorPanel(page)
      // The shared cloud quietly stays away instead of a loading card that later vanishes
      await expect(cloud(page)).toHaveCount(0)
      await expect(page.getByText(/Gathering/)).toHaveCount(0)
      await expect(support(page)).toHaveCount(0)
      expect(db.posts).toEqual(['Thank you for the ordinary days.'])
      expect(db.reads()).toBe(0)

      await page.getByRole('button', { name: config.closingButton }).click()
      await expect(page.getByText(config.closingLine)).toBeFocused()

      await page.getByRole('button', { name: config.againLabel }).click()
      await expect(textbox(page, config)).toBeFocused()
      await expect(textbox(page, config)).toHaveValue('')
      await expect(page.getByRole('button', { name: config.closingButton })).toHaveCount(0)
    })

    test('a failed reflection leaves the player with their words, not an error', async ({ page }) => {
      await databaseDown(page, config)
      await mockReflection(page, config, 500)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'I was here and it mattered.')
      await expect(page.locator('blockquote')).toContainText('I was here and it mattered.')
      await expect(page.getByRole('button', { name: config.closingButton })).toBeVisible()
      await expect(page.getByRole('button', { name: config.againLabel })).toBeVisible()
      await expectNoErrorPanel(page)
      await expect(page.locator('main')).not.toContainText(/\bAI\b|generat|powered by/i)
    })

    test('words that sound like someone may be in danger are met with care and real places to turn', async ({ page }) => {
      await databaseDown(page, config)
      // Even with no reflection at all, the care is already there
      await mockReflection(page, config, 500)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'I want to end my life. Everyone is better off without me.')

      await expect(support(page)).toBeVisible()
      await expect(support(page).getByRole('link', { name: 'findahelpline.com' })).toHaveAttribute('href', 'https://findahelpline.com')
      await expect(support(page).getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988')
      await expect(page.getByRole('button', { name: config.againLabel })).toBeVisible()
    })

    test('regression: in care mode the suggestions offer calm games, never the games about death', async ({ page }) => {
      await databaseDown(page, config)
      await page.route('**/reflect', (route) =>
        route.fulfill({ json: { reflection: 'Thank you for trusting this page.', care: true } })
      )
      await page.goto(`/games/${config.slug}`)

      // Indirect enough that only the reply's own judgement recognises it
      await write(page, config, 'Everything feels heavy and I am done with all of it.')

      await expect(support(page)).toBeVisible()
      const related = page.getByRole('region', { name: 'Something gentle, if it helps' })
      await expect(related).toBeVisible()
      await expect(related.locator('a[href="/games/the-still-point"]')).toBeVisible()
      await expect(related.locator('a[href="/games/first-breath"], a[href="/games/final-breath"]')).toHaveCount(0)
    })
  })

  test.describe('database reachable', () => {
    test('hundreds of earlier words become a labelled cloud that counts the player in', async ({ page }) => {
      const existing = Array.from({ length: 300 }, (_, i) => SAMPLE_WORDS[i % SAMPLE_WORDS.length])
      const db = await databaseUp(page, config, existing)
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'Love each other loudly.')

      await expect(cloud(page)).toBeVisible()
      await expect(cloud(page)).toHaveAttribute('aria-label', /love/)
      await expect(page.getByText(/From 301 /)).toBeVisible()
      await expect(page.getByText(config.othersLine)).toBeVisible()
      expect(db.posts).toEqual(['Love each other loudly.'])
      expect(await cloud(page).locator('text').count()).toBeLessThanOrEqual(50)
      await expectNoErrorPanel(page)
    })

    test('the very first words get a cloud of their own and a welcome', async ({ page }) => {
      await databaseUp(page, config, [])
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'Remember the sunrise')

      await expect(page.getByText(config.firstLine)).toBeVisible()
      await expect(cloud(page)).toHaveAttribute('aria-label', `${config.cloudLabel}: remember, sunrise`)
      await expect(page.getByText(/From 1 (person|arrival)\.$/)).toBeVisible()
    })

    test('emoji, non-Latin and markup-looking text are shown literally and never run', async ({ page }) => {
      await databaseUp(page, config, [])
      await mockReflection(page, config)
      let dialogs = 0
      page.on('dialog', (dialog) => {
        dialogs++
        return dialog.dismiss()
      })
      await page.goto(`/games/${config.slug}`)

      const words = '<script>alert(1)</script> <img src=x onerror=alert(2)> 🍉 ありがとう спасибо'
      await write(page, config, words)

      await expect(page.locator('blockquote')).toHaveText(`“${words}”`)
      await expect(cloud(page)).toHaveAttribute('aria-label', /спасибо/)
      await expect(page.locator('main script, main img[src="x"]')).toHaveCount(0)
      expect(dialogs).toBe(0)
    })

    test('an empty or whitespace-only message cannot be sent', async ({ page }) => {
      const db = await databaseUp(page, config, [])
      await page.goto(`/games/${config.slug}`)

      const submit = page.getByRole('button', { name: config.submitLabel, exact: true })
      await expect(submit).toBeDisabled()
      await fillWords(page, config, '   \n  ')
      await expect(submit).toBeDisabled()
      await textbox(page, config).press('Control+Enter')
      await expect(page.getByRole('heading', { name: config.thanksHeading })).toHaveCount(0)
      expect(db.posts).toHaveLength(0)
    })

    test('very long text stops at 500 characters', async ({ page }) => {
      const db = await databaseUp(page, config, [])
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await fillWords(page, config, 'a'.repeat(400) + ' ' + 'b'.repeat(300))
      await page.getByRole('button', { name: config.submitLabel, exact: true }).click()
      await expect(page.getByRole('heading', { name: config.thanksHeading })).toBeVisible()
      await expect.poll(() => db.posts.length).toBe(1)
      expect(db.posts[0]).toHaveLength(500)
    })

    test('a double submit saves the words once', async ({ page }) => {
      const db = await databaseUp(page, config, [])
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await fillWords(page, config, 'Only once')
      await page.getByRole('button', { name: config.submitLabel, exact: true }).dblclick()
      await expect(page.getByRole('heading', { name: config.thanksHeading })).toBeVisible()
      await expect(cloud(page)).toBeVisible()
      expect(db.posts).toHaveLength(1)
    })

    test('reloading after submitting starts a fresh page without resubmitting', async ({ page }) => {
      const db = await databaseUp(page, config, [])
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'See you on the other side')
      await expect(cloud(page)).toBeVisible()
      await page.reload()
      await expect(textbox(page, config)).toHaveValue('')
      expect(db.posts).toHaveLength(1)
    })
  })

  test('the real route quietly declines abuse and links before they reach the shared cloud', async ({ request }) => {
    // Each call is its own visitor, so earlier runs never trip the per-visitor limit
    const visitor = () => ({ 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250) + 1}` })
    const abusive = await request.post(`/api/${config.game}`, { data: { words: 'k y s, all of you' }, headers: visitor() })
    expect(abusive.status()).toBe(200)
    expect(await abusive.json()).toEqual({ stored: false })

    const link = await request.post(`/api/${config.game}`, { data: { words: 'buy at cheap-pills.ru' }, headers: visitor() })
    expect(await link.json()).toEqual({ stored: false })

    const tooLong = await request.post(`/api/${config.game}`, { data: { words: 'a'.repeat(501) }, headers: visitor() })
    expect(tooLong.status()).toBe(400)
  })

  test('keyboard only: Tab to the text, Ctrl+Enter to send, focus lands on the thank-you', async ({ page }) => {
    await databaseDown(page, config)
    await mockReflection(page, config)
    await page.goto(`/games/${config.slug}`)

    // Keys pressed before hydration never reach the game, so wait for it first
    await fillWords(page, config, 'x')
    await textbox(page, config).fill('')
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    for (let i = 0; i < 40 && !(await textbox(page, config).evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab')
    }
    await expect(textbox(page, config)).toBeFocused()
    await page.keyboard.type('Keep going.')
    await page.keyboard.press('Control+Enter')
    await expect(page.getByRole('heading', { name: config.thanksHeading })).toBeFocused()
    await expect(page.getByText(REFLECTION)).toBeVisible()
  })

  test('the question changes only when the player asks for another', async ({ page }) => {
    await page.clock.install()
    await page.goto(`/games/${config.slug}`)
    await expect(page.getByText(config.firstPrompt)).toBeVisible()

    await page.clock.runFor(30_000)
    await expect(page.getByText(config.firstPrompt)).toBeVisible()

    await expect(async () => {
      await page.getByRole('button', { name: 'Another question' }).click()
      await expect(page.getByText(config.secondPrompt)).toBeVisible({ timeout: 500 })
    }).toPass()
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('fits the screen and plays through with a cloud', async ({ page }) => {
      await databaseUp(page, config, SAMPLE_WORDS)
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      // With the keyboard up, roughly the top half of the screen is what the player sees
      const send = await page.getByRole('button', { name: config.submitLabel, exact: true }).boundingBox()
      expect(send!.y + send!.height).toBeLessThan(844)

      await write(page, config, 'Hold the people you love.')
      await expect(cloud(page)).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      const box = await cloud(page).boundingBox()
      expect(box!.width).toBeLessThanOrEqual(390)
    })
  })

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('plays through the same way, closing included', async ({ page }) => {
      await databaseUp(page, config, SAMPLE_WORDS)
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'Slow down.')
      await expect(page.getByText(REFLECTION)).toBeVisible()
      await expect(cloud(page)).toBeVisible()
      await page.getByRole('button', { name: config.closingButton }).click()
      await expect(page.getByText(config.closingLine)).toBeFocused()
    })
  })
}
