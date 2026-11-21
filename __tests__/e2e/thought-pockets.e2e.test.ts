import { readFileSync } from 'fs'
import path from 'path'
import { test, expect, Page } from '@playwright/test'
import { availableNodes, chooseNode, newRun } from '@/lib/games/thought-pockets/engine/run'
import { endTurn, playCard } from '@/lib/games/thought-pockets/engine/battle'
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

async function fresh(page: Page, seed: number, tutorialDone = false, beaten: string[] = []) {
  await page.goto(`${URL}?seed=${seed}`)
  await page.evaluate(
    ({ runKey, insightKey, done, known }) => {
      localStorage.removeItem(runKey)
      localStorage.setItem(insightKey, JSON.stringify({ state: { beaten: known, finishedWith: [], tutorialDone: done }, version: 0 }))
    },
    { runKey: RUN_KEY, insightKey: INSIGHT_KEY, done: tutorialDone, known: beaten },
  )
  await page.reload()
  await expect(page.getByTestId('screen-menu')).toBeVisible()
}

async function load(page: Page, run: RunState) {
  await page.goto(URL)
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [RUN_KEY, JSON.stringify({ state: { run }, version: 3 })],
  )
  await page.reload()
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
    const run = inFirstBattle(111, (b) => ({ ...b, player: { ...b.player, resolve: 1 }, focus: 0 }))
    await fresh(page, 111, true)
    await load(page, { ...run, resolve: 1 })
    await page.getByTestId('end-turn').click()
    await expect(page.getByRole('heading', { name: 'That argument got away from you' })).toBeVisible()
    await page.reload()
    await page.getByTestId('continue-run').click()
    await page.getByTestId('reconsider').click()
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(FIRST_FOE))
    await expect(page.getByTestId('player-resolve')).toContainText('Resolve 1/60')
    const playable = page.getByTestId('hand').locator(':scope > button:not([aria-disabled])')
    while ((await playable.count()) > 0) await playable.first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByRole('heading', { name: 'You ran out of Resolve' })).toBeVisible()
    await expect(page.getByTestId('reconsider')).toHaveCount(0)
  })

  test('rigorous pace is chosen before the run and shows on every opponent', async ({ page }) => {
    await fresh(page, 112, true)
    await page.getByTestId('mode-rigorous').check()
    await page.getByTestId('school-empiricist').click()
    await expect(page.getByText('Rigorous', { exact: true })).toBeVisible()
    await page.locator('button[data-available]').first().click()
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(Math.round(FIRST_FOE * 1.25)))
    await expect(page.getByText('Attacks +2')).toBeVisible()
  })

  test('a bias beaten in an earlier run starts Unsettled, and a won fight says what it taught', async ({ page }) => {
    await fresh(page, 113, true, [TUTORIAL_ENEMY])
    await page.getByTestId('school-empiricist').click()
    await page.locator('button[data-available]').first().click()
    await expect(page.getByTestId('known')).toBeVisible()
    await expect(page.getByText('Unsettled 2', { exact: true })).toBeVisible()
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
    const card = await hand(page).first().boundingBox()
    const bar = await page.getByTestId('end-turn').boundingBox()
    expect(card && bar && card.y + card.height / 2 < bar.y).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
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
    const insights = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state, INSIGHT_KEY)
    expect(insights.beaten).toContain('meaning_of_life')
    expect(insights.finishedWith).toContain('rationalist')
  })
})
