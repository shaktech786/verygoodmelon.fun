import { test, expect, Page } from '@playwright/test'
import { availableNodes, chooseNode, newRun } from '@/lib/games/thought-pockets/engine/run'
import { endTurn, playCard } from '@/lib/games/thought-pockets/engine/battle'
import { BattleState, CardInstance, MapNode, RunState } from '@/types/thought-pockets'
import { playRun, planning } from '../lib/thought-pockets/bots'

/**
 * The Philosopher (Thought Pockets). Every test is seeded: either a fixed ?seed= or a run
 * state built with the real engine and placed in the saved-game slot, the same seam a reload uses.
 */

const URL = '/games/thought-pockets'
const RUN_KEY = 'thought-pockets-run'
const INSIGHT_KEY = 'thought-pockets-insights'

async function fresh(page: Page, seed: number, tutorialDone = false) {
  await page.goto(`${URL}?seed=${seed}`)
  await page.evaluate(
    ([runKey, insightKey, done]) => {
      localStorage.removeItem(runKey as string)
      localStorage.setItem(insightKey as string, JSON.stringify({ state: { beaten: [], finishedWith: [], tutorialDone: done }, version: 0 }))
    },
    [RUN_KEY, INSIGHT_KEY, tutorialDone],
  )
  await page.reload()
  await expect(page.getByTestId('screen-menu')).toBeVisible()
}

async function load(page: Page, run: RunState) {
  await page.goto(URL)
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [RUN_KEY, JSON.stringify({ state: { run }, version: 2 })],
  )
  await page.reload()
  await page.getByTestId('continue-run').click()
}

function inFirstBattle(seed: number, change: (battle: BattleState) => BattleState = (b) => b): RunState {
  const run = newRun('empiricist', seed)
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
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(30 - damage))
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
    const run = inFirstBattle(110, (b) => ({ ...b, player: { ...b.player, resolve: 1 } }))
    await fresh(page, 110, true)
    await load(page, { ...run, resolve: 1 })
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('screen-defeat')).toBeVisible()
    await page.getByTestId('new-run').click()
    await expect(page.getByTestId('continue-run')).toHaveCount(0)
    await page.getByTestId('school-skeptic').click()
    await expect(page.getByTestId('player-resolve')).toContainText('Resolve 50/50')
    await expect(page.getByTestId('open-deck')).toContainText('Deck 10 · Relics 0')
    await page.locator('button[data-available]').first().click()
    await expect(page.getByTestId('enemy-resolve')).toHaveText('30')
  })

  test('a full seeded run, played by the engine, is finished in the UI', async ({ page }) => {
    let finalTurn: RunState | null = null
    let seed = 1
    for (; seed < 60; seed++) {
      let lastBoss: RunState | null = null
      const record = playRun('rationalist', seed, { turn: planning, draft: 'archetype', careful: true }, (run) => {
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
    const insights = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state, INSIGHT_KEY)
    expect(insights.beaten).toContain('meaning_of_life')
    expect(insights.finishedWith).toContain('rationalist')
  })
})
