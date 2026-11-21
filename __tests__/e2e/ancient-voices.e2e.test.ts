import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * The Sage (Timeless Minds): a video-call style conversation with a thinker from history.
 *
 * The first thinker is random, so each test calls Socrates from the phone book first.
 * Replies come from a stub, and browser speech is replaced with a recorder so nothing
 * is spoken aloud and nothing paid is reached. The voice starts off: no sound until the player asks.
 */

const IMAGINED = 'Imagined conversations, not real quotes from the person.'

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

  // Nothing is read aloud until the player turns the voice on.
  expect(await spoken(page)).toEqual([])
})

test('the player can type the next message while a reply is still being spoken', async ({ page }) => {
  await setUpBrowser(page)
  await page.addInitScript(() => {
    // Speech that never finishes on its own, as on a device without audio output.
    window.speechSynthesis.speak = () => {}
  })
  await stubChat(page)
  await openGame(page)
  await page.getByRole('button', { name: 'Turn on thinker voice' }).click()

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

test('the voice starts off, speaks only once chosen, and video can be turned off', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  const voiceOn = page.getByRole('button', { name: 'Turn on thinker voice' })
  await expect(voiceOn).toHaveAttribute('aria-pressed', 'false')
  await expect(voiceOn).toContainText('Voice off')

  await send(page, 'Speak softly')
  await expect(bubbles(page).nth(2)).toContainText('Reply 1')
  expect(await spoken(page)).toEqual([])

  await voiceOn.click()
  const voiceOff = page.getByRole('button', { name: 'Turn off thinker voice' })
  await expect(voiceOff).toHaveAttribute('aria-pressed', 'true')
  await send(page, 'Out loud')
  await expect.poll(() => spoken(page)).toContain('Reply 2: let us think about "Out loud".')

  await voiceOff.click()
  await page.evaluate(() => { (window as unknown as { __spoken: string[] }).__spoken.length = 0 })

  await page.getByRole('button', { name: 'Turn off video' }).click()
  await expect(page.getByText('Audio Only Mode')).toBeVisible()
  await expect(page.getByText('Turn on video to see Socrates')).toBeVisible()
  await send(page, 'Still softly')
  await expect(bubbles(page).nth(6)).toContainText('Reply 3')
  expect(await spoken(page)).toEqual([])

  await page.getByRole('button', { name: 'Turn on video' }).click()
  await expect(page.getByText('Audio Only Mode')).toHaveCount(0)
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

async function stubFarewell(page: Page, reply: { status?: number; farewell?: string } = {}) {
  const requests: Array<{ thinkerId: string; conversationHistory: Array<{ role: string; content: string }> }> = []
  await page.route('**/api/timeless-minds/farewell', async route => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({ status: reply.status ?? 200, json: reply.status ? { error: 'unavailable' } : { farewell: reply.farewell ?? 'Carry your question gently; it is already half an answer.' } })
  })
  return requests
}

async function sayGoodbye(page: Page) {
  await page.getByRole('button', { name: 'Say goodbye' }).click()
  await page.getByRole('dialog', { name: 'Say goodbye to Socrates?' }).getByRole('button', { name: 'Say goodbye' }).click()
}

test('saying goodbye asks first, can be cancelled with Escape, and ends with parting words', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  const farewells = await stubFarewell(page)
  await openGame(page)
  await send(page, 'Goodbye soon')
  await expect(bubbles(page).nth(2)).toContainText('Reply 1')

  await page.getByRole('button', { name: 'Say goodbye' }).click()
  const dialog = page.getByRole('dialog', { name: 'Say goodbye to Socrates?' })
  await expect(dialog.getByRole('button', { name: 'Keep talking' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(bubbles(page)).toHaveCount(3)

  await sayGoodbye(page)
  const parting = page.getByRole('dialog', { name: 'Parting words from Socrates' })
  await expect(parting).toContainText('Carry your question gently; it is already half an answer.')
  await expect(parting).toContainText(IMAGINED)
  await expect(parting.getByRole('heading', { name: 'Parting words from Socrates' })).toBeFocused()
  // Keyboard focus stays inside the parting words.
  await page.keyboard.press('Tab')
  await expect(parting.getByRole('button', { name: 'Meet someone new' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(parting.getByRole('button', { name: 'Choose who is next' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(parting.getByRole('button', { name: 'Meet someone new' })).toBeFocused()
  expect(farewells[0].thinkerId).toBe('socrates')
  expect(farewells[0].conversationHistory).toContainEqual({ role: 'user', content: 'Goodbye soon' })

  await parting.getByRole('button', { name: 'Meet someone new' }).click()
  await expect(parting).toHaveCount(0)
  await expect(bubbles(page)).toHaveCount(1)
  await expect(bubbles(page)).not.toHaveText([SOCRATES_OPENING])
  await expect(input(page)).toBeFocused()
})

test('parting words still arrive when they cannot be fetched, and the directory can choose who is next', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await stubFarewell(page, { status: 500 })
  await openGame(page)

  await sayGoodbye(page)
  const parting = page.getByRole('dialog', { name: 'Parting words from Socrates' })
  await expect(parting).toContainText('Take this with you: Know thyself.')
  await expect(parting).not.toContainText(/error|unavailable|AI/)

  await parting.getByRole('button', { name: 'Choose who is next' }).click()
  await expect(page.getByRole('dialog', { name: 'The Phone Book' })).toBeVisible()
})

test('meeting another thinker never brings the same one straight back', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await stubFarewell(page)
  await openGame(page)

  // Every random pick lands on the first thinker, who is the one on the call.
  await page.evaluate(() => { Math.random = () => 0 })
  await sayGoodbye(page)
  await page.getByRole('dialog', { name: 'Parting words from Socrates' }).getByRole('button', { name: 'Meet someone new' }).click()

  await expect(bubbles(page)).toHaveText([PLATO_OPENING])
  await expect(page.getByText('Plato', { exact: true }).first()).toBeVisible()
})

test('the call says plainly that the conversation is imagined, without naming the technology', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  await expect(page.getByText(IMAGINED).first()).toBeVisible()
  expect(await page.locator('main').innerText()).not.toMatch(/\bAI\b|simulation/)
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
    await expect(form).toContainText(IMAGINED)
    expect(await form.innerText()).not.toMatch(/\bAI\b/)
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
  await expect(disclaimer.getByRole('heading', { name: 'Imagined conversations, not real quotes' })).toBeVisible()
  expect(await disclaimer.locator('main').innerText()).not.toMatch(/\bAI\b/)
  await expect(disclaimer.getByRole('link', { name: 'Back to The Sage' })).toHaveAttribute('href', '/games/ancient-voices')
  await expect(disclaimer.getByRole('link', { name: 'Return to The Sage' })).toHaveAttribute('href', '/games/ancient-voices')

  await disclaimer.getByRole('link', { name: 'Return to The Sage' }).click()
  await expect(disclaimer).toHaveURL(/\/games\/ancient-voices$/)
  await expect(disclaimer.getByRole('textbox', { name: 'Message input' })).toBeVisible()
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the conversation and every control fit and work', async ({ page }) => {
    await setUpBrowser(page)
    await stubChat(page)
    await openGame(page)

    for (const name of ['Open phone book', 'Request thinker', 'Start voice input', 'Turn on thinker voice', 'Turn off video', 'Say goodbye']) {
      await expect(page.getByRole('button', { name })).toBeInViewport()
    }
    // Under 16px, phones zoom the page when the field is focused.
    expect(await input(page).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)

    await page.getByRole('button', { name: 'How do I let go?' }).or(page.getByRole('button', { name: 'What is virtue?' })).click()
    await input(page).press('Enter')
    await expect(bubbles(page).nth(2)).toContainText('Reply 1')

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
