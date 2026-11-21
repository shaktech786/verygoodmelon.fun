import { test, expect, type Page } from '@playwright/test'

/**
 * Shared play-through for the two writing games, The Final Word and The Awakening.
 * The browser writes to and reads from Supabase directly, so both worlds are
 * simulated at the PostgREST endpoint: "DB down" fails the request the way an
 * unresolvable host does, "DB up" keeps an in-memory table.
 */
export interface WritingGameConfig {
  slug: string
  table: string
  reflectPath: string
  submitLabel: string
  againLabel: string
  thanksHeading: string
  textboxLabel: RegExp
  cloudLabel: string
  promptMarker: string
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
  await page.route(`**${config.reflectPath}`, (route) =>
    status === 200
      ? route.fulfill({ json: { reflection: REFLECTION } })
      : route.fulfill({ status, json: { error: 'Too many requests. Please wait a moment.' } })
  )
}

async function databaseDown(page: Page, config: WritingGameConfig): Promise<Mocks> {
  const posts: string[] = []
  let reads = 0
  await page.route(`**/rest/v1/${config.table}**`, (route) => {
    if (route.request().method() === 'POST') posts.push(route.request().postData() ?? '')
    else reads++
    return route.abort('namenotresolved')
  })
  return { posts, reads: () => reads }
}

async function databaseUp(page: Page, config: WritingGameConfig, existing: string[]): Promise<Mocks> {
  const rows = existing.map((words) => ({ words }))
  const posts: string[] = []
  let reads = 0
  await page.route(`**/rest/v1/${config.table}**`, (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      const body = request.postData() ?? ''
      posts.push(body)
      rows.unshift(...(JSON.parse(body) as Array<{ words: string }>))
      return route.fulfill({ status: 201, body: '' })
    }
    reads++
    return route.fulfill({ json: rows.slice(0, 1000) })
  })
  return { posts, reads: () => reads }
}

/** Fills the textbox once the page has hydrated, so the game's own state holds the text. */
async function fillWords(page: Page, config: WritingGameConfig, words: string) {
  const expected = Math.min(words.length, 500)
  await expect(async () => {
    await page.getByRole('textbox', { name: config.textboxLabel }).fill(words)
    await expect(page.getByText(`${expected}/500 characters`)).toBeVisible({ timeout: 500 })
  }).toPass()
}

async function write(page: Page, config: WritingGameConfig, words: string) {
  await fillWords(page, config, words)
  await page.getByRole('button', { name: config.submitLabel }).click()
  await expect(page.getByRole('heading', { name: config.thanksHeading })).toBeFocused()
}

async function expectNoErrorPanel(page: Page, config: WritingGameConfig) {
  await expect(page.locator('main [role="alert"]')).toHaveCount(0)
  await expect(afterView(page, config)).not.toContainText(/went wrong|try again|error|failed/i)
}

/** The game's own after-submission view, without the site chrome around it. */
function afterView(page: Page, config: WritingGameConfig) {
  return page
    .getByRole('heading', { name: config.thanksHeading })
    .locator('xpath=ancestor::div[contains(@class, "space-y-6")][1]')
}

