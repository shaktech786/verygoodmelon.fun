import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * The Sage (Timeless Minds): a video-call style conversation with a thinker from history.
 *
 * The first thinker is random, so each test calls Socrates from the phone book first.
 * Replies come from a stub, and browser speech is replaced with a recorder so nothing
 * is spoken aloud and nothing paid is reached.
 */

const SOCRATES_OPENING = 'I know that I know nothing. What shall we explore together?'
const PLATO_OPENING = 'We can easily forgive a child who is afraid of the dark; the real tragedy is adults who fear the light. What truth do you seek?'
const CURIE_OPENING = 'Nothing in life is to be feared, it is only to be understood. What would you like to understand?'
const REPLY_TROUBLE = 'Forgive me, my thoughts drifted for a moment. Could you say that again?'

interface ChatRequest {
  thinkerId: string
  message: string
  conversationHistory: Array<{ role: string; content: string }>
}

async function setUpBrowser(page: Page, { speechRecognition = true } = {}) {
  await page.addInitScript((keepRecognition: boolean) => {
    const spoken: string[] = []
    ;(window as unknown as { __spoken: string[] }).__spoken = spoken
    window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
      spoken.push(utterance.text)
      setTimeout(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent), 0)
    }
    window.speechSynthesis.cancel = () => {}

    if (!keepRecognition) {
      delete (window as unknown as Record<string, unknown>).SpeechRecognition
      delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    }
  }, speechRecognition)

  await page.route(/\/api\/(game-events|site-visits)/, route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
  await page.route('**/api/timeless-minds/tts', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }))
}

async function stubChat(page: Page, reply: (body: ChatRequest, count: number) => Promise<void> | void = () => {}) {
  const requests: ChatRequest[] = []
  await page.route('**/api/timeless-minds/chat', async (route: Route) => {
    const body = route.request().postDataJSON() as ChatRequest
    requests.push(body)
    await reply(body, requests.length)
    await route.fulfill({ json: { response: `Reply ${requests.length}: let us think about "${body.message}".`, emotion: 'thoughtful' } })
  })
  return requests
}

const input = (page: Page) => page.getByRole('textbox', { name: 'Message input' })
const bubbles = (page: Page) => page.locator('p.whitespace-pre-wrap')
const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)

async function callFromPhoneBook(page: Page, name: string) {
  await page.getByRole('button', { name: 'Open phone book' }).click()
  const phoneBook = page.getByRole('dialog', { name: 'The Phone Book' })
  await phoneBook.getByRole('searchbox', { name: 'Search thinkers' }).fill(name)
  await phoneBook.getByRole('button', { name: `Start call with ${name}` }).click()
  await expect(phoneBook).toHaveCount(0)
}

async function openGame(page: Page) {
  await page.goto('/games/ancient-voices')
  await expect(bubbles(page).first()).toBeVisible()
  await callFromPhoneBook(page, 'Socrates')
  await expect(bubbles(page)).toHaveText([SOCRATES_OPENING])
}

async function send(page: Page, text: string) {
  await input(page).fill(text)
  await input(page).press('Enter')
}

