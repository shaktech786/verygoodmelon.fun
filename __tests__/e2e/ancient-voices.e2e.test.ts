import { readFileSync } from 'fs'
import path from 'path'
import { test, expect, type Page, type Route } from '@playwright/test'
import { getThinkerById, thinkers } from '@/lib/games/timeless-minds/thinkers'
import { expectOneGo, expectStillCare } from './helpers/design'

/**
 * The Sage (Timeless Minds): a conversation with a thinker from history in a quiet sitting room,
 * with every control folded into one Menu beside their portrait.
 *
 * The visit starts with a short choice of who to talk with, so each test chooses Socrates there first.
 * Replies come from a stub, and browser speech is replaced with a recorder so nothing
 * is spoken aloud and nothing paid is reached. The voice starts off: no sound until the player asks.
 */

const IMAGINED = 'Imagined conversations, not real quotes from the person.'

const opening = (id: string) => getThinkerById(id)!.openingLine
const SOCRATES_OPENING = opening('socrates')
const PLATO_OPENING = opening('plato')
const CURIE_OPENING = opening('marie-curie')
const AXE_SOURCE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')
const REPLY_TROUBLE = 'Forgive me, my thoughts drifted for a moment. Your words are back in the box below, if you would send them again.'

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
  await offerRequests(page, false)
}