export function describeWritingGame(config: WritingGameConfig) {
  const cloudSection = (page: Page) => afterView(page, config).getByRole('heading', { level: 3 })
  const cloud = (page: Page) => page.getByRole('img', { name: new RegExp(`^${config.cloudLabel}:`) })

  test.describe('database unreachable (the current reality)', () => {
    test('the player still writes, sees their words and a reflection, and can write again', async ({ page }) => {
      const db = await databaseDown(page, config)
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'Thank you for the ordinary days.')

      await expect(page.locator('blockquote')).toHaveText('“Thank you for the ordinary days.”')
      await expect(page.getByText(REFLECTION)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Copy reflection to clipboard' })).toBeVisible()
      await expectNoErrorPanel(page, config)
      // The shared cloud quietly stays away instead of a loading card that later vanishes
      await expect(cloudSection(page)).toHaveCount(0)
      expect(db.posts).toHaveLength(1)
      expect(db.reads()).toBe(0)

      await page.getByRole('button', { name: config.againLabel }).click()
      const textbox = page.getByRole('textbox', { name: config.textboxLabel })
      await expect(textbox).toBeFocused()
      await expect(textbox).toHaveValue('')
    })

    test('regression: no loading card lingers through retries after a failed save', async ({ page }) => {
      await databaseDown(page, config)
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'Be gentle with yourself.')
      await expect(page.getByText(/Gathering/)).toHaveCount(0)
    })

    test('a failed reflection leaves the player with their words, not an error', async ({ page }) => {
      await databaseDown(page, config)
      await mockReflection(page, config, 429)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'I was here and it mattered.')
      await expect(page.locator('blockquote')).toContainText('I was here and it mattered.')
      await expect(page.getByRole('button', { name: 'Copy reflection to clipboard' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: config.againLabel })).toBeVisible()
      await expectNoErrorPanel(page, config)
      await expect(afterView(page, config)).not.toContainText(/AI|generat|powered by/i)
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
      await expect(page.getByText('From 301')).toBeVisible()
      await expect(page.getByText(/300 other/)).toBeVisible()
      expect(JSON.parse(db.posts[0])).toEqual([{ words: 'Love each other loudly.' }])
      // Only the top words are drawn, however many submissions there are
      expect(await cloud(page).locator('text').count()).toBeLessThanOrEqual(50)
      await expectNoErrorPanel(page, config)
    })

    test('the very first words get a cloud of their own and a welcome', async ({ page }) => {
      await databaseUp(page, config, [])
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'Remember the sunrise')

      await expect(page.getByText(/^Yours (are|is) the first/)).toBeVisible()
      await expect(cloud(page)).toHaveAttribute('aria-label', `${config.cloudLabel}: remember, sunrise`)
      await expect(page.getByText(/From 1 (submission|awakening)$/)).toBeVisible()
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
      await expect(cloud(page)).toHaveAttribute('aria-label', /ありがとう/)
      await expect(page.locator('main script, main img[src="x"]')).toHaveCount(0)
      expect(dialogs).toBe(0)
    })

    test('an empty or whitespace-only message cannot be sent', async ({ page }) => {
      const db = await databaseUp(page, config, [])
      await page.goto(`/games/${config.slug}`)

      const textbox = page.getByRole('textbox', { name: config.textboxLabel })
      const submit = page.getByRole('button', { name: config.submitLabel })
      await expect(submit).toBeDisabled()
      await fillWords(page, config, '   \n  ')
      await expect(submit).toBeDisabled()
      await textbox.press('Control+Enter')
      await expect(page.getByRole('heading', { name: config.thanksHeading })).toHaveCount(0)
      expect(db.posts).toHaveLength(0)
    })

    test('very long text stops at 500 characters', async ({ page }) => {
      const db = await databaseUp(page, config, [])
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await fillWords(page, config, 'a'.repeat(400) + ' ' + 'b'.repeat(300))
      await page.getByRole('button', { name: config.submitLabel }).click()
      await expect(page.getByRole('heading', { name: config.thanksHeading })).toBeVisible()
      expect(JSON.parse(db.posts[0])[0].words).toHaveLength(500)
    })

    test('a double submit saves the words once', async ({ page }) => {
      const db = await databaseUp(page, config, [])
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await fillWords(page, config, 'Only once')
      await page.getByRole('button', { name: config.submitLabel }).dblclick()
      await expect(page.getByRole('heading', { name: config.thanksHeading })).toBeVisible()
      expect(db.posts).toHaveLength(1)
    })

    test('reloading after submitting starts a fresh page without resubmitting', async ({ page }) => {
      const db = await databaseUp(page, config, [])
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'See you on the other side')
      await page.reload()
      await expect(page.getByRole('textbox', { name: config.textboxLabel })).toHaveValue('')
      expect(db.posts).toHaveLength(1)
    })
  })

  test('keyboard only: Tab to the text, Ctrl+Enter to send, focus lands on the thank-you', async ({ page }) => {
    await databaseDown(page, config)
    await mockReflection(page, config)
    await page.goto(`/games/${config.slug}`)

    const textbox = page.getByRole('textbox', { name: config.textboxLabel })
    // Keys pressed before hydration never reach the game, so wait for it first
    await fillWords(page, config, 'x')
    await textbox.fill('')
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    for (let i = 0; i < 40 && !(await textbox.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab')
    }
    await expect(textbox).toBeFocused()
    await page.keyboard.type('Keep going.')
    await page.keyboard.press('Control+Enter')
    await expect(page.getByRole('heading', { name: config.thanksHeading })).toBeFocused()
    await expect(page.getByText(REFLECTION)).toBeVisible()
  })

  test('regression: the prompt holds still once the player starts writing', async ({ page }) => {
    await page.clock.install()
    await page.goto(`/games/${config.slug}`)
    const prompt = page.getByText(config.promptMarker).locator('..')
    const first = await prompt.innerText()

    await page.clock.runFor(7000)
    await expect(prompt).not.toHaveText(first)

    await fillWords(page, config, 'Thinking...')
    const whileWriting = await prompt.innerText()
    await page.clock.runFor(20000)
    await expect(prompt).toHaveText(whileWriting)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

    test('fits the screen and plays through with a cloud', async ({ page }) => {
      await databaseUp(page, config, SAMPLE_WORDS)
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

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

    test('plays through the same way', async ({ page }) => {
      await databaseUp(page, config, SAMPLE_WORDS)
      await mockReflection(page, config)
      await page.goto(`/games/${config.slug}`)

      await write(page, config, 'Slow down.')
      await expect(page.getByText(REFLECTION)).toBeVisible()
      await expect(cloud(page)).toBeVisible()
    })
  })
}
