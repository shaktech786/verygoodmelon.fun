import { readFileSync } from 'fs'
import path from 'path'
import { test, expect, Page } from '@playwright/test'
import { RUN_VERSION, availableNodes, chooseNode, newRun } from '@/lib/games/thought-pockets/engine/run'
import { COMPOSURE_GUARD, KNOWN_UNSETTLE, endTurn, playCard } from '@/lib/games/thought-pockets/engine/battle'
import { CONCLUSION_TIMES, EMPIRICIST_EVIDENCE_TIMES, timesWord } from '@/lib/games/thought-pockets/data/conclusion'
import { MAX_RIGOR } from '@/lib/games/thought-pockets/data/pace'
import { TUTORIAL_ENEMY, getEnemyDef } from '@/lib/games/thought-pockets/data/enemies'
import { BattleState, CardInstance, MapNode, RunState, School } from '@/types/thought-pockets'
import { playRun, planning } from '../lib/thought-pockets/bots'

/**
 * The Philosopher (Thought Pockets). Every test is seeded: either a fixed ?seed= or a run
 * state built with the real engine and placed in the saved-game slot, the same seam a reload uses.
 */

const URL = '/games/thought-pockets'
const RUN_KEY = 'thought-pockets-run'
const INSIGHT_KEY = 'thought-pockets-insights'
const FIRST_FOE = getEnemyDef(TUTORIAL_ENEMY).health
const AXE = readFileSync(path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')

async function fresh(page: Page, seed: number, tutorialDone = false, beaten: string[] = [], rigorWon = 0) {
  await page.goto(`${URL}?seed=${seed}`)
  await page.evaluate(
    ({ runKey, insightKey, done, known, won }) => {
      localStorage.removeItem(runKey)
      localStorage.setItem(insightKey, JSON.stringify({ state: { beaten: known, finishedWith: [], tutorialDone: done, rigorWon: won }, version: 0 }))
    },
    { runKey: RUN_KEY, insightKey: INSIGHT_KEY, done: tutorialDone, known: beaten, won: rigorWon },
  )
  await page.reload()
  await expect(page.getByTestId('screen-menu')).toBeVisible()
}

async function load(page: Page, run: RunState | unknown, version = RUN_VERSION) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [RUN_KEY, JSON.stringify({ state: { run }, version })],
  )
  // The dev server can hold the full load event; the Continue button below is the real readiness signal.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByTestId('continue-run').click()
}