async function offerRequests(page: Page, available: boolean) {
  await page.route('**/api/timeless-minds/request-thinker', route =>
    route.request().method() === 'GET' ? route.fulfill({ json: { available } }) : route.fallback()
  )
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

const menuButton = (page: Page) => page.getByRole('button', { name: 'Menu', exact: true })

/** Opens the room's one menu and chooses an item from it. */
async function fromMenu(page: Page, item: string) {
  if (await menuButton(page).getAttribute('aria-expanded') !== 'true') await menuButton(page).click()
  await page.getByRole('button', { name: item, exact: true }).click()
}

async function callFromPhoneBook(page: Page, name: string) {
  await fromMenu(page, 'Choose who to talk with')
  const phoneBook = page.getByRole('dialog', { name: 'Directory' })
  await phoneBook.getByRole('searchbox', { name: 'Search thinkers' }).fill(name)
  await phoneBook.getByRole('button', { name: `Start call with ${name}` }).click()
  await expect(phoneBook).toHaveCount(0)
}

const chooser = (page: Page) => page.getByRole('region', { name: 'Who would you like to talk with?' })

/** Loads the game and answers its opening question with one of the offered thinkers. */
async function chooseFirst(page: Page, name: string) {
  await page.goto('/games/ancient-voices')
  await answerChooser(page, name)
}

/** A tap that lands before the page has woken up does nothing, so it is tried again until the call starts. */
async function answerChooser(page: Page, name: string) {
  await expect(async () => {
    await chooser(page).getByRole('button', { name: new RegExp(`^${name}`) }).click({ timeout: 1000 })
    await expect(chooser(page)).toHaveCount(0, { timeout: 1000 })
  }).toPass()
  await expect(bubbles(page).first()).toBeVisible()
}

async function openGame(page: Page) {
  await chooseFirst(page, 'Socrates')
  await expect(bubbles(page)).toHaveText([SOCRATES_OPENING])
}

async function send(page: Page, text: string) {
  await input(page).fill(text)
  await input(page).press('Enter')
}

test('the visit opens on a calm choice of a few thinkers or a surprise, then the chosen one greets the player', async ({ page }) => {
  await setUpBrowser(page)
  await page.goto('/games/ancient-voices')

  await expect(chooser(page).getByRole('heading', { name: 'Who would you like to talk with?' })).toBeVisible()
  const choices = chooser(page).getByRole('listitem')
  expect(await choices.count()).toBeGreaterThanOrEqual(3)
  expect(await choices.count()).toBeLessThanOrEqual(4)
  await expect(chooser(page).getByRole('button', { name: 'Surprise me' })).toBeVisible()
  // Nothing grabs focus on arrival, and the conversation waits for the choice
  await expect(input(page)).toHaveCount(0)
  await expect(chooser(page)).not.toContainText(/\bAI\b|generat|powered by/i)

  // Keyboard only: Enter on an offer starts the call, ready to type into
  const socrates = chooser(page).getByRole('button', { name: /^Socrates/ })
  await expect(async () => {
    await socrates.focus({ timeout: 1000 })
    await page.keyboard.press('Enter')
    await expect(chooser(page)).toHaveCount(0, { timeout: 1000 })
  }).toPass()
  await expect(page.getByRole('heading', { name: 'Talking with Socrates' })).toBeAttached()
  await expect(input(page)).toBeFocused()
})

test('"Surprise me" starts a call with someone, never one whose life ended in despair', async ({ page }) => {
  const vanGogh = thinkers.findIndex(t => t.id === 'vincent-van-gogh')
  await setUpBrowser(page)
  await page.goto('/games/ancient-voices')
  // Fixed only once the page is up, so the page itself starts as it always does
  await page.evaluate((value: number) => { Math.random = () => value }, (vanGogh + 0.5) / thinkers.length)
  await answerChooser(page, 'Surprise me')

  await expect(page.getByRole('heading', { name: /Talking with/ })).not.toContainText('Vincent van Gogh')
  await expect(bubbles(page).first()).not.toHaveText(opening('vincent-van-gogh'))
})

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
  await fromMenu(page, 'Turn on thinker voice')

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

  await fromMenu(page, 'Choose who to talk with')
  const phoneBook = page.getByRole('dialog', { name: 'Directory' })
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

test('the directory filters by a few broad shelves, with no near-duplicates, and closes with Escape', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  await fromMenu(page, 'Choose who to talk with')
  const phoneBook = page.getByRole('dialog', { name: 'Directory' })
  await expect(phoneBook.locator('button[aria-pressed]')).toHaveText(['All', 'Philosophy & spirit', 'Science & invention', 'Arts & writing', 'Justice & leadership'])

  await phoneBook.getByRole('button', { name: 'Philosophy & spirit' }).click()
  await expect(phoneBook.getByRole('button', { name: 'Philosophy & spirit' })).toHaveAttribute('aria-pressed', 'true')
  await expect(phoneBook.getByRole('button', { name: 'Start call with Plato' })).toBeVisible()
  await expect(phoneBook.getByRole('button', { name: 'Start call with Marie Curie' })).toHaveCount(0)

  await phoneBook.getByRole('button', { name: 'Justice & leadership' }).click()
  await expect(phoneBook.getByRole('button', { name: 'Start call with Harriet Tubman' })).toBeVisible()
  await expect(phoneBook.getByRole('button', { name: 'Start call with Eleanor Roosevelt' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(phoneBook).toHaveCount(0)
  await expect(bubbles(page)).toHaveText([SOCRATES_OPENING])
})

test('when a reply cannot be fetched, the thinker asks again calmly, the words come back to resend, and the next message works', async ({ page }) => {
  await setUpBrowser(page)
  let failing = true
  const histories: unknown[][] = []
  await page.route('**/api/timeless-minds/chat', route => {
    histories.push(route.request().postDataJSON().conversationHistory)
    return failing
      ? route.fulfill({ status: 500, json: { error: 'AI model unavailable' } })
      : route.fulfill({ json: { response: 'Then let us begin again.', emotion: 'neutral' } })
  })
  await openGame(page)

  await send(page, 'Are you there?')
  await expect(bubbles(page).nth(2)).toHaveText(REPLY_TROUBLE)
  await expect(bubbles(page).filter({ hasText: /model|unavailable|error|AI/ })).toHaveCount(0)
  // Nothing has to be typed twice: the words are back in the box
  await expect(input(page)).toHaveValue('Are you there?')
  await expect(page.getByText('Not answered yet')).toBeVisible()

  failing = false
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(bubbles(page).nth(4)).toHaveText('Then let us begin again.')
  // The hiccup is not part of the talk the thinker hears
  expect(JSON.stringify(histories[1])).not.toContain('drifted')
  expect(JSON.stringify(histories[1])).not.toContain('Are you there?')

  await send(page, 'Let us try again')
  await expect(bubbles(page).nth(6)).toHaveText('Then let us begin again.')

  await page.route('**/api/timeless-minds/chat', route => route.abort('internetdisconnected'))
  await send(page, 'Offline now')
  await expect(bubbles(page).nth(8)).toHaveText(REPLY_TROUBLE)
  await expect(input(page)).toHaveValue('Offline now')
  // Only answered messages count toward the goodbye shortcut
  await expect(page.getByRole('button', { name: 'Say goodbye to Socrates' })).toHaveCount(0)
  await expect(input(page)).toBeEnabled()
})

test('a reply that never comes is let go after twenty seconds: the words come back, unanswered and uncounted', async ({ page }) => {
  // Waits out the real twenty-second timeout
  test.slow()
  await setUpBrowser(page)
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  let hanging = true
  const histories: unknown[][] = []
  await page.route('**/api/timeless-minds/chat', route => {
    histories.push(route.request().postDataJSON().conversationHistory)
    // A hung reply: the request is held open and never answered
    if (hanging) return
    return route.fulfill({ json: { response: 'There you are.', emotion: 'neutral' } })
  })
  await openGame(page)

  const sentAt = Date.now()
  await send(page, 'Is anyone listening?')
  await expect(input(page)).toBeDisabled()
  await expect(input(page)).toHaveValue('')

  await expect(bubbles(page).nth(2)).toHaveText(REPLY_TROUBLE, { timeout: 30_000 })
  expect(Date.now() - sentAt).toBeGreaterThanOrEqual(19_000)
  await expect(input(page)).toBeEnabled()
  await expect(input(page)).toHaveValue('Is anyone listening?')
  await expect(page.getByText('Not answered yet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Say goodbye to Socrates' })).toHaveCount(0)
  // Letting a slow reply go is expected, not a fault
  expect(errors.filter(text => /Failed to send message|TimeoutError/.test(text))).toEqual([])

  hanging = false
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(bubbles(page).nth(4)).toHaveText('There you are.')
  // Neither side of the hung exchange is part of the talk the thinker hears
  expect(JSON.stringify(histories[1])).not.toContain('Is anyone listening?')
  expect(JSON.stringify(histories[1])).not.toContain('drifted')
})

test('the voice starts off, speaks only once chosen, and the portrait can be hidden', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  await menuButton(page).click()
  const voiceOn = page.getByRole('button', { name: 'Turn on thinker voice' })
  await expect(voiceOn).toHaveAttribute('aria-pressed', 'false')
  await expect(voiceOn).toContainText('Voice off')

  await send(page, 'Speak softly')
  await expect(bubbles(page).nth(2)).toContainText('Reply 1')
  expect(await spoken(page)).toEqual([])

  await fromMenu(page, 'Turn on thinker voice')
  // A toggle leaves the menu open, so its new state can be read straight away.
  const voiceOff = page.getByRole('button', { name: 'Turn off thinker voice' })
  await expect(voiceOff).toHaveAttribute('aria-pressed', 'true')
  await send(page, 'Out loud')
  await expect.poll(() => spoken(page)).toContain('Reply 2: let us think about "Out loud".')

  await fromMenu(page, 'Turn off thinker voice')
  await page.evaluate(() => { (window as unknown as { __spoken: string[] }).__spoken.length = 0 })

  const portrait = page.locator('img[src$="socrates.png"]').first()
  await expect(portrait).toBeVisible()
  await fromMenu(page, 'Hide portrait')
  await expect(portrait).toHaveCount(0)
  await expect(page.getByTestId('portrait-hidden')).toBeVisible()
  await send(page, 'Still softly')
  await expect(bubbles(page).nth(6)).toContainText('Reply 3')
  expect(await spoken(page)).toEqual([])

  await fromMenu(page, 'Show portrait')
  await expect(page.getByTestId('portrait-hidden')).toHaveCount(0)
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
  await fromMenu(page, 'Say goodbye')
  await page.getByRole('dialog', { name: 'Say goodbye to Socrates?' }).getByRole('button', { name: 'Say goodbye' }).click()
}

test('saying goodbye asks first, can be cancelled with Escape, and ends with parting words', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  const farewells = await stubFarewell(page)
  await openGame(page)
  await send(page, 'Goodbye soon')
  await expect(bubbles(page).nth(2)).toContainText('Reply 1')

  await fromMenu(page, 'Say goodbye')
  const dialog = page.getByRole('dialog', { name: 'Say goodbye to Socrates?' })
  await expect(dialog.getByRole('button', { name: 'Keep talking' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(menuButton(page)).toBeFocused()
  await expect(bubbles(page)).toHaveCount(3)
  await expect(menuButton(page)).toBeFocused()

  await sayGoodbye(page)
  const parting = page.getByRole('dialog', { name: 'Parting words from Socrates' })
  await expect(parting).toContainText('Carry your question gently; it is already half an answer.')
  await expect(parting).toContainText(IMAGINED)
  await expect(parting.getByRole('heading', { name: 'Parting words from Socrates' })).toBeFocused()
  // Keyboard focus stays inside the parting words.
  await page.keyboard.press('Tab')
  await expect(parting.getByRole('button', { name: 'Keep this' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(parting.getByRole('button', { name: 'Meet someone new' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(parting.getByRole('button', { name: 'Choose who is next' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(parting.getByRole('button', { name: 'Keep this' })).toBeFocused()
  expect(farewells[0].thinkerId).toBe('socrates')
  expect(farewells[0].conversationHistory).toContainEqual({ role: 'user', content: 'Goodbye soon' })

  await parting.getByRole('button', { name: 'Meet someone new' }).click()
  await expect(parting).toHaveCount(0)
  await expect(bubbles(page)).toHaveCount(1)
  await expect(bubbles(page)).not.toHaveText([SOCRATES_OPENING])
  await expect(input(page)).toBeFocused()
})

test('after a few exchanges, saying goodbye is one tap away without opening the menu', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await stubFarewell(page)
  await openGame(page)
  const quietGoodbye = page.getByRole('button', { name: 'Say goodbye to Socrates' })

  for (let i = 1; i <= 2; i++) {
    await send(page, `Thought ${i}`)
    await expect(bubbles(page).nth(i * 2)).toContainText(`Reply ${i}`)
  }
  await expect(quietGoodbye).toHaveCount(0)
  await send(page, 'Thought 3')
  await expect(bubbles(page).nth(6)).toContainText('Reply 3')
  await expect(quietGoodbye).toBeVisible()
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false')

  await quietGoodbye.click()
  const dialog = page.getByRole('dialog', { name: 'Say goodbye to Socrates?' })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(quietGoodbye).toBeFocused()

  await quietGoodbye.click()
  await dialog.getByRole('button', { name: 'Say goodbye' }).click()
  await expect(page.getByRole('dialog', { name: 'Parting words from Socrates' })).toContainText('Carry your question gently')
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
  await expect(page.getByRole('dialog', { name: 'Directory' })).toBeVisible()
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
    await fromMenu(page, 'Request')
    const form = page.getByRole('dialog', { name: 'Request a Thinker' })
    await form.getByLabel('Your email *').fill('ana@example.com')
    await form.getByLabel(/Who would you like to talk to/).fill(name)
    await form.getByLabel('Why this person?').fill('Their curiosity')
    await form.getByRole('button', { name: 'Submit Request' }).click()
    return form
  }

  test('is not offered while requests cannot be kept', async ({ page }) => {
    await setUpBrowser(page)
    await stubChat(page)
    await openGame(page)

    await menuButton(page).click()
    await expect(page.getByRole('button', { name: 'Choose who to talk with' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Request' })).toHaveCount(0)
  })

  test('a request that cannot be saved keeps the words and says so kindly', async ({ page }) => {
    await setUpBrowser(page)
    await offerRequests(page, true)
    await page.route('**/api/timeless-minds/request-thinker', route =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 503, json: { error: 'Requests are not being kept just now' } })
        : route.fallback()
    )
    await openGame(page)

    const form = await fillRequest(page, 'Carl Jung')
    await expect(form.getByText('Your request could not be sent just now.')).toBeVisible()
    await expect(form.getByLabel(/Who would you like to talk to/)).toHaveValue('Carl Jung')
    await expect(form.getByText(/not being kept/)).toHaveCount(0)

    await page.keyboard.press('Escape')
    await expect(form).toHaveCount(0)
    await expect(menuButton(page)).toBeFocused()
  })

  test('a request the rules turn down explains why', async ({ page }) => {
    await setUpBrowser(page)
    await offerRequests(page, true)
    await openGame(page)

    const form = await fillRequest(page, 'Elon Musk')
    await expect(form.getByText('Only deceased historical figures are allowed.', { exact: false })).toBeVisible()
    await expect(form).toContainText(IMAGINED)
    expect(await form.innerText()).not.toMatch(/\bAI\b/)
  })

  test('a name is optional, and a saved request says thank you without promising extras or closing on a timer', async ({ page }) => {
    await setUpBrowser(page)
    await offerRequests(page, true)
    const sent: Array<Record<string, string>> = []
    await page.route('**/api/timeless-minds/request-thinker', route => {
      if (route.request().method() !== 'POST') return route.fallback()
      sent.push(route.request().postDataJSON())
      return route.fulfill({ json: { success: true, requestId: 'req_1' } })
    })
    await openGame(page)

    await fillRequest(page, 'Carl Jung')
    const saved = page.getByRole('dialog', { name: 'Request saved' })
    await expect(saved).toBeVisible()
    expect(sent[0]).toMatchObject({ requesterName: '', requestedName: 'Carl Jung' })
    await expect(saved.getByRole('button', { name: 'Back to the conversation' })).toBeFocused()
    await expect(page.getByText(/Phone Book|bringing them to life/)).toHaveCount(0)

    await page.waitForTimeout(3500)
    await expect(saved).toBeVisible()
    await saved.getByRole('button', { name: 'Back to the conversation' }).click()
    await expect(saved).toHaveCount(0)
  })
})

test('"About these conversations" opens in the same tab, plain words first and the terms folded away', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  const link = page.getByRole('link', { name: 'About these conversations' })
  await expect(link).toHaveAttribute('href', '/games/ancient-voices/disclaimer')
  await expect(link).not.toHaveAttribute('target', '_blank')
  expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44)

  await link.click()
  await expect(page).toHaveURL(/\/games\/ancient-voices\/disclaimer$/)
  await expect(page).toHaveTitle(/^About these conversations/)
  await expect(page.getByRole('heading', { name: 'About these conversations', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Imagined conversations, not real quotes' })).toBeVisible()
  // The legal text waits behind a fold instead of greeting the visitor
  await expect(page.getByRole('heading', { name: '7. Limitation of Liability' })).toBeHidden()
  await page.getByText('The full terms').click()
  await expect(page.getByRole('heading', { name: '7. Limitation of Liability' })).toBeVisible()
  expect(await page.locator('main').innerText()).not.toMatch(/\bAI\b/)
  await expect(page.getByRole('link', { name: 'Back to The Sage' })).toHaveAttribute('href', '/games/ancient-voices')

  await page.getByRole('link', { name: 'Return to The Sage' }).click()
  await expect(page).toHaveURL(/\/games\/ancient-voices$/)
  await expect(chooser(page).getByRole('heading', { name: 'Who would you like to talk with?' })).toBeVisible()
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the opening choice fits on one screen, every offer and the surprise within reach', async ({ page }) => {
    await setUpBrowser(page)
    await page.goto('/games/ancient-voices')
    for (const button of await chooser(page).getByRole('button').all()) {
      await expect(button).toBeInViewport({ ratio: 1 })
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('the conversation and every control fit and work', async ({ page }) => {
    await setUpBrowser(page)
    await stubChat(page)
    await openGame(page)

    await expect(page.getByRole('button', { name: 'Start voice input' })).toBeInViewport()
    // The one menu names itself in visible words, not only an icon, and every control in it fits on screen.
    await expect(menuButton(page).getByText('Menu')).toBeVisible()
    await menuButton(page).click()
    for (const name of ['Choose who to talk with', 'Turn on thinker voice', 'Hide portrait', 'Kept lines', 'Say goodbye']) {
      await expect(page.getByRole('button', { name })).toBeInViewport({ ratio: 1 })
    }
    await menuButton(page).click()
    await expect(page.getByRole('button', { name: 'Say goodbye' })).toHaveCount(0)
    // Under 16px, phones zoom the page when the field is focused.
    expect(await input(page).evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)

    await page.getByRole('button', { name: 'How do I let go?' }).or(page.getByRole('button', { name: 'What is virtue?' })).click()
    await input(page).press('Enter')
    await expect(bubbles(page).nth(2)).toContainText('Reply 1')

    // Once talking, the portrait becomes a slim strip and the conversation gets the room
    const log = page.getByRole('log', { name: 'Conversation' })
    expect((await log.boundingBox())!.height).toBeGreaterThan(844 * 0.4)
    // The thinker is named once on screen; the chat heading is kept for screen readers only
    const heading = page.getByRole('heading', { name: /^Talking with / })
    await expect(heading).toBeAttached()
    expect(await heading.evaluate((el) => el.parentElement!.getBoundingClientRect().height)).toBeLessThanOrEqual(1)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

const CARE_REPLY = 'I am glad you told me. Please call or text 988 now.'

async function stubCaringChat(page: Page) {
  await stubChat(page)
  await page.route('**/api/timeless-minds/chat', async route => {
    if (!/without me/.test((route.request().postDataJSON() as ChatRequest).message)) return route.fallback()
    await route.fulfill({ json: { response: 'I am glad you told me. Please call or text **988** now.', emotion: 'concerned', care: true } })
  })
}

const support = (page: Page) => page.getByRole('complementary', { name: 'Support' })

test('when someone may be at risk, tappable support stays for the visit, the next step stays gentle, and suggestions soften', async ({ page }) => {
  await setUpBrowser(page)
  await stubCaringChat(page)
  const farewells = await stubFarewell(page)
  await openGame(page)
  await expect(page.getByRole('heading', { name: 'Continue your journey' })).toBeAttached()
  await expect(support(page)).toHaveCount(0)

  await send(page, 'Everyone would be fine without me')
  await expect(bubbles(page).nth(2)).toHaveText(CARE_REPLY)
  await expect(support(page)).toBeVisible()
  await expectStillCare(page)
  await expect(support(page).getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988')
  await expect(support(page).getByRole('link', { name: '116 123' })).toHaveAttribute('href', 'tel:116123')
  await expect(support(page).getByRole('link', { name: 'findahelpline.com' })).toHaveAttribute('href', 'https://findahelpline.com')
  await expect(page.getByRole('heading', { name: 'Something gentle, if it helps' })).toBeAttached()
  await expect(page.getByRole('heading', { name: 'Continue your journey' })).toHaveCount(0)

  // The support stays after the conversation moves on.
  await send(page, 'Thank you for listening')
  await expect(bubbles(page).nth(4)).toContainText('Reply 1')
  await expect(support(page)).toBeVisible()

  await fromMenu(page, 'Say goodbye')
  const confirm = page.getByRole('dialog', { name: 'Say goodbye to Socrates?' })
  await expect(confirm).not.toContainText('meet someone new')
  await confirm.getByRole('button', { name: 'Say goodbye' }).click()

  const parting = page.getByRole('dialog', { name: 'Parting words from Socrates' })
  await expect(parting.getByRole('complementary', { name: 'Support' })).toBeVisible()
  await expectStillCare(page)
  await expect(parting.getByRole('button', { name: 'Meet someone new' })).toHaveCount(0)
  // Care words are for now, not for a keepsake shelf.
  await expect(parting.getByRole('button', { name: 'Keep this' })).toHaveCount(0)
  expect(farewells).toHaveLength(0)

  await parting.getByRole('button', { name: 'Stay with Socrates' }).click()
  await expect(parting).toHaveCount(0)
  await expect(bubbles(page)).toHaveCount(5)
  await expect(input(page)).toBeFocused()

  // Anyone who arrives unchosen after this is calm company.
  await page.evaluate(() => { Math.random = () => 0 })
  await sayGoodbye(page)
  await page.getByRole('dialog', { name: 'Parting words from Socrates' }).getByRole('button', { name: 'Choose who is next' }).click()
  await page.keyboard.press('Escape')
  await expect(bubbles(page)).toHaveText([opening('buddha')])
  await expect(page.getByRole('button', { name: 'What helps you on a hard day?' })).toBeVisible()
  await expect(support(page)).toBeVisible()
})

test('replies reach screen readers once through a polite log, the page does not grab focus, and the idle status reads like a person', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await page.goto('/games/ancient-voices')
  await expect(page.locator('main [aria-live], main [role="alert"], main [role="status"]')).toHaveCount(0)
  await expect(page.locator('body')).toBeFocused()

  await answerChooser(page, 'Socrates')
  const log = page.getByRole('log', { name: 'Conversation' })
  await expect(log).toHaveAttribute('aria-live', 'polite')
  await expect(page.getByText('Here with you', { exact: true })).toBeVisible()
  await expect(page.getByText(/^Ready$/)).toHaveCount(0)
  await expect(page.getByText(/Listening/)).toHaveCount(0)
  // The only live region the game adds is the conversation itself.
  await expect(page.locator('main [aria-live], main [role="alert"], main [role="status"]')).toHaveCount(1)

  await send(page, 'Hello')
  await expect(log).toContainText('Reply 1: let us think about "Hello".')
})

test('a portrait is framed on the face, not the beard', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await chooseFirst(page, 'Socrates')
  await callFromPhoneBook(page, 'Leonardo da Vinci')

  const portrait = page.locator('img[src$="leonardo-da-vinci.png"]').first()
  await expect(portrait).toBeVisible()
  expect(await portrait.evaluate(img => getComputedStyle(img).objectPosition)).toBe('50% 22%')
})

async function axeViolations(page: Page) {
  await page.waitForTimeout(600)
  await page.addScriptTag({ content: AXE_SOURCE })
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe
    const result = await axe.run({ include: [['main']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
    return result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)
  })
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the call, its support panel and the directory have no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await setUpBrowser(page)
    await stubCaringChat(page)
    await openGame(page)
    await send(page, 'Everyone would be fine without me')
    await expect(support(page)).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
    await expectOneGo(page)

    await menuButton(page).click()
    expect(await axeViolations(page)).toEqual([])

    await fromMenu(page, 'Choose who to talk with')
    await expect(page.getByRole('dialog', { name: 'Directory' })).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
    await expectOneGo(page)
  })
}

test.describe('on a phone with the keyboard open', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the newest reply, the support and the message box all stay visible without overlapping', async ({ page }) => {
    await setUpBrowser(page)
    await stubCaringChat(page)
    await openGame(page)
    await send(page, 'Hello there')
    await expect(bubbles(page).nth(2)).toContainText('Reply 1')
    await send(page, 'Everyone would be fine without me')
    await expect(support(page)).toBeVisible()

    await input(page).focus()
    // An on-screen keyboard leaves roughly this much of a 390 by 844 phone.
    await page.setViewportSize({ width: 390, height: 450 })

    const reply = bubbles(page).last()
    await expect(reply).toHaveText(CARE_REPLY)
    await expect(input(page)).toBeInViewport()
    await expect(reply).toBeInViewport()
    await expect(support(page)).toBeInViewport()
    const replyBox = (await reply.boundingBox())!
    const supportBox = (await support(page).boundingBox())!
    const inputBox = (await input(page).boundingBox())!
    expect(replyBox.y + replyBox.height).toBeLessThanOrEqual(supportBox.y)
    expect(supportBox.y + supportBox.height).toBeLessThanOrEqual(inputBox.y)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('on a laptop screen with Larger text', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('regression: the floating buttons never sit on top of Send', async ({ page }) => {
    await setUpBrowser(page)
    await stubChat(page)
    await openGame(page)
    await page.evaluate(() => document.documentElement.setAttribute('data-text-size', 'larger'))
    await input(page).fill('Hello')

    const sendButton = page.getByRole('button', { name: 'Send message' })
    await sendButton.scrollIntoViewIfNeeded()
    const box = (await sendButton.boundingBox())!
    const hitIsSend = await page.evaluate(({ x, y }) => {
      const hit = document.elementFromPoint(x, y)
      return hit?.closest('button')?.getAttribute('aria-label') ?? hit?.tagName ?? null
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
    expect(hitIsSend).toBe('Send message')

    await sendButton.click({ trial: true })
    await sendButton.click()
    await expect(bubbles(page).nth(2)).toContainText('Reply 1')
    await expect(page.locator('#accessibility-panel')).not.toBeVisible()
  })
})

test('regression: closing the directory with Escape hands focus back to the Menu', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  await fromMenu(page, 'Choose who to talk with')
  await expect(page.getByRole('dialog', { name: 'Directory' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Directory' })).toHaveCount(0)
  await expect(menuButton(page)).toBeFocused()

  // Choosing someone still puts the player straight into the message box
  await callFromPhoneBook(page, 'Plato')
  await expect(input(page)).toBeFocused()
})

test.describe('on a phone, first load', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('regression: the first suggested question is shown whole, not scrolled half away', async ({ page }) => {
    await setUpBrowser(page)
    await stubChat(page)
    await openGame(page)
    const log = page.getByRole('log', { name: 'Conversation' })
    const first = log.getByText('Try asking about:')
    await expect(async () => {
      const logBox = (await log.boundingBox())!
      const firstBox = (await first.boundingBox())!
      expect(firstBox.y).toBeGreaterThanOrEqual(logBox.y)
      const firstSuggestion = (await log.locator('button').first().boundingBox())!
      expect(firstSuggestion.y).toBeGreaterThanOrEqual(logBox.y)
    }).toPass()
    // Regression: the log's own resize handling later scrolled the questions under the header
    await page.waitForTimeout(1000)
    expect(await log.evaluate((el) => el.scrollTop)).toBe(0)
  })
})

test('the one menu opens and closes from the keyboard, and Escape hands focus back to it', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await openGame(page)

  await menuButton(page).focus()
  await page.keyboard.press('Enter')
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Choose who to talk with' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Choose who to talk with' })).toHaveCount(0)
  await expect(menuButton(page)).toBeFocused()
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false')
})

test('parting words can be kept on a small shelf on this device, read again later, and let go one by one', async ({ page }) => {
  await setUpBrowser(page)
  await stubChat(page)
  await stubFarewell(page)
  await openGame(page)

  await fromMenu(page, 'Kept lines')
  const shelf = page.getByRole('dialog', { name: 'Kept lines' })
  await expect(shelf).toContainText('Nothing kept yet.')
  await shelf.getByRole('button', { name: 'Back to the conversation' }).click()
  await expect(menuButton(page)).toBeFocused()

  await sayGoodbye(page)
  const parting = page.getByRole('dialog', { name: 'Parting words from Socrates' })
  await parting.getByRole('button', { name: 'Keep this' }).click()
  await expect(parting.getByRole('button', { name: 'Kept' })).toHaveAttribute('aria-disabled', 'true')
  await expect(parting).toContainText('You can read it again from Kept lines in the menu.')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sage_keptLines') ?? '[]'))
  expect(saved).toEqual([expect.objectContaining({ text: 'Carry your question gently; it is already half an answer.', thinkerId: 'socrates', thinkerName: 'Socrates' })])
  await parting.getByRole('button', { name: 'Meet someone new' }).click()

  // A later visit still has the line.
  await page.reload()
  await answerChooser(page, 'Socrates')
  await fromMenu(page, 'Kept lines')
  await expect(shelf.getByRole('heading', { name: 'Kept lines' })).toBeFocused()
  await expect(shelf.locator('blockquote')).toHaveText(['Carry your question gently; it is already half an answer.'])
  await expect(shelf).toContainText('Socrates, kept')

  await shelf.getByRole('button', { name: 'Remove the line from Socrates' }).click()
  await expect(shelf).toContainText('Nothing kept yet.')
  await expect(shelf.getByRole('heading', { name: 'Kept lines' })).toBeFocused()
  expect(await page.evaluate(() => localStorage.getItem('sage_keptLines'))).toBeNull()
  await page.keyboard.press('Escape')
  await expect(shelf).toHaveCount(0)
  await expect(menuButton(page)).toBeFocused()
})

test('when this device will not save, keeping a line still works for the visit and says so kindly', async ({ page }) => {
  await setUpBrowser(page)
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('QuotaExceededError') }
  })
  await stubChat(page)
  await stubFarewell(page)
  await openGame(page)

  await sayGoodbye(page)
  const parting = page.getByRole('dialog', { name: 'Parting words from Socrates' })
  await parting.getByRole('button', { name: 'Keep this' }).click()
  await expect(parting).toContainText('Kept for this visit.')
  await parting.getByRole('button', { name: 'Meet someone new' }).click()
  await fromMenu(page, 'Kept lines')
  await expect(page.getByRole('dialog', { name: 'Kept lines' }).locator('blockquote')).toHaveCount(1)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the parting words and the kept lines shelf have no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await setUpBrowser(page)
    await stubChat(page)
    await stubFarewell(page)
    await openGame(page)

    await sayGoodbye(page)
    const parting = page.getByRole('dialog', { name: 'Parting words from Socrates' })
    await parting.getByRole('button', { name: 'Keep this' }).click()
    expect(await axeViolations(page)).toEqual([])
    await expectOneGo(page)
    await parting.getByRole('button', { name: 'Meet someone new' }).click()

    await fromMenu(page, 'Kept lines')
    await expect(page.getByRole('dialog', { name: 'Kept lines' }).locator('blockquote')).toHaveCount(1)
    expect(await axeViolations(page)).toEqual([])
    await expectOneGo(page)
  })
}