test('a first-time player picks a suggested topic and has a multi-turn conversation', async ({ page }) => {
  await setUpBrowser(page)
  const requests = await stubChat(page)
  await openGame(page)

  await expect(page.getByText('Socrates', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Try asking about:')).toBeVisible()

  await page.getByRole('button', { name: 'What is virtue?' }).click()
  await expect(input(page)).toHaveValue('What is virtue?')
  await expect(input(page)).toBeFocused()
  await input(page).press('Enter')

  await expect(bubbles(page).nth(2)).toHaveText('Reply 1: let us think about "What is virtue?".')
  await expect(page.getByText('Try asking about:')).toHaveCount(0)
  await expect(input(page)).toBeFocused()

  await send(page, 'And how do I practise it?')
  await expect(bubbles(page).nth(4)).toHaveText('Reply 2: let us think about "And how do I practise it?".')

  // The thinker remembers the whole conversation so far.
  expect(requests[1]).toEqual({
    thinkerId: 'socrates',
    message: 'And how do I practise it?',
    conversationHistory: [
      { role: 'assistant', content: SOCRATES_OPENING },
      { role: 'user', content: 'What is virtue?' },
      { role: 'assistant', content: 'Reply 1: let us think about "What is virtue?".' },
    ],
  })

  // With the voice on, replies are spoken.
  await expect.poll(() => spoken(page)).toContain('Reply 2: let us think about "And how do I practise it?".')
})

test('the player can type the next message while a reply is still being spoken', async ({ page }) => {
  await setUpBrowser(page)
  await page.addInitScript(() => {
    // Speech that never finishes on its own, as on a device without audio output.
    window.speechSynthesis.speak = () => {}
  })
  await stubChat(page)
  await openGame(page)

  await send(page, 'Hello')
  await expect(bubbles(page).nth(2)).toContainText('Reply 1')
  await expect(input(page)).toBeEnabled()

  await send(page, 'Still here')
  await expect(bubbles(page).nth(4)).toContainText('Reply 2')
})

test('switching thinker in the phone book mid-reply starts a clean conversation', async ({ page }) => {
  await setUpBrowser(page)
  let release: () => void = () => {}
  const requests = await stubChat(page, (_body, count) =>
    count === 1 ? new Promise<void>(resolve => { release = resolve }) : undefined
  )
  await openGame(page)

  await send(page, 'A question Socrates never gets to answer')
  await expect(input(page)).toBeDisabled()

  await page.getByRole('button', { name: 'Open phone book' }).click()
  const phoneBook = page.getByRole('dialog', { name: 'The Phone Book' })
  await expect(phoneBook.getByRole('searchbox', { name: 'Search thinkers' })).toBeFocused()
  await expect(phoneBook.getByText('39 thinkers available')).toBeVisible()

  await page.keyboard.type('zzzz')
  await expect(phoneBook.getByText('No thinkers found matching your search.')).toBeVisible()

  await phoneBook.getByRole('searchbox', { name: 'Search thinkers' }).fill('curie')
  await expect(phoneBook.getByText('1 thinker available matching "curie"')).toBeVisible()
  await phoneBook.getByRole('button', { name: 'Start call with Marie Curie' }).click()

  await expect(phoneBook).toHaveCount(0)
  await expect(bubbles(page)).toHaveText([CURIE_OPENING])
  await expect(input(page)).toBeEnabled()
  await expect(page.getByText('Try asking about:')).toBeVisible()

  // Socrates' late answer must not appear in the conversation with Marie Curie.
  release()
  await send(page, 'What drives discovery?')
  await expect(bubbles(page).nth(2)).toContainText('Reply 2')
  await expect(bubbles(page)).toHaveCount(3)
  await expect(page.getByText('A question Socrates never gets to answer')).toHaveCount(0)
  expect(requests[1].thinkerId).toBe('marie-curie')
  expect(requests[1].conversationHistory).toEqual([{ role: 'assistant', content: CURIE_OPENING }])
})

test('the phone book filters by field and closes with Escape', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  await page.getByRole('button', { name: 'Open phone book' }).click()
  const phoneBook = page.getByRole('dialog', { name: 'The Phone Book' })
  await phoneBook.getByRole('button', { name: 'Philosophy', exact: true }).click()
  await expect(phoneBook.getByRole('button', { name: 'Philosophy', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(phoneBook.getByRole('button', { name: 'Start call with Plato' })).toBeVisible()
  await expect(phoneBook.getByRole('button', { name: 'Start call with Marie Curie' })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(phoneBook).toHaveCount(0)
  await expect(bubbles(page)).toHaveText([SOCRATES_OPENING])
})

test('when a reply cannot be fetched, the thinker asks again calmly and the next message works', async ({ page }) => {
  await setUpBrowser(page)
  let failing = true
  await page.route('**/api/timeless-minds/chat', route =>
    failing
      ? route.fulfill({ status: 500, json: { error: 'AI model unavailable' } })
      : route.fulfill({ json: { response: 'Then let us begin again.', emotion: 'neutral' } })
  )
  await openGame(page)

  await send(page, 'Are you there?')
  await expect(bubbles(page).nth(2)).toHaveText(REPLY_TROUBLE)
  await expect(bubbles(page).filter({ hasText: /model|unavailable|error|AI/ })).toHaveCount(0)

  failing = false
  await send(page, 'Let us try again')
  await expect(bubbles(page).nth(4)).toHaveText('Then let us begin again.')

  await page.route('**/api/timeless-minds/chat', route => route.abort('internetdisconnected'))
  await send(page, 'Offline now')
  await expect(bubbles(page).nth(6)).toHaveText(REPLY_TROUBLE)
  await expect(input(page)).toBeEnabled()
})

test('voice and video can be turned off, and a muted thinker stays silent', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  await page.getByRole('button', { name: 'Mute thinker voice' }).click()
  await expect(page.getByRole('button', { name: 'Unmute thinker voice' })).toContainText('Voice Off')
  await page.evaluate(() => { (window as unknown as { __spoken: string[] }).__spoken.length = 0 })

  // Muted with the portrait still showing: the reply used to be read aloud anyway.
  await send(page, 'Speak softly')
  await expect(bubbles(page).nth(2)).toContainText('Reply 1')

  await page.getByRole('button', { name: 'Turn off video' }).click()
  await expect(page.getByText('Audio Only Mode')).toBeVisible()
  await expect(page.getByText('Turn on video to see Socrates')).toBeVisible()
  await send(page, 'Still softly')
  await expect(bubbles(page).nth(4)).toContainText('Reply 2')
  expect(await spoken(page)).toEqual([])

  await page.getByRole('button', { name: 'Turn on video' }).click()
  await expect(page.getByText('Audio Only Mode')).toHaveCount(0)
  await page.getByRole('button', { name: 'Unmute thinker voice' }).click()
  await send(page, 'Now aloud')
  await expect.poll(() => spoken(page)).toContain('Reply 3: let us think about "Now aloud".')
})

test('without speech input in the browser, Speak explains that typing still works', async ({ page }) => {
  await setUpBrowser(page, { speechRecognition: false })
  await stubChat(page)
  await openGame(page)

  await page.getByRole('button', { name: 'Start voice input' }).click()
  await expect(page.getByText('Speaking is not available here, so please type your message instead.')).toBeVisible()
  await expect(page.getByText('Listening...')).toHaveCount(0)
  await expect(input(page)).toBeEnabled()

  await send(page, 'Typed instead')
  await expect(bubbles(page).nth(2)).toContainText('Reply 1')
  await expect(page.getByText('Speaking is not available here')).toHaveCount(0)
})

test('ending a call asks first, can be cancelled with Escape, and then brings a different thinker', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)
  await send(page, 'Goodbye soon')
  await expect(bubbles(page).nth(2)).toContainText('Reply 1')

  await page.getByRole('button', { name: 'End call' }).click()
  const dialog = page.getByRole('dialog', { name: 'End this conversation?' })
  await expect(dialog.getByRole('button', { name: 'Continue Call' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(bubbles(page)).toHaveCount(3)

  await page.getByRole('button', { name: 'End call' }).click()
  await dialog.getByRole('button', { name: 'End & Meet Another' }).click()

  await expect(bubbles(page)).toHaveCount(1)
  await expect(bubbles(page)).not.toHaveText([SOCRATES_OPENING])
  await expect(input(page)).toBeFocused()
})

test('meeting another thinker never brings the same one straight back', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  // Every random pick lands on the first thinker, who is the one on the call.
  await page.evaluate(() => { Math.random = () => 0 })
  await page.getByRole('button', { name: 'End call' }).click()
  await page.getByRole('dialog', { name: 'End this conversation?' }).getByRole('button', { name: 'End & Meet Another' }).click()

  await expect(bubbles(page)).toHaveText([PLATO_OPENING])
  await expect(page.getByText('Plato', { exact: true }).first()).toBeVisible()
})

test.describe('requesting a thinker', () => {
  async function fillRequest(page: Page, name: string) {
    await page.getByRole('button', { name: 'Request thinker' }).click()
    const form = page.getByRole('dialog', { name: 'Request a Thinker' })
    await form.getByLabel('Your Name').fill('Ana')
    await form.getByLabel('Your Email').fill('ana@example.com')
    await form.getByLabel(/Who would you like to talk to/).fill(name)
    await form.getByLabel('Why this person?').fill('Their curiosity')
    await form.getByRole('button', { name: 'Submit Request' }).click()
    return form
  }

  test('a request that cannot be saved keeps the words and says so kindly', async ({ page }) => {
    await setUpBrowser(page)
    await page.route('**/api/timeless-minds/request-thinker', route => route.fulfill({ status: 500, json: { error: 'Failed to create request' } }))
    await openGame(page)

    const form = await fillRequest(page, 'Carl Jung')
    await expect(form.getByText('Your request could not be sent just now.')).toBeVisible()
    await expect(form.getByLabel(/Who would you like to talk to/)).toHaveValue('Carl Jung')
    await expect(form.getByText(/Failed to create/)).toHaveCount(0)

    await page.keyboard.press('Escape')
    await expect(form).toHaveCount(0)
  })

  test('a request the rules turn down explains why', async ({ page }) => {
    await setUpBrowser(page)
    await openGame(page)

    const form = await fillRequest(page, 'Elon Musk')
    await expect(form.getByText('Only deceased historical figures are allowed.', { exact: false })).toBeVisible()
  })

  test('a saved request says thank you without promising extras', async ({ page }) => {
    await setUpBrowser(page)
    await page.route('**/api/timeless-minds/request-thinker', route => route.fulfill({ json: { success: true, requestId: 'req_1' } }))
    await openGame(page)

    await fillRequest(page, 'Carl Jung')
    await expect(page.getByText('Request Submitted!')).toBeVisible()
    await expect(page.getByText(/Phone Book/)).toHaveCount(0)
  })
})

test('the legal disclaimer opens from the call and links back to the game', async ({ page, context }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  const link = page.getByRole('link', { name: 'Full Legal Disclaimer' })
  await expect(link).toHaveAttribute('href', '/games/ancient-voices/disclaimer')

  const [disclaimer] = await Promise.all([context.waitForEvent('page'), link.click()])
  await expect(disclaimer.getByRole('heading', { name: 'Legal Disclaimer', level: 1 })).toBeVisible()
  await expect(disclaimer.getByRole('link', { name: 'Back to Timeless Minds' })).toHaveAttribute('href', '/games/ancient-voices')
  await expect(disclaimer.getByRole('link', { name: 'Return to Timeless Minds' })).toHaveAttribute('href', '/games/ancient-voices')

  await disclaimer.getByRole('link', { name: 'Return to Timeless Minds' }).click()
  await expect(disclaimer).toHaveURL(/\/games\/ancient-voices$/)
  await expect(disclaimer.getByRole('textbox', { name: 'Message input' })).toBeVisible()
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the conversation and every control fit and work', async ({ page }) => {
    await setUpBrowser(page)
    await stubChat(page)
    await openGame(page)

    for (const name of ['Open phone book', 'Request thinker', 'Start voice input', 'Mute thinker voice', 'Turn off video', 'End call']) {
      await expect(page.getByRole('button', { name })).toBeInViewport()
    }

    await page.getByRole('button', { name: 'How do I let go?' }).or(page.getByRole('button', { name: 'What is virtue?' })).click()
    await input(page).press('Enter')
    await expect(bubbles(page).nth(2)).toContainText('Reply 1')

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