async function axeViolations(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
  await page.addScriptTag({ content: AXE })
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: unknown, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe
    const result = await axe.run({ include: [['main']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  })
}

function inFirstBattle(seed: number, change: (battle: BattleState) => BattleState = (b) => b, school: School = 'empiricist'): RunState {
  const run = newRun(school, seed)
  const started = chooseNode(run, availableNodes(run)[0].id)
  return { ...started, battle: change(started.battle as BattleState) }
}

function cards(ids: string[], from = 500): CardInstance[] {
  return ids.map((cardId, i) => ({ uid: from + i, cardId, upgraded: false }))
}

function standingBefore(run: RunState, type: MapNode['type']): { run: RunState; node: MapNode } {
  const node = run.map.find((n) => n.type === type) as MapNode
  const before = run.map.find((n) => n.next.includes(node.id)) as MapNode
  return { run: { ...run, position: before.id, visited: [before.id] }, node }
}

const hand = (page: Page) => page.getByTestId('hand').locator(':scope > button')

test.describe('The Philosopher', () => {
  test('first battle by mouse: the preview is exact and the argument lands as shown', async ({ page }) => {
    await fresh(page, 101)
    await page.getByTestId('school-empiricist').click()
    await page.locator('button[data-available]').first().click()
    await expect(page.getByTestId('enemy-name')).toHaveText('Jumping to Conclusions')
    await expect(page.getByTestId('hint')).toContainText('Evidence')

    const evidence = hand(page).filter({ hasText: 'Observation' }).first()
    await evidence.click()
    await expect(page.getByTestId('argument')).toContainText('1. Observation')
    const logic = hand(page).filter({ hasText: 'Therefore' }).first()
    await logic.click()
    const preview = Number(await page.getByTestId('damage-preview').innerText())
    expect(preview).toBeGreaterThan(0)
    const before = Number(await page.getByTestId('enemy-resolve').innerText())

    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(before - preview))
    await expect(page.getByTestId('last-round')).toContainText(`${preview} damage`)
  })

  test('keyboard only: one number key plays one card, U undoes, Enter does not end the turn, E does', async ({ page }) => {
    await fresh(page, 102)
    const school = page.getByTestId('school-pragmatist')
    for (let i = 0; i < 40 && !(await school.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    const node = page.locator('button[data-available]').first()
    for (let i = 0; i < 40 && !(await node.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('enemy-name')).toBeVisible()

    await page.keyboard.press('1')
    await expect(page.getByTestId('argument').locator('li')).toHaveCount(1)
    await expect(hand(page)).toHaveCount(4)
    await page.keyboard.press('u')
    await expect(hand(page)).toHaveCount(5)

    await page.keyboard.press('1')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('last-round')).toHaveCount(0)
    await expect(page.getByTestId('argument').locator('li')).toHaveCount(1)

    await page.keyboard.press('e')
    await expect(page.getByTestId('last-round')).toBeVisible()
  })

  test('enemy Guard absorbs the argument and is used up (regression: infinite block)', async ({ page }) => {
    const run = inFirstBattle(103, (b) => ({ ...b, enemy: { ...b.enemy, guard: 8 }, hand: cards(['observation', 'observation', 'therefore']), focus: 3 }))
    await fresh(page, 103, true)
    await load(page, run)
    await expect(page.getByTestId('enemy-guard')).toHaveText('Guard 8')
    for (let i = 0; i < 3; i++) await hand(page).first().click()
    await expect(page.getByTestId('equation')).toContainText('Its Guard absorbs 8')
    const damage = Number(await page.getByTestId('damage-preview').innerText())
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toContainText('Guard broken')
    await expect(page.getByTestId('enemy-guard')).toHaveCount(0)
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(FIRST_FOE - damage))
  })

  test('a normal fight ends with a card reward that grows the deck', async ({ page }) => {
    const run = inFirstBattle(104, (b) => ({ ...b, enemy: { ...b.enemy, health: 3 } }))
    await fresh(page, 104, true)
    await load(page, run)
    await hand(page).filter({ hasText: 'Evidence' }).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('screen-reward')).toBeVisible()
    await expect(page.getByTestId('card-choices').locator(':scope > button')).toHaveCount(3)
    await page.getByTestId('card-choices').locator(':scope > button').first().click()
    await expect(page.getByTestId('open-deck')).toContainText('Deck 11')
    await page.getByTestId('continue').click()
    await expect(page.getByTestId('screen-map')).toBeVisible()
  })

  test('the map only moves forward along a path (regression)', async ({ page }) => {
    const won = inFirstBattle(105, (b) => ({ ...b, enemy: { ...b.enemy, health: 1 } }))
    await fresh(page, 105, true)
    await load(page, won)
    await hand(page).filter({ hasText: 'Evidence' }).first().click()
    await page.getByTestId('end-turn').click()
    await page.getByTestId('continue').click()
    const current = won.map.find((n) => n.id === won.position) as MapNode
    const open = page.locator('button[data-available]')
    await expect(open).toHaveCount(current.next.length)
    await expect(page.locator('button[aria-label*="you are here"]')).toBeDisabled()
    await expect(page.locator('button[aria-label^="Step 3"]').first()).toBeDisabled()
  })

  test('shop: buying and removing exactly one copy', async ({ page }) => {
    const { run, node } = standingBefore(newRun('empiricist', 106), 'shop')
    await fresh(page, 106, true)
    await load(page, { ...run, gold: 300 })
    await page.locator(`button[data-available]`).and(page.getByTestId('node-shop')).first().click()
    await expect(page.getByTestId('screen-shop')).toBeVisible()
    expect(node.type).toBe('shop')
    await page.getByTestId('shop-cards').locator('button').first().click()
    await expect(page.getByTestId('open-deck')).toContainText('Deck 11')
    await page.getByTestId('shop-remove').click()
    await page.getByTestId('deck-picker').locator(':scope > button').first().click()
    await expect(page.getByTestId('open-deck')).toContainText('Deck 10')
    await expect(page.getByTestId('shop-remove')).toBeDisabled()
    await page.getByTestId('continue').click()
    await expect(page.getByTestId('screen-map')).toBeVisible()
  })

  test('rest: improving one card changes only that copy', async ({ page }) => {
    const { run } = standingBefore(newRun('empiricist', 107), 'rest')
    await fresh(page, 107, true)
    await load(page, run)
    await page.locator('button[data-available]').and(page.getByTestId('node-rest')).first().click()
    await page.getByTestId('rest-upgrade').click()
    await page.getByTestId('deck-picker').getByRole('button', { name: /Improve Observation/ }).first().click()
    await expect(page.getByTestId('screen-map')).toBeVisible()
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
    expect(saved.deck.filter((c) => c.cardId === 'observation' && c.upgraded)).toHaveLength(1)
  })

  test('encounter and treasure each resolve from the map', async ({ page }) => {
    const base = newRun('empiricist', 108)
    const event = standingBefore(base, 'event')
    await fresh(page, 108, true)
    await load(page, event.run)
    await page.locator('button[data-available]').and(page.getByTestId('node-event')).first().click()
    await expect(page.getByTestId('screen-event')).toBeVisible()
    const choice = page.locator('[data-testid^=choice-]:not([disabled]), button[aria-label^="Sit in the front row"]').first()
    await choice.click()
    if (await page.getByTestId('deck-picker').isVisible()) await page.getByTestId('deck-picker').locator(':scope > button').first().click()
    await page.getByTestId('continue').click()
    await expect(page.getByTestId('screen-map')).toBeVisible()

    const treasure = standingBefore(base, 'treasure')
    await load(page, treasure.run)
    await page.locator('button[data-available]').and(page.getByTestId('node-treasure')).first().click()
    await page.getByRole('button', { name: 'Take', exact: true }).first().click()
    await expect(page.getByTestId('open-deck')).toContainText('Relics 1')
    await page.getByTestId('continue').click()
    await expect(page.getByTestId('screen-map')).toBeVisible()
  })

  test('reload mid-battle resumes the same moment, then continue', async ({ page }) => {
    await fresh(page, 109, true)
    await page.getByTestId('school-rationalist').click()
    await page.locator('button[data-available]').first().click()
    await hand(page).first().click()
    const argument = await page.getByTestId('argument').locator('li').first().textContent()
    const handBefore = await hand(page).allTextContents()
    await page.reload()
    await expect(page.getByTestId('continue-run')).toBeVisible()
    await page.getByTestId('continue-run').click()
    await expect(page.getByTestId('argument').locator('li').first()).toHaveText(argument as string)
    expect(await hand(page).allTextContents()).toEqual(handBefore)
  })

  test('defeat leads to a clean new run', async ({ page }) => {
    const run = inFirstBattle(110, (b) => ({ ...b, player: { ...b.player, resolve: 1 }, focus: 0 }))
    await fresh(page, 110, true)
    await load(page, { ...run, resolve: 1 })
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('screen-defeat')).toBeVisible()
    await page.getByTestId('new-run').click()
    await expect(page.getByTestId('continue-run')).toHaveCount(0)
    await page.getByTestId('school-skeptic').click()
    await expect(page.getByTestId('player-resolve')).toContainText('Resolve 60/60')
    await expect(page.getByTestId('open-deck')).toContainText('Deck 10 · Relics 0')
    await page.locator('button[data-available]').first().click()
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(FIRST_FOE))
  })

  test('a lost argument can be reconsidered once, from its start, and survives a reload', async ({ page }) => {
    const overconfident = getEnemyDef('dunning_kruger')
    const run = inFirstBattle(111, (b) => ({
      ...b,
      player: { ...b.player, resolve: 1 },
      focus: 0,
      enemy: { ...b.enemy, id: overconfident.id, health: overconfident.health, maxHealth: overconfident.health },
    }))
    await fresh(page, 111, true)
    await load(page, { ...run, resolve: 1 })
    await page.getByTestId('end-turn').click()
    await expect(page.getByRole('heading', { name: 'That argument got away from you' })).toBeVisible()
    await page.reload()
    await page.getByTestId('continue-run').click()
    await page.getByTestId('reconsider').click()
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(overconfident.health))
    await expect(page.getByTestId('player-resolve')).toContainText('Resolve 1/60')
    await page.getByTestId('end-turn').click()
    await expect(page.getByRole('heading', { name: 'You ran out of Resolve' })).toBeVisible()
    await expect(page.getByTestId('reconsider')).toHaveCount(0)
  })

  test('rigorous pace is a ladder of levels, each stating its constraints, and shows on every opponent', async ({ page }) => {
    await fresh(page, 112, true, [], 2)
    await page.getByTestId('mode-rigorous').check()
    await expect(page.getByTestId('rigor-4')).toBeDisabled()
    await page.getByTestId('rigor-1').check()
    await expect(page.getByTestId('rigor-rules')).toContainText('Rests heal 30%')
    await expect(page.getByTestId('rigor-rules')).toContainText('restores 20 Resolve')
    await page.getByTestId('rigor-3').check()
    await expect(page.getByTestId('rigor-rules').locator('li')).toHaveCount(3)
    await page.getByTestId('school-empiricist').click()
    await expect(page.getByText('Rigorous 3', { exact: true })).toBeVisible()
    await page.locator('button[data-available]').first().click()
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(Math.round(FIRST_FOE * 1.25)))
    await expect(page.getByText('Attacks +2')).toBeVisible()
  })

  test('a bias beaten in an earlier run starts Unsettled, and a won fight says what it taught', async ({ page }) => {
    await fresh(page, 113, true, [TUTORIAL_ENEMY])
    await page.getByTestId('school-empiricist').click()
    await page.locator('button[data-available]').first().click()
    await expect(page.getByTestId('known')).toBeVisible()
    await expect(page.getByText(`Unsettled ${KNOWN_UNSETTLE}`, { exact: true })).toBeVisible()
    const won = inFirstBattle(113, (b) => ({ ...b, enemy: { ...b.enemy, health: 1 } }))
    await load(page, won)
    await hand(page).filter({ hasText: 'Evidence' }).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('insight')).toContainText(getEnemyDef(TUTORIAL_ENEMY).insight)
  })

  test('Rationalist: only the first Logic of the turn is marked free', async ({ page }) => {
    const run = inFirstBattle(114, (b) => ({ ...b, hand: cards(['therefore', 'modus_ponens', 'observation']) }), 'rationalist')
    await fresh(page, 114, true)
    await load(page, run)
    await expect(hand(page).filter({ hasText: 'Free as first Logic' })).toHaveCount(2)
    await hand(page).filter({ hasText: 'Therefore' }).click()
    await expect(hand(page).filter({ hasText: 'Free as first Logic' })).toHaveCount(0)
    await expect(page.getByTestId('focus')).toContainText('3 left')
  })

  test('on a phone the hand is on screen at the start of a fight, with no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await fresh(page, 115, true)
    await page.getByTestId('school-empiricist').click()
    await page.locator('button[data-available]').first().click()
    const intent = await page.getByTestId('intent').boundingBox()
    const last = await hand(page).last().boundingBox()
    const bar = await page.getByTestId('end-turn').boundingBox()
    expect(intent && intent.y >= 0).toBe(true)
    expect(last && bar && last.y + last.height <= bar.y + 2, 'the whole hand sits above the End turn bar').toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    for (const name of await hand(page).locator('span.font-serif').all()) {
      expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'card names fit').toBe(true)
    }
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`menu, map and battle have no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await fresh(page, 116)
      expect(await axeViolations(page)).toEqual([])
      await page.getByTestId('school-rationalist').click()
      expect(await axeViolations(page)).toEqual([])
      await page.locator('button[data-available]').first().click()
      await hand(page).first().click()
      expect(await axeViolations(page)).toEqual([])
      await page.getByTestId('end-turn').click()
      await page.getByTestId('skip-show').click()
      expect(await axeViolations(page)).toEqual([])
      await load(page, inFirstBattle(116, (b) => ({ ...b, enemy: { ...b.enemy, health: 1 } })))
      await hand(page).filter({ hasText: 'Evidence' }).first().click()
      await page.getByTestId('end-turn').click()
      await expect(page.getByTestId('screen-reward')).toBeVisible()
      expect(await axeViolations(page)).toEqual([])
    })
  }

  test('a full seeded run, played by the engine, is finished in the UI', async ({ page }) => {
    let finalTurn: RunState | null = null
    let seed = 1
    for (; seed < 60; seed++) {
      let lastBoss: RunState | null = null
      const record = playRun('rationalist', seed, { turn: planning, draft: 'archetype', habits: 'careful' }, (run) => {
        if (run.floor === 3 && run.battle?.enemy.id === 'meaning_of_life') lastBoss = run
      })
      if (record.won && lastBoss) {
        finalTurn = lastBoss
        break
      }
    }
    expect(finalTurn).not.toBeNull()
    const start = finalTurn as RunState
    const battle = start.battle as BattleState

    // find an order of cards that wins this last turn
    const options = battle.hand
    let winning: number[] | null = null
    for (let mask = 0; mask < 1 << options.length && !winning; mask++) {
      const chosen = options.filter((_, i) => mask & (1 << i))
      for (const last of chosen.length ? chosen : [null]) {
        const order = last ? [...chosen.filter((c) => c !== last), last] : []
        let state = battle
        for (const c of order) state = playCard(state, c.uid)
        if (state.played.length === order.length && endTurn(state).outcome === 'won') {
          winning = order.map((c) => c.uid)
          break
        }
      }
    }
    expect(winning, `seed ${seed}`).not.toBeNull()

    await fresh(page, seed, true)
    await load(page, start)
    await expect(page.getByTestId('enemy-name')).toHaveText('The Meaning of Life')
    let current = battle.hand.map((c) => c.uid)
    for (const uid of winning as number[]) {
      await hand(page).nth(current.indexOf(uid)).click()
      current = current.filter((u) => u !== uid)
    }
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('screen-reward')).toBeVisible()
    await page.getByTestId('continue').click()
    await expect(page.getByTestId('screen-victory')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Every question answered, for now' })).toBeVisible()
    await expect(page.getByTestId('celebration')).toBeVisible()
    await expect(page.getByTestId('run-summary')).toContainText('Best argument')
    await expect(page.getByTestId('run-insights')).toContainText(getEnemyDef('meaning_of_life').insight)
    const insights = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state, INSIGHT_KEY)
    expect(insights.beaten).toContain('meaning_of_life')
    expect(insights.finishedWith).toContain('rationalist')
  })
  test('a bias Unsettle finishes falls before it acts: you win with your Resolve and the next fight starts normally (regression: won at 0)', async ({ page }) => {
    const run = inFirstBattle(120, (b) => ({ ...b, player: { ...b.player, resolve: 1 }, enemy: { ...b.enemy, health: 5, unsettle: 5 }, hand: cards(['caveat']), focus: 0 }))
    await fresh(page, 120, true)
    await load(page, { ...run, resolve: 1 })
    await expect(page.getByTestId('incoming')).toContainText('Unsettle 5, will end this before it acts')
    await expect(page.getByTestId('lethal-warning')).toHaveCount(0)
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('screen-reward')).toBeVisible()
    await expect(page.getByTestId('player-resolve')).toContainText('Resolve 1/60')
    await page.getByTestId('continue').click()
    await page.locator('button[data-available]').and(page.getByTestId('node-battle')).first().click()
    await expect(page.getByTestId('screen-battle')).toBeVisible()
  })

  test('a Guard card as the Conclusion says it has nothing to double', async ({ page }) => {
    const run = inFirstBattle(121, (b) => ({ ...b, hand: cards(['observation', 'caveat']) }))
    await fresh(page, 121, true)
    await load(page, run)
    await hand(page).filter({ hasText: 'Observation' }).click()
    await hand(page).filter({ hasText: 'Caveat' }).click()
    await expect(page.getByTestId('empty-conclusion')).toBeVisible()
    const steps = page.getByLabel('Cards in your argument, in order')
    await expect(steps).toContainText('Conclusion: nothing to double')
    await expect(steps).not.toContainText('counts twice')
  })

  test('keyboard: Enter on a card plays it and focus moves to the next card, then to End turn when the hand is empty', async ({ page }) => {
    const run = inFirstBattle(122, (b) => ({ ...b, hand: cards(['anecdote', 'anecdote']), focus: 3 }))
    await fresh(page, 122, true)
    await load(page, run)
    await hand(page).first().focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('argument').locator('li')).toHaveCount(1)
    await expect(hand(page).first()).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('end-turn')).toBeFocused()
  })

  test('screen reader: each play and each round is announced, with the new intent, and the map reads where paths lead', async ({ page }) => {
    await fresh(page, 123, true)
    await page.getByTestId('school-empiricist').click()
    await expect(page.getByTestId('node-battle').first()).toHaveAttribute('aria-label', /leads to/)
    await expect(page.locator('[data-testid^=node-][aria-label*="further along your path"]').first()).toBeVisible()
    await page.locator('button[data-available]').first().click()
    await page.keyboard.press('1')
    await expect(page.getByTestId('announcer')).toContainText(/added\. Weight \d+ × [\d.]+ = \d+ damage/)
    await page.keyboard.press('e')
    await expect(page.getByTestId('announcer')).toContainText('Next, it will:')
    await expect(page.getByTestId('announcer')).toContainText('Your argument dealt')
  })

  test('the round replays card by card, can be skipped with S, and shows the same steps with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const run = inFirstBattle(124, (b) => ({ ...b, hand: cards(['observation', 'therefore']) }))
    await fresh(page, 124, true)
    await load(page, run)
    await hand(page).first().click()
    await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'playing')
    await page.keyboard.press('s')
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'done')
    await expect(page.getByTestId('last-round')).toContainText('Weight 4 × Multiplier 2 = 8')
    await expect(page.getByTestId('last-round')).toContainText('8 damage')
    await expect(page.getByTestId('last-round')).toContainText('It attacked for')
  })

  test("Gambler's Fallacy shows its real odds and both outcomes", async ({ page }) => {
    const base = newRun('empiricist', 125)
    const started = chooseNode(base, availableNodes(base)[0].id)
    const battle = { ...(started.battle as BattleState), enemy: { ...(started.battle as BattleState).enemy, id: 'gamblers_fallacy', health: 68, maxHealth: 68, misses: 3 }, focus: 0, hand: [] }
    await fresh(page, 125, true)
    await load(page, { ...started, battle })
    await expect(page.getByTestId('intent')).toContainText('1 in 4: Attack 22')
    await expect(page.getByTestId('incoming')).toContainText('If its gamble comes off, you lose')
    await expect(page.getByTestId('gamble-streak')).toContainText('The odds are still 1 in 4')
  })

  test('a philosophical problem says in advance how it will change at half Resolve', async ({ page }) => {
    const base = newRun('empiricist', 126)
    const started = chooseNode(base, availableNodes(base)[0].id)
    const def = getEnemyDef('problem_of_induction')
    const battle = { ...(started.battle as BattleState), enemy: { ...(started.battle as BattleState).enemy, id: def.id, health: def.health, maxHealth: def.health } }
    await fresh(page, 126, true)
    await load(page, { ...started, battle })
    await expect(page.getByTestId('phase-warning')).toContainText(`At half Resolve (${Math.floor(def.health / 2)}) it changes`)
  })

  test('rest can let a card go, and the shop sells a pot of tea', async ({ page }) => {
    const { run } = standingBefore(newRun('empiricist', 127), 'rest')
    await fresh(page, 127, true)
    await load(page, run)
    await page.locator('button[data-available]').and(page.getByTestId('node-rest')).first().click()
    await page.getByTestId('rest-remove').click()
    await page.getByTestId('deck-picker').locator(':scope > button').first().click()
    await expect(page.getByTestId('open-deck')).toContainText('Deck 9')
    const shop = standingBefore(newRun('empiricist', 128), 'shop')
    await load(page, { ...shop.run, gold: 100, resolve: 30 })
    await page.locator('button[data-available]').and(page.getByTestId('node-shop')).first().click()
    await page.getByTestId('shop-tea').click()
    await expect(page.getByTestId('player-resolve')).toContainText('Resolve 45/60')
    await expect(page.getByTestId('shop-tea')).toBeDisabled()
  })

  test('the Conclusion is described with the count the engine uses: three times for an Empiricist’s Evidence, twice otherwise', async ({ page }) => {
    await fresh(page, 130)
    await load(page, inFirstBattle(130, (b) => ({ ...b, turn: 2 })))
    await expect(page.getByTestId('hint')).toContainText(`Evidence Conclusion counts ${timesWord(EMPIRICIST_EVIDENCE_TIMES)}`)
    await page.getByRole('button', { name: 'How to play' }).click()
    const help = page.getByRole('dialog')
    await expect(help).toContainText(`an Evidence Conclusion counts ${timesWord(EMPIRICIST_EVIDENCE_TIMES)}`)
    await expect(help).toContainText(`counts ${timesWord(CONCLUSION_TIMES)}`)
    await help.getByRole('button', { name: 'Close' }).click()
    await load(page, inFirstBattle(130, (b) => ({ ...b, turn: 2 }), 'skeptic'))
    await expect(page.getByTestId('hint')).not.toContainText(timesWord(EMPIRICIST_EVIDENCE_TIMES))
    await page.getByRole('button', { name: 'How to play' }).click()
    await expect(page.getByRole('dialog')).not.toContainText(timesWord(EMPIRICIST_EVIDENCE_TIMES))
  })

  test('the replay shows a Conclusion as a product, not a sum: ×3 → 12 Weight', async ({ page }) => {
    const run = inFirstBattle(131, (b) => ({ ...b, hand: cards(['therefore', 'observation']) }))
    await fresh(page, 131, true)
    await load(page, run)
    await hand(page).filter({ hasText: 'Therefore' }).click()
    await hand(page).filter({ hasText: 'Observation' }).click()
    await expect(page.getByLabel('Cards in your argument, in order')).toContainText('+4 Weight ×3 → 12 Weight')
    await page.getByTestId('end-turn').click()
    await page.getByTestId('skip-show').click()
    await expect(page.getByTestId('last-round').getByTestId('conclusion-count')).toHaveText('Conclusion ×3 → 12 Weight')
    await expect(page.getByTestId('last-round')).not.toContainText('= +')
  })

  test('before any card is played, the preview says the Guard comes from unspent Focus', async ({ page }) => {
    await fresh(page, 132, true)
    await page.getByTestId('school-empiricist').click()
    await page.locator('button[data-available]').first().click()
    const attack = getEnemyDef(TUTORIAL_ENEMY).moves[0].attack as number
    await expect(page.getByTestId('incoming')).toHaveText(`If you play nothing, your 3 unspent Focus become ${3 * COMPOSURE_GUARD} Guard and block all ${attack}.`)
    await hand(page).filter({ hasText: 'Observation' }).first().click()
    await expect(page.getByTestId('incoming')).toContainText(`${2 * COMPOSURE_GUARD} of it from 2 unspent Focus`)
  })

  test('keyboard: after E ends the turn, focus lands on the first card of the new hand, not the page', async ({ page }) => {
    await fresh(page, 133, true)
    await load(page, inFirstBattle(133))
    await page.keyboard.press('1')
    await page.keyboard.press('e')
    await expect(page.getByTestId('last-round')).toBeVisible()
    await expect(hand(page).first()).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('argument').locator('li')).toHaveCount(1)
  })

  test('the map shows which bias waits at each fight, and lists them with their rules', async ({ page }) => {
    await fresh(page, 134, true)
    await page.getByTestId('school-empiricist').click()
    const run = newRun('empiricist', 134)
    const fights = run.map.filter((n) => n.type === 'battle' || n.type === 'elite')
    await expect(page.getByTestId('node-bias')).toHaveCount(fights.length)
    await expect(page.locator('button[data-available]').first()).toHaveAttribute('aria-label', new RegExp(`Fight: ${getEnemyDef(TUTORIAL_ENEMY).name}`))
    for (const node of fights) await expect(page.getByTestId('floor-biases')).toContainText(getEnemyDef(node.enemyId as string).ruleText)
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })

  test('Rigorous 6 and 7: a hard fight states its second rule, and a rest no longer heals', async ({ page }) => {
    await fresh(page, 135, true, [], MAX_RIGOR - 1)
    await page.getByTestId('mode-rigorous').check()
    await page.getByTestId(`rigor-${MAX_RIGOR}`).check()
    await expect(page.getByTestId('rigor-rules').locator('li')).toHaveCount(MAX_RIGOR)
    const six = newRun('empiricist', 135, 'rigorous', [], 6)
    const elite = standingBefore(six, 'elite')
    await load(page, elite.run)
    await page.locator('button[data-available]').and(page.getByTestId('node-elite')).first().click()
    const second = getEnemyDef(elite.node.enemyId as string).secondRule
    await expect(page.getByTestId('enemy-rule')).toContainText(second?.ruleText as string)
    const rest = standingBefore(newRun('empiricist', 135, 'rigorous', [], MAX_RIGOR), 'rest')
    await load(page, { ...rest.run, resolve: 20 })
    await page.locator('button[data-available]').and(page.getByTestId('node-rest')).first().click()
    await expect(page.getByTestId('rest-heal')).toBeDisabled()
    await expect(page.getByTestId('rest-upgrade')).toBeEnabled()
  })

  test('reward cards say which school they belong to, so other schools’ cards are an informed choice', async ({ page }) => {
    const won = inFirstBattle(136, (b) => ({ ...b, enemy: { ...b.enemy, health: 1 } }))
    await fresh(page, 136, true)
    await load(page, won)
    await hand(page).filter({ hasText: 'Evidence' }).first().click()
    await page.getByTestId('end-turn').click()
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
    await load(page, { ...saved, reward: { ...(saved.reward as NonNullable<RunState['reward']>), cardChoices: ['statistic', 'reductio', 'anecdote'] } })
    const choices = page.getByTestId('card-choices')
    await expect(choices.getByTestId('card-school')).toHaveText(['Empiricist', 'Rationalist · Rare'])
    await expect(choices.getByRole('button', { name: 'Take Reductio' })).toBeEnabled()
  })

  test('a run saved by version 4 still loads mid-battle and plays on', async ({ page }) => {
    const saved = JSON.parse(readFileSync(path.join(process.cwd(), '__tests__/lib/thought-pockets/fixtures/run-v4.json'), 'utf8'))
    await fresh(page, 137, true)
    await load(page, saved.state.run, saved.version)
    await expect(page.getByTestId('screen-battle')).toBeVisible()
    await expect(page.getByTestId('argument').locator('li')).toHaveCount(saved.state.run.battle.played.length)
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toBeVisible()
  })

  test('a run saved by the previous version still loads and plays on', async ({ page }) => {
    const saved = JSON.parse(readFileSync(path.join(process.cwd(), '__tests__/lib/thought-pockets/fixtures/run-v3.json'), 'utf8'))
    await fresh(page, 129, true)
    await load(page, saved.state.run, saved.version)
    await expect(page.getByTestId('screen-battle')).toBeVisible()
    await expect(page.getByTestId('argument').locator('li')).toHaveCount(saved.state.run.battle.played.length)
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toBeVisible()
  })
})
