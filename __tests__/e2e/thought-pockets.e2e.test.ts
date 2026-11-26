import { readFileSync } from 'fs'
import path from 'path'
import { test, expect, Page } from '@playwright/test'
import { RULE_BENDING_CHOICES, RUN_VERSION, START_RESOLVE, availableNodes, bossOptions, chooseNode, newRun } from '@/lib/games/thought-pockets/engine/run'
import { COMPOSURE_GUARD, KNOWN_UNSETTLE, endTurn, incomingDamage, playCard } from '@/lib/games/thought-pockets/engine/battle'
import { TEA_HEAL, TEA_PRICE, shopPrice } from '@/lib/games/thought-pockets/engine/economy'
import { CONCLUSION_TIMES, EMPIRICIST_EVIDENCE_TIMES, timesWord } from '@/lib/games/thought-pockets/data/conclusion'
import { MAX_RIGOR, TIRING } from '@/lib/games/thought-pockets/data/pace'
import { walkArgumentText } from '@/lib/games/thought-pockets/data/walkArgument'
import { releaseWords } from '@/lib/games/thought-pockets/data/turnText'
import { ARROW_MIN, BURIDAN_GUARD, OPENERS, OVERFLOW, OVERFLOW_TEXT, SORITES_CAP, TUTORIAL_ENEMY, fullRuleText, getEnemyDef, ruleTextAt } from '@/lib/games/thought-pockets/data/enemies'
import { SCHOOLS, schoolDifficulty } from '@/lib/games/thought-pockets/data/schools'
import { BattleState, CardInstance, MapNode, Mode, RunState, School } from '@/types/thought-pockets'
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
  // A first-timer's menu folds the full choices away; these tests drive them directly.
  if (!tutorialDone && rigorWon === 0) await page.getByText('More choices').click()
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

async function axeViolations(page: Page, settle = true) {
  if (settle) await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
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

/** The first fight of a walk started from the menu by a player past the first-fight hints: the seed draws it. */
function drawnOpener(seed: number, mode: Mode = 'gentle', rigor?: number): BattleState {
  const run = newRun('empiricist', seed, mode, [], rigor, 'long', false)
  return chooseNode(run, availableNodes(run)[0].id).battle as BattleState
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
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(before - preview), { timeout: 10_000 })
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
    const name = await page.getByTestId('enemy-name').innerText()
    const opener = OPENERS.map(getEnemyDef).find((e) => e.name === name)
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(opener?.health))
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
    await expect(page.getByTestId('player-resolve')).toContainText(`Resolve ${START_RESOLVE / 2}/${START_RESOLVE}`)
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
    const battle = saved.battle as BattleState
    await load(page, { ...saved, battle: { ...battle, player: { ...battle.player, resolve: 1 }, focus: 0 } })
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
    const opener = drawnOpener(112, 'rigorous', 3)
    expect(opener.enemy.maxHealth).toBe(Math.round(getEnemyDef(opener.enemy.id).health * 1.25))
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(opener.enemy.maxHealth))
    await expect(page.getByText(`Attacks +${opener.enemy.strength}`)).toBeVisible()
  })

  test('a bias beaten in an earlier run starts Unsettled, and a won fight says what it taught', async ({ page }) => {
    await fresh(page, 113, true, [drawnOpener(113).enemy.id])
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
      let lastBoss = null as RunState | null
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
    await expect(page.getByTestId('run-summary')).toContainText('Strongest moment')
    await expect(page.getByTestId('run-summary')).toContainText(new RegExp(`Biases named.*${getEnemyDef('meaning_of_life').name}`))
    await expect(page.getByTestId('run-summary')).not.toContainText(/\d+ (?:places?|arguments?|turns?|damage)\b/)
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

  test('a Guard card as the Conclusion says it has nothing to count, with the count the school gives', async ({ page }) => {
    const run = inFirstBattle(121, (b) => ({ ...b, hand: cards(['observation', 'caveat']) }))
    await fresh(page, 121, true)
    await load(page, run)
    await hand(page).filter({ hasText: 'Observation' }).click()
    await hand(page).filter({ hasText: 'Caveat' }).click()
    await expect(page.getByTestId('empty-conclusion')).toBeVisible()
    const steps = page.getByLabel('Cards in your argument, in order')
    await expect(steps).toContainText(`Conclusion: nothing to count ${timesWord(CONCLUSION_TIMES)}`)
    await expect(page.getByTestId('empty-conclusion')).toContainText(`nothing to count ${timesWord(CONCLUSION_TIMES)}`)
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

  test('the round replays card by card and can be skipped with S; with reduced motion it is one still frame at once', async ({ page }) => {
    const run = inFirstBattle(124, (b) => ({ ...b, hand: cards(['observation', 'therefore']) }))
    await fresh(page, 124, true)
    await load(page, run)
    await hand(page).first().click()
    await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'playing')
    await page.keyboard.press('s')
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'done')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await load(page, run)
    await hand(page).first().click()
    await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'done', { timeout: 300 })
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

  test('a purse too light for anything in the shop gets a kind line, not a warning', async ({ page }) => {
    const shop = standingBefore(newRun('empiricist', 128), 'shop')
    await fresh(page, 128, true)
    await load(page, { ...shop.run, gold: 100 })
    await page.locator('button[data-available]').and(page.getByTestId('node-shop')).first().click()
    await expect(page.getByTestId('shop-purse')).toContainText('You will not afford everything.')
    await load(page, { ...shop.run, gold: 1 })
    await page.locator('button[data-available]').and(page.getByTestId('node-shop')).first().click()
    await expect(page.getByTestId('shop-purse')).toContainText('Nothing here fits your purse today')
    await expect(page.getByTestId('shop-purse')).not.toContainText('afford')
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
    const run = newRun('empiricist', 134, 'gentle', [], undefined, 'long', false)
    const fights = run.map.filter((n) => n.type === 'battle' || n.type === 'elite')
    await expect(page.getByTestId('node-bias')).toHaveCount(fights.length)
    await expect(page.locator('button[data-available]').first()).toHaveAttribute('aria-label', new RegExp(`Fight: ${getEnemyDef(TUTORIAL_ENEMY).name}`))
    for (const node of fights) await expect(page.getByTestId('floor-biases')).toContainText(ruleTextAt(getEnemyDef(node.enemyId as string), 0))
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })

  test('Rigorous 6 and 7: a hard fight states its second rule, a rest no longer heals, and the map says so before a hard fight', async ({ page }) => {
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
    await load(page, standingBefore(newRun('empiricist', 135, 'rigorous', [], MAX_RIGOR), 'elite').run)
    await expect(page.getByTestId('hard-fight-note')).toContainText('rests do not restore Resolve')
    await load(page, elite.run)
    await expect(page.getByTestId('hard-fight-note')).toHaveCount(0)
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
  test('no hidden turn limit: at turn 40 with full Resolve the fight goes on, the turn is shown, and the tiring rule is stated', async ({ page }) => {
    const run = inFirstBattle(140, (b) => ({ ...b, turn: 40, enemy: { ...b.enemy, health: 400, maxHealth: 400 }, player: { ...b.player, resolve: 60 }, hand: cards(['caveat']), focus: 3 }))
    await fresh(page, 140, true)
    await load(page, run)
    await expect(page.getByTestId('turn')).toHaveText('Turn 40')
    await expect(page.getByTestId('tiring')).toContainText('tiring')
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('screen-battle')).toBeVisible()
    await expect(page.getByTestId('turn')).toHaveText('Turn 41')
    await page.getByRole('button', { name: 'How to play' }).click()
    await expect(page.getByRole('dialog')).toContainText(`From turn ${TIRING.gentle} in Gentle pace`)
    await expect(page.getByRole('dialog')).toContainText(OVERFLOW_TEXT)
  })

  test('a defeat names what took the last Resolve', async ({ page }) => {
    const base = newRun('empiricist', 141, 'rigorous', [], 1)
    const started = chooseNode(base, availableNodes(base)[0].id)
    const battle = started.battle as BattleState
    await fresh(page, 141, true)
    await load(page, { ...started, resolve: 3, battle: { ...battle, player: { ...battle.player, resolve: 3 }, hand: [], focus: 0 } })
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('screen-defeat')).toBeVisible()
    const attack = getEnemyDef(TUTORIAL_ENEMY).moves[0].attack as number
    await expect(page.getByTestId('defeat-cause')).toHaveText(`${getEnemyDef(TUTORIAL_ENEMY).name} attacked for ${attack}. All ${attack} got through and took the last of your Resolve.`)
  })

  test('on a phone, a losing End turn says so on the button itself, and the intent stays on screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const run = inFirstBattle(142, (b) => ({ ...b, player: { ...b.player, resolve: 2 }, hand: cards(['observation', 'observation', 'observation']), focus: 3 }))
    await fresh(page, 142, true)
    await load(page, { ...run, resolve: 2 })
    await hand(page).first().click()
    await hand(page).first().click()
    await hand(page).first().click()
    const end = page.getByTestId('end-turn')
    await expect(end).toContainText('you fall')
    await expect(end).toHaveAttribute('data-danger', 'certain')
    await expect(end).toHaveAccessibleName(/That is all your Resolve/)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const compact = page.getByTestId('intent-compact')
    await expect(compact).toBeInViewport()
    await expect(compact).toContainText(`You lose ${getEnemyDef(TUTORIAL_ENEMY).moves[0].attack}`)
  })

  test('damage steps are listed in the order the engine applies them: Guard, then the cap, then the half-Resolve line', async ({ page }) => {
    const def = getEnemyDef('sorites')
    const half = Math.floor(def.health / 2)
    const run = inFirstBattle(143, (b) => ({
      ...b,
      enemy: { ...b.enemy, id: def.id, health: half + 10, maxHealth: def.health, guard: 3, phase: 1 as const, moveIndex: 0 },
      hand: cards(['observation', 'smoking_gun']),
      focus: 4,
    }))
    await fresh(page, 143, true)
    await load(page, run)
    await hand(page).filter({ hasText: 'Observation' }).click()
    await hand(page).filter({ hasText: 'Smoking Gun' }).click()
    const steps = page.getByTestId('equation').getByTestId('chain-step')
    await expect(steps).toHaveCount(3)
    await expect(steps.nth(0)).toContainText('Its Guard absorbs 3')
    await expect(steps.nth(1)).toContainText(`Capped at ${SORITES_CAP}`)
    await expect(steps.nth(1)).toContainText(`shakes it: Shaken +${OVERFLOW.max}`)
    await expect(steps.nth(2)).toContainText(`It stops at ${half} and changes. Your extra ${SORITES_CAP - 10} is lost (at most ${OVERFLOW.max} Shaken a round)`)
    await expect(page.getByTestId('damage-preview')).toHaveText('10')
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('enemy-rule')).toHaveText(def.ruleText)
    await page.getByTestId('skip-show').click()
    await expect(page.getByTestId('last-round').getByTestId('show-chain').locator('li')).toHaveCount(3)
    await expect(page.getByTestId('enemy-rule')).toHaveText(def.phase2?.ruleText as string)
  })

  test("the new problems state their rules from the engine: Buridan's Ass counts the cards left in your hand", async ({ page }) => {
    const def = getEnemyDef('buridans_ass')
    const run = inFirstBattle(144, (b) => ({ ...b, enemy: { ...b.enemy, id: def.id, health: def.health, maxHealth: def.health }, hand: cards(['observation', 'caveat', 'caveat']), focus: 3 }))
    await fresh(page, 144, true)
    await load(page, run)
    await expect(page.getByTestId('enemy-rule')).toHaveText(def.ruleText)
    await expect(page.getByTestId('phase-warning')).toContainText(def.phase2?.ruleText as string)
    await hand(page).filter({ hasText: 'Observation' }).click()
    await expect(page.getByTestId('rule-guard')).toHaveText(`2 cards left in your hand: it gains ${2 * BURIDAN_GUARD} Guard`)
    await hand(page).filter({ hasText: 'Caveat' }).first().click()
    await expect(page.getByTestId('rule-guard')).toHaveText(`1 card left in your hand: it gains ${BURIDAN_GUARD} Guard`)
  })

  test('a new screen starts at the top with focus on its heading or first choice, clear of the site header', async ({ page }) => {
    await fresh(page, 145, true)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.getByTestId('school-empiricist').click()
    const first = page.locator('button[data-available]').first()
    await expect(first).toBeFocused()
    const header = await page.getByRole('banner').boundingBox()
    const node = await first.boundingBox()
    expect(header && node && node.y >= header.y + header.height, 'the first node is clear of the header').toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('enemy-name')).toBeFocused()
    const panel = await page.getByRole('region', { name: 'Opponent' }).boundingBox()
    const after = await page.getByRole('banner').boundingBox()
    expect(after && panel && panel.y >= after.y + after.height, 'the opponent panel is below the sticky header').toBe(true)
  })

  test('a run saved by version 5 still loads mid-battle and plays on', async ({ page }) => {
    const saved = JSON.parse(readFileSync(path.join(process.cwd(), '__tests__/lib/thought-pockets/fixtures/run-v5.json'), 'utf8'))
    await fresh(page, 146, true)
    await load(page, saved.state.run, saved.version)
    await expect(page.getByTestId('screen-battle')).toBeVisible()
    await expect(page.getByTestId('argument').locator('li')).toHaveCount(saved.state.run.battle.played.length)
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toBeVisible()
  })

  test('a first-timer is offered the Short walk by default; it ends at the floor-1 problem with its own victory, and the Long walk is one choice away', async ({ page }) => {
    await fresh(page, 150, true)
    await expect(page.getByTestId('length-short')).toBeChecked()
    await expect(page.getByTestId('lengths')).toContainText('recommended for a first run')
    await page.getByTestId('school-empiricist').click()
    await expect(page.getByText('Short walk', { exact: true })).toBeVisible()
    const run = newRun('empiricist', 150, 'gentle', [], undefined, 'short')
    const boss = run.map.find((n) => n.type === 'boss') as MapNode
    const rest = run.map.find((n) => n.next.includes(boss.id)) as MapNode
    const started = chooseNode({ ...run, position: rest.id, visited: [rest.id] }, boss.id)
    const battle = started.battle as BattleState
    await load(page, { ...started, battle: { ...battle, enemy: { ...battle.enemy, health: 1, phase: 2 as const }, hand: cards(['observation']), focus: 3 } })
    await hand(page).filter({ hasText: 'Evidence' }).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('screen-reward')).toBeVisible()
    await expect(page.getByTestId('card-choices')).toHaveCount(0)
    await expect(page.getByTestId('pause-note')).toHaveCount(0)
    await page.getByTestId('continue').click()
    await expect(page.getByRole('heading', { name: 'A short walk, well taken' })).toBeVisible()
    await expect(page.getByTestId('short-victory')).toContainText(getEnemyDef(boss.enemyId as string).name)
    await expect(page.getByTestId('run-summary')).toContainText('Short walk')
    expect(await axeViolations(page)).toEqual([])
    await page.getByTestId('take-long').click()
    await expect(page.getByTestId('player-resolve')).toContainText(`Resolve ${START_RESOLVE}/${START_RESOLVE}`)
    await expect(page.getByText('Early in the walk', { exact: true })).toBeVisible()
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
    expect(saved.length).toBe('long')
  })

  test('a first-timer sees one clear way in, with walk length, pace and school folded under More choices', async ({ page }) => {
    await page.goto(`${URL}?seed=171`)
    await page.evaluate((keys) => keys.forEach((key) => localStorage.removeItem(key)), [RUN_KEY, INSIGHT_KEY])
    await page.reload()
    const begin = page.getByRole('button', { name: 'Begin a short, gentle walk' })
    await expect(begin).toBeVisible()
    await expect(page.getByTestId('school-empiricist')).toBeHidden()
    await expect(page.getByTestId('insights')).toHaveCount(0)
    const more = page.getByText('More choices')
    await more.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('length-short')).toBeChecked()
    await expect(page.getByTestId('mode-gentle')).toBeChecked()
    await expect(page.getByTestId('school-pragmatist')).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
    await begin.click()
    await expect(page.getByTestId('screen-map')).toBeVisible()
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
    expect([saved.school, saved.mode, saved.length]).toEqual(['empiricist', 'gentle', 'short'])
  })

  test('a returning player keeps the full menu: length, pace, schools and insights, with no first-walk shortcut', async ({ page }) => {
    await fresh(page, 172, true)
    await expect(page.getByTestId('first-walk')).toHaveCount(0)
    await expect(page.getByTestId('more-choices')).toHaveCount(0)
    await expect(page.getByTestId('lengths')).toBeVisible()
    await expect(page.getByTestId('mode-gentle')).toBeVisible()
    await expect(page.getByTestId('school-skeptic')).toBeVisible()
    await expect(page.getByTestId('insights')).toBeVisible()
  })

  test('after a finished run the Long walk is the default, and school difficulty is shown for the chosen pace', async ({ page }) => {
    await page.goto(URL)
    await page.evaluate((key) => {
      localStorage.removeItem('thought-pockets-run')
      localStorage.setItem(key, JSON.stringify({ state: { beaten: [], finishedWith: ['empiricist'], tutorialDone: true, rigorWon: 1 }, version: 0 }))
    }, INSIGHT_KEY)
    await page.reload()
    await expect(page.getByTestId('length-long')).toBeChecked()
    const labels = page.getByTestId('school-difficulty')
    await expect(labels.nth(3)).toContainText(schoolDifficulty(SCHOOLS[3], 'gentle', 0))
    await page.getByTestId('mode-rigorous').check()
    for (const level of [1, 2]) {
      await page.getByTestId(`rigor-${level}`).check()
      for (let i = 0; i < SCHOOLS.length; i++) await expect(labels.nth(i)).toContainText(`Rigorous ${level}: ${schoolDifficulty(SCHOOLS[i], 'rigorous', level)}`)
    }
    await expect(page.getByTestId('rigor-levels')).toContainText('on the Long walk')
  })

  test("Gentle Zeno's Arrow lets smaller arguments through, and End turn names what stops an argument", async ({ page }) => {
    const def = getEnemyDef('zenos_arrow')
    const run = inFirstBattle(151, (b) => ({ ...b, enemy: { ...b.enemy, id: def.id, health: def.health, maxHealth: def.health }, hand: cards(['anecdote', 'observation']), focus: 3 }), 'skeptic')
    await fresh(page, 151, true)
    await load(page, run)
    await expect(page.getByTestId('enemy-rule')).toContainText(`less than ${ARROW_MIN.gentle} damage`)
    await hand(page).filter({ hasText: 'Anecdote' }).click()
    await hand(page).filter({ hasText: 'Observation' }).click()
    await expect(page.getByTestId('end-turn')).toContainText('Argue for 10')
    const rigorous = { ...run, mode: 'rigorous' as const, rigor: 1, battle: { ...(run.battle as BattleState), rigor: 1 } }
    await load(page, rigorous)
    await hand(page).filter({ hasText: 'Anecdote' }).click()
    await hand(page).filter({ hasText: 'Observation' }).click()
    await expect(page.getByTestId('end-turn')).toContainText(`Argue for 10 → 0 (under ${ARROW_MIN.rigorous})`)
    await expect(page.getByTestId('end-turn')).toHaveAccessibleName(new RegExp(`Argue for 10 → 0 \\(under ${ARROW_MIN.rigorous}\\)`))
  })

  test('the half-Resolve warning says the extra becomes Unsettle, at the one rate', async ({ page }) => {
    const def = getEnemyDef('problem_of_induction')
    const run = inFirstBattle(152, (b) => ({ ...b, enemy: { ...b.enemy, id: def.id, health: def.health, maxHealth: def.health } }))
    await fresh(page, 152, true)
    await load(page, run)
    await expect(page.getByTestId('phase-warning')).toContainText(OVERFLOW_TEXT)
  })

  test('the map warns before a fight you would enter with too little Resolve, and Gentle puts a rest before the problem', async ({ page }) => {
    const base = newRun('empiricist', 905)
    const boss = base.map.find((n) => n.type === 'boss') as MapNode
    const rest = base.map.find((n) => n.next.includes(boss.id)) as MapNode
    expect(rest.type).toBe('rest')
    const ready = { ...base, position: rest.id, visited: [rest.id], resolve: 6 }
    const attack = incomingDamage(chooseNode(ready, boss.id).battle as BattleState, 0).total
    await fresh(page, 153, true)
    await load(page, ready)
    await expect(page.getByTestId('fight-warning')).toContainText(`with 6 Resolve`)
    if (attack > 0) await expect(page.getByTestId('fight-warning')).toContainText(`an attack of ${attack}`)
    await expect(page.getByTestId('node-boss')).toHaveAttribute('aria-label', /You would face .* with 6 Resolve/)
    expect(await axeViolations(page)).toEqual([])
  })

  test('with The Long View, the held-Focus line says what the relic carries forward', async ({ page }) => {
    const run = inFirstBattle(154, (b) => ({ ...b, relics: ['long_view'], hand: cards(['caveat']), focus: 4 }))
    await fresh(page, 154, true)
    await load(page, { ...run, relics: ['long_view'] })
    await expect(page.getByTestId('incoming')).toContainText('your 2 unspent Focus become 4 Guard (The Long View carries 2 more to next turn)')
  })

  test('a run saved by version 6 loads as a Long walk mid-battle and plays on', async ({ page }) => {
    const saved = JSON.parse(readFileSync(path.join(process.cwd(), '__tests__/lib/thought-pockets/fixtures/run-v6.json'), 'utf8'))
    await fresh(page, 155, true)
    await load(page, saved.state.run, saved.version)
    await expect(page.getByTestId('screen-battle')).toBeVisible()
    await expect(page.getByText('Early in the walk', { exact: true })).toBeVisible()
    await expect(page.getByTestId('argument').locator('li')).toHaveCount(saved.state.run.battle.played.length)
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toBeVisible()
  })

  test('the low-Resolve warning names only what the next step offers: no rest that is not there, and tea only at its real price when affordable', async ({ page }) => {
    const base = newRun('empiricist', 160)
    const start = base.map.find((n) => n.row === 0) as MapNode
    const types: MapNode['type'][] = ['battle', 'event', 'shop']
    const rows = base.map.filter((n) => n.row === 1)
    const map = base.map.map((n) => (n.row === 1 ? { ...n, type: types[n.lane], enemyId: types[n.lane] === 'battle' ? 'sunk_cost' : undefined } : n.id === start.id ? { ...n, next: rows.map((r) => r.id) } : n))
    const facing = { ...base, map, position: start.id, visited: [start.id], resolve: 8 }
    await fresh(page, 160, true)
    await load(page, { ...facing, gold: 5 })
    await expect(page.getByTestId('fight-warning')).toBeVisible()
    await expect(page.getByTestId('recovery')).not.toContainText('rest restores')
    await expect(page.getByTestId('recovery')).not.toContainText('tea')
    await expect(page.getByTestId('recovery')).toContainText('Nothing on your next step restores Resolve')
    const price = shopPrice(TEA_PRICE, 1, [])
    await load(page, { ...facing, gold: price })
    await expect(page.getByTestId('recovery')).toHaveText(`On your next step, the shop’s tea (${price} gold) restores ${TEA_HEAL}.`)
  })

  test('with no cards played after a round, the coming Unsettle is still forecast in the intent and on End turn', async ({ page }) => {
    const run = inFirstBattle(161, (b) => ({ ...b, turn: 2, enemy: { ...b.enemy, unsettle: 4 }, hand: cards(['caveat']), focus: 3 }))
    await fresh(page, 161, true)
    await load(page, run)
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toBeVisible()
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
    const tick = (saved.battle as BattleState).enemy.unsettle
    expect(tick).toBeGreaterThan(0)
    await expect(page.getByTestId('before-it-acts')).toHaveText(`Before it acts, Unsettle takes ${tick} of its Resolve.`)
    await expect(page.getByTestId('end-turn')).toContainText(`· Unsettle ${tick}`)
  })

  test('from Rigorous 6 the map lists every rule each bias plays by', async ({ page }) => {
    const six = newRun('empiricist', 162, 'rigorous', [], 6)
    await fresh(page, 162, true, [], 5)
    await load(page, six)
    const elite = six.map.find((n) => n.type === 'elite') as MapNode
    const def = getEnemyDef(elite.enemyId as string)
    await expect(page.getByTestId('floor-biases')).toContainText(fullRuleText(def, 6))
    await expect(page.getByTestId('floor-biases')).toContainText(def.secondRule?.ruleText as string)
  })

  test('the equation says its total once, and a Guard card as Conclusion is a quiet note, not an alarm', async ({ page }) => {
    const run = inFirstBattle(163, (b) => ({ ...b, hand: cards(['caveat', 'caveat']), focus: 3 }))
    await fresh(page, 163, true)
    await load(page, run)
    await hand(page).first().click()
    const spoken = await page.getByTestId('equation').evaluate((el) => {
      const parts: string[] = []
      const walk = (node: Node) => {
        if (node instanceof HTMLElement && node.getAttribute('aria-hidden') === 'true') return
        if (node.nodeType === Node.TEXT_NODE) parts.push(node.textContent ?? '')
        node.childNodes.forEach(walk)
      }
      walk(el)
      return parts.join('').replace(/\s+/g, ' ')
    })
    expect(spoken).toContain('= 0 damage')
    expect(spoken.match(/damage/g)).toHaveLength(1)
    const chip = page.getByTestId('empty-conclusion').locator('..')
    await expect(chip).toBeVisible()
    const accent = await page.getByTestId('end-turn').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(await chip.evaluate((el) => getComputedStyle(el).borderTopColor)).not.toBe(accent)
    await expect(chip).not.toHaveClass(/tp-warn/)
  })

  test('a problem stopped at a line banks Shaken in a meter, and when it changes the replay shows it landing at once', async ({ page }) => {
    const def = getEnemyDef('problem_of_induction')
    const half = Math.floor(def.health / 2)
    const run = inFirstBattle(164, (b) => ({
      ...b,
      enemy: { ...b.enemy, id: def.id, health: half + 6, maxHealth: def.health, shaken: 5, phase: 1 as const, moveIndex: 1 },
      hand: cards(['smoking_gun']),
      focus: 3,
    }))
    await fresh(page, 164, true)
    await load(page, run)
    await expect(page.getByTestId('shaken')).toContainText('Shaken 5')
    await hand(page).first().click()
    await expect(page.getByTestId('before-it-acts')).toContainText('its Shaken')
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('release')).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('region', { name: 'Opponent' }).locator('svg[data-mood="gives"]')).toBeVisible()
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
    const report = (saved.battle as BattleState).lastRound as NonNullable<BattleState['lastRound']>
    expect(report.released).toBeGreaterThan(5)
    await expect(page.getByTestId('release')).toContainText(`Shaken ${report.released}: ${releaseWords(report.released)}`)
    await expect(page.getByTestId('enemy-resolve')).toHaveText(String(half - report.released))
  })

  test('the replay counts Weight up card by card, then steps the Multiplier, then counts the total', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const run = inFirstBattle(165, (b) => ({ ...b, hand: cards(['therefore', 'observation', 'observation']), focus: 3 }))
    await fresh(page, 165, true)
    await load(page, run)
    for (let i = 0; i < 3; i++) await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    const tally = page.getByTestId('last-round').getByTestId('tally')
    await expect(tally).toBeVisible()
    await expect(tally.getByTestId('tally-total')).toBeHidden()
    await expect(tally.getByTestId('tally-total')).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'done', { timeout: 5000 })
    await expect(tally).toHaveText(/Weight \d+ × Multiplier [\d.]+ = \d+/)
    expect(errors).toEqual([])
  })

  test('at a floor’s end you choose which problem to face, each shown with its rule, and a Short walk’s problem says it holds nothing back', async ({ page }) => {
    const run = newRun('empiricist', 166, 'gentle', [], undefined, 'short')
    const { run: ready } = standingBefore(run, 'boss')
    await fresh(page, 166, true)
    await load(page, ready)
    const choice = page.getByTestId('boss-choice')
    await expect(choice).toBeVisible()
    const options = bossOptions(ready)
    expect(options).toHaveLength(2)
    for (const id of options) {
      await expect(choice).toContainText(ruleTextAt(getEnemyDef(id), 0))
      await expect(choice.getByTestId(`face-${id}`)).toBeVisible()
    }
    await expect(choice).toContainText('holds nothing back')
    await choice.getByTestId(`face-${options[1]}`).click()
    await expect(page.getByTestId('enemy-name')).toHaveText(getEnemyDef(options[1]).name)
    await expect(page.getByTestId('holds-nothing-back')).toBeAttached()
  })

  test('on a phone, at a problem’s first turn, the whole hand and End turn are in view, and the rule folds to one line with More', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const run = newRun('empiricist', 701, 'gentle', [], undefined, 'short')
    const { run: ready } = standingBefore(run, 'boss')
    await fresh(page, 701, true)
    await load(page, ready)
    const problem = bossOptions(ready)[0]
    await page.getByTestId(`face-${problem}`).click()
    await expect(page.getByTestId('enemy-name')).toHaveText(getEnemyDef(problem).name)
    for (const card of await hand(page).all()) await expect(card).toBeInViewport({ ratio: 1 })
    await expect(page.getByTestId('end-turn')).toBeInViewport({ ratio: 1 })
    const more = page.getByTestId('rule-more')
    await expect(more).toHaveAttribute('aria-expanded', 'false')
    const folded = (await page.getByTestId('rule-block').boundingBox())?.height ?? 0
    await more.click()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    expect((await page.getByTestId('rule-block').boundingBox())?.height ?? 0).toBeGreaterThan(folded)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })

  test('a problem’s reward offers rule-bending relics, and offered cards say what they fit in your deck', async ({ page }) => {
    const run = newRun('pragmatist', 167)
    const { run: ready, node } = standingBefore(run, 'boss')
    const started = chooseNode({ ...ready, deck: [...ready.deck, ...cards(['cash_value'], 800)] }, node.id)
    const battle = started.battle as BattleState
    await fresh(page, 167, true)
    await load(page, { ...started, battle: { ...battle, enemy: { ...battle.enemy, health: 1, phase: 2 as const }, hand: cards(['observation']), focus: 3 } })
    await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('rule-bending-note')).toBeVisible()
    await expect(page.getByText('Relic · bends a rule')).toHaveCount(RULE_BENDING_CHOICES)
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
    await load(page, { ...saved, reward: { ...(saved.reward as NonNullable<RunState['reward']>), cardChoices: ['burden_of_proof', 'statistic', 'smoking_gun'], cardTaken: false } })
    await expect(page.getByTestId('card-choices').getByTestId('card-fits')).toHaveText(['Fits your Cash Value'])
    await expect(page.getByRole('button', { name: /Take Burden of Proof\. Fits your Cash Value/ })).toBeVisible()
  })

  test('the Short walk’s last reward names the problem, and the walk ends with its best argument, copied as text only on request', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const run = newRun('empiricist', 168, 'gentle', [], undefined, 'short')
    const { run: ready, node } = standingBefore(run, 'boss')
    const problem = getEnemyDef(bossOptions(ready)[1])
    const started = chooseNode(ready, node.id, problem.id)
    const battle = started.battle as BattleState
    await fresh(page, 168, true)
    await load(page, { ...started, battle: { ...battle, enemy: { ...battle.enemy, health: 1, phase: 2 as const }, hand: cards(['therefore', 'observation']), focus: 3 } })
    await hand(page).first().click()
    await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByRole('heading', { name: `${problem.name} lets you go, for now` })).toBeVisible()
    await page.getByTestId('continue').click()
    const card = page.getByTestId('walk-argument')
    await expect(card).toBeVisible()
    await expect(card).toContainText(`Against ${problem.name}`)
    await page.getByTestId('copy-argument').click()
    await expect(page.getByTestId('copy-status')).toContainText('Copied')
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied.replace(/\r\n/g, '\n')).toBe(walkArgumentText(saved))
  })

  test('while a round replays, the opponent shows what it was doing until it does it, and the replay never grows', async ({ page }) => {
    const run = inFirstBattle(171, (b) => ({ ...b, enemy: { ...b.enemy, moveIndex: 1 }, hand: cards(['observation', 'therefore', 'observation']), focus: 3 }))
    const battle = run.battle as BattleState
    const now = getEnemyDef(battle.enemy.id).moves[1]
    const next = getEnemyDef(battle.enemy.id).moves[2]
    await fresh(page, 171, true)
    await load(page, run)
    for (let i = 0; i < 3; i++) await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    const replay = page.getByTestId('last-round')
    await expect(replay).toHaveAttribute('data-show', 'playing')
    const early = (await replay.boundingBox())?.height ?? 0
    const handTop = (await hand(page).first().boundingBox())?.y ?? 0
    await expect(page.getByTestId('intent-move')).toHaveText(`Guard ${now.guard}`)
    await expect(page.getByTestId('enemy-guard')).toHaveCount(0)
    await expect(replay).toHaveAttribute('data-show', 'done', { timeout: 6000 })
    await expect(page.getByTestId('enemy-guard')).toHaveText(`Guard ${now.guard}`)
    await expect(page.getByTestId('intent-move')).toHaveText(`Attack ${next.attack}`)
    expect((await replay.boundingBox())?.height ?? 0).toBeCloseTo(early, 0)
    expect((await hand(page).first().boundingBox())?.y ?? 0).toBeCloseTo(handTop, 0)
  })

  test('a hit makes the bias recoil and crack, the crack stays, and with reduced motion it is a still cracked frame', async ({ page }) => {
    const run = inFirstBattle(172, (b) => ({ ...b, hand: cards(['observation', 'therefore', 'observation']), focus: 3 }))
    await fresh(page, 172, true)
    await load(page, run)
    for (let i = 0; i < 3; i++) await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    const portrait = page.getByTestId('portrait')
    await expect(portrait.locator('.tp-recoil')).toBeAttached({ timeout: 8000 })
    await expect(portrait.locator('[data-impact]')).toBeAttached()
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'done', { timeout: 6000 })
    await expect(portrait.locator('.tp-recoil')).toHaveCount(0)
    await expect(portrait.getByTestId('cracks')).toHaveAttribute('data-cracks', /[1-3]/)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await load(page, run)
    for (let i = 0; i < 3; i++) await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'done', { timeout: 300 })
    await expect(portrait.locator('.tp-recoil')).toHaveCount(0)
    await expect(portrait.getByTestId('cracks')).toHaveAttribute('data-cracks', /[1-3]/)
    expect(await portrait.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
  })

  test('the winning hit breaks the bias on the reward screen and adds it to those named on this walk; with reduced motion it is broken at once', async ({ page }) => {
    const won = inFirstBattle(173, (b) => ({ ...b, enemy: { ...b.enemy, health: 1 }, hand: cards(['observation', 'observation']), focus: 3 }))
    const foe = getEnemyDef(won.battle?.enemy.id as string)
    await fresh(page, 173, true)
    await load(page, won)
    for (let i = 0; i < 2; i++) await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    const insight = page.getByTestId('insight')
    await expect(insight).toContainText(foe.insight)
    await expect(insight).not.toHaveAttribute('data-broken')
    await expect(insight.locator('.tp-break')).toBeAttached({ timeout: 6000 })
    await expect(insight.getByTestId('cracks')).toHaveAttribute('data-cracks', '3')
    await expect(page.getByTestId('named-so-far')).toContainText('Named on this walk')
    await expect(page.getByRole('list', { name: 'Biases named on this walk' }).getByRole('listitem')).toHaveText(foe.name)
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'done', { timeout: 6000 })
    await expect(insight.locator('.tp-break')).toHaveCount(0)
    await expect(insight).toHaveAttribute('data-broken', 'true')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await load(page, won)
    for (let i = 0; i < 2; i++) await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    await expect(insight).toHaveAttribute('data-broken', 'true', { timeout: 300 })
    await expect(insight.getByTestId('cracks')).toHaveAttribute('data-cracks', '3')
    expect(await page.getByTestId('screen-reward').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
  })

  test('a played card arrives in the argument and the numbers it changes tick, said once to a screen reader; with reduced motion nothing moves', async ({ page }) => {
    const run = inFirstBattle(174, (b) => ({ ...b, hand: cards(['observation', 'therefore', 'caveat']), focus: 3 }))
    await fresh(page, 174, true)
    await load(page, run)
    await hand(page).first().click()
    const step = page.getByTestId('argument-step').first()
    await expect(step).toHaveClass(/tp-arrive/)
    await expect(page.getByTestId('damage-preview')).toHaveClass(/tp-tick/)
    const announcer = page.getByTestId('announcer')
    await expect(announcer).toContainText(/^Observation added\. Weight \d+ × [\d.]+ = \d+ damage\./)
    expect((await announcer.textContent())?.match(/added/g)).toHaveLength(1)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await load(page, run)
    await hand(page).first().focus()
    await hand(page).first().press('Enter')
    await expect(page.getByTestId('argument-step')).toHaveCount(1)
    await hand(page).first().focus()
    const focused = await hand(page).first().evaluate((el) => getComputedStyle(el).transform)
    expect(focused).toBe('none')
    expect(await page.getByTestId('argument').evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
  })

  test('on a phone the first-fight hint, the whole hand and End turn are in view together, with room to spare', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const run = inFirstBattle(173, (b) => ({ ...b, turn: 2, enemy: { ...b.enemy, moveIndex: 1 }, lastRound: null }))
    await fresh(page, 173)
    await load(page, run)
    const hint = page.getByTestId('hint')
    await expect(hint).toContainText('Finish with your strongest card')
    await expect(hint).toBeInViewport({ ratio: 1 })
    for (const card of await hand(page).all()) await expect(card).toBeInViewport({ ratio: 1 })
    await expect(page.getByTestId('end-turn')).toBeInViewport({ ratio: 1 })
    const slack = 50
    expect(((await hint.boundingBox())?.y ?? 0) - slack, 'the hint would still fit with taller fonts').toBeGreaterThanOrEqual(0)
    const dock = (await page.getByTestId('hand-dock').boundingBox())?.height ?? 0
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBottom)).toBe(`${Math.round(dock)}px`)
    const top = await page.evaluate(() => window.scrollY)
    await hand(page).filter({ hasText: 'Evidence' }).first().click()
    await expect(page.getByTestId('equation')).toBeVisible()
    expect(await page.evaluate(() => window.scrollY), 'playing a pinned card does not scroll the page').toBe(top)
  })

  test('the map says a fight you passed is behind you, not off your path', async ({ page }) => {
    const run = newRun('empiricist', 174)
    const first = availableNodes(run)[0]
    const second = availableNodes({ ...run, position: first.id, visited: [first.id] })[0]
    await fresh(page, 174, true)
    await load(page, { ...run, position: second.id, visited: [first.id, second.id], screen: 'map' })
    const list = page.getByTestId('floor-biases')
    await expect(list.locator('li').first()).toContainText('Behind you.')
    await expect(list.locator('li').first()).not.toContainText('Not on your path.')
  })

  test('a fight Unsettle finishes is introduced as Unsettle’s, not as an argument you did not make', async ({ page }) => {
    const run = inFirstBattle(175, (b) => ({ ...b, enemy: { ...b.enemy, health: 2, unsettle: 6 }, focus: 0 }))
    await fresh(page, 175, true)
    await load(page, run)
    await page.getByTestId('end-turn').click()
    const final = page.getByTestId('final-argument')
    await expect(final).toContainText('Unsettle had the last word')
    await expect(final).not.toContainText('Your winning argument')
    await expect(final.getByTestId('no-argument')).toHaveText('You made no argument this round: Unsettle 2 took the last of its Resolve.')
  })

  test('a run saved by version 7 loads mid-battle and plays on', async ({ page }) => {
    const saved = JSON.parse(readFileSync(path.join(process.cwd(), '__tests__/lib/thought-pockets/fixtures/run-v7.json'), 'utf8'))
    await fresh(page, 169, true)
    await load(page, saved.state.run, saved.version)
    await expect(page.getByTestId('screen-battle')).toBeVisible()
    await expect(page.getByTestId('argument').locator('li')).toHaveCount(saved.state.run.battle.played.length)
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toBeVisible()
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the boss choice, a problem's reward and the argument of the walk have no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      const run = newRun('pragmatist', 170)
      const { run: ready, node } = standingBefore(run, 'boss')
      await fresh(page, 170, true)
      await load(page, ready)
      await expect(page.getByTestId('boss-choice')).toBeVisible()
      expect(await axeViolations(page)).toEqual([])
      const started = chooseNode(ready, node.id)
      const battle = started.battle as BattleState
      await load(page, { ...started, battle: { ...battle, enemy: { ...battle.enemy, health: 1, phase: 2 as const, shaken: 4 }, hand: cards(['observation']), focus: 3 } })
      expect(await axeViolations(page)).toEqual([])
      await hand(page).first().click()
      await page.getByTestId('end-turn').click()
      await expect(page.getByTestId('rule-bending-note')).toBeVisible()
      const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
      await load(page, { ...saved, reward: { ...(saved.reward as NonNullable<RunState['reward']>), cardChoices: ['burden_of_proof', 'statistic', 'smoking_gun'], cardTaken: false } })
      expect(await axeViolations(page)).toEqual([])
      const last = { source: 'boss' as const, gold: 0, cardChoices: [], cardTaken: true, relicChoices: [], relicTaken: true, finalRound: null }
      await load(page, { ...saved, floor: 3, length: 'long', screen: 'reward', reward: last })
      await page.getByTestId('continue').click()
      await expect(page.getByTestId('walk-argument')).toBeVisible()
      expect(await axeViolations(page)).toEqual([])
    })
  }

  test('a run saved by version 9 loads mid-battle and plays on', async ({ page }) => {
    const saved = JSON.parse(readFileSync(path.join(process.cwd(), '__tests__/lib/thought-pockets/fixtures/run-v9.json'), 'utf8'))
    await fresh(page, 185, true)
    await load(page, saved, 9)
    await expect(page.getByTestId('screen-battle')).toBeVisible()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toBeVisible()
  })

  test('a run saved by version 8 loads mid-battle and plays on', async ({ page }) => {
    const saved = JSON.parse(readFileSync(path.join(process.cwd(), '__tests__/lib/thought-pockets/fixtures/run-v8.json'), 'utf8'))
    await fresh(page, 176, true)
    await load(page, saved, 8)
    await expect(page.getByTestId('screen-battle')).toBeVisible()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toBeVisible()
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`mid-replay, a Gentle bias's slow line, the reward and the Unsettle ending have no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      const run = inFirstBattle(177, (b) => ({ ...b, enemy: { ...b.enemy, id: 'sunk_cost', health: 38, maxHealth: 38 }, hand: cards(['observation', 'therefore', 'observation']), focus: 3 }))
      await fresh(page, 177, true)
      await load(page, run)
      for (let i = 0; i < 3; i++) await hand(page).first().click()
      await page.getByTestId('end-turn').click()
      await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'playing')
      await page.waitForTimeout(700)
      await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()))
      expect(await axeViolations(page, false)).toEqual([])
      await load(page, inFirstBattle(177, (b) => ({ ...b, enemy: { ...b.enemy, health: 2, unsettle: 6 }, focus: 0 })))
      await page.getByTestId('end-turn').click()
      await expect(page.getByTestId('final-argument')).toBeVisible()
      expect(await axeViolations(page)).toEqual([])
    })
  }

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the length choice and both victory screens have no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await fresh(page, 156)
      await page.getByTestId('length-long').check()
      expect(await axeViolations(page)).toEqual([])
      for (const length of ['short', 'long'] as const) {
        const run = newRun('rationalist', 156, 'gentle', [], undefined, length)
        const boss = run.map.find((n) => n.type === 'boss') as MapNode
        const reward = { source: 'boss' as const, gold: 0, cardChoices: [], cardTaken: true, relicChoices: [], relicTaken: true, finalRound: null }
        await load(page, { ...run, floor: length === 'long' ? 3 : 1, position: boss.id, beaten: [TUTORIAL_ENEMY], screen: 'reward', reward })
        await page.getByTestId('continue').click()
        await expect(page.getByTestId('screen-victory')).toBeVisible()
        expect(await axeViolations(page)).toEqual([])
      }
    })
  }

  test('your Resolve holds while the round replays, then counts down with one hit reaction as the bias acts; with reduced motion it is simply the new number', async ({ page }) => {
    const run = inFirstBattle(181, (b) => ({ ...b, hand: cards(['observation', 'therefore']), focus: 3 }))
    const after = endTurn(playCard(playCard(run.battle as BattleState, 500), 501))
    expect(after.lastRound?.playerLoss).toBeGreaterThan(0)
    await fresh(page, 181, true)
    await load(page, run)
    const resolve = page.getByTestId('player-resolve')
    const attacked = page.getByTestId('last-round').getByText(/It attacked for/)
    await hand(page).first().click()
    await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'playing')
    await expect(resolve).toContainText(`Resolve ${START_RESOLVE}/${START_RESOLVE}`)
    await expect(attacked).toBeHidden()
    await expect(resolve.locator('[data-hit]')).toHaveAttribute('data-hit', String(after.lastRound?.playerLoss), { timeout: 6000 })
    await expect(attacked).toBeVisible()
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'done', { timeout: 6000 })
    await expect(resolve).toContainText(`Resolve ${after.player.resolve}/${START_RESOLVE}`)
    await expect(resolve.locator('[data-hit]')).toHaveCount(0)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await load(page, run)
    await hand(page).first().click()
    await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'done', { timeout: 300 })
    await expect(resolve).toContainText(`Resolve ${after.player.resolve}/${START_RESOLVE}`)
    await expect(resolve.locator('[data-hit]')).toHaveCount(0)
    expect(await resolve.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
  })

  test('on a small phone the replay plays above a one-line dock that holds the round it shows: the tally and what the bias did are in view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    const moves = getEnemyDef(TUTORIAL_ENEMY).moves
    const run = inFirstBattle(182, (b) => ({ ...b, turn: 2, hand: cards(['observation', 'therefore', 'observation']), focus: 3 }))
    await fresh(page, 182)
    await load(page, run)
    await expect(page.getByTestId('hint')).toBeVisible()
    for (let i = 0; i < 3; i++) await hand(page).first().click()
    await page.getByTestId('end-turn').click()
    const replay = page.getByTestId('last-round')
    await expect(replay).toHaveAttribute('data-show', 'playing')
    for (const id of ['hint', 'focus', 'end-turn']) await expect(page.getByTestId(id)).toBeHidden()
    await expect(page.getByTestId('dock-resolve')).toBeInViewport()
    await expect(page.getByTestId('dock-resolve')).toContainText(`Resolve ${START_RESOLVE}/${START_RESOLVE}`)
    await expect(page.getByTestId('intent-compact')).toContainText(`Next: Attack ${moves[0].attack}`)
    await expect(replay.getByTestId('tally')).toBeInViewport({ ratio: 1 })
    const attacked = replay.getByText(/It attacked for/)
    await expect(attacked).toBeVisible({ timeout: 6000 })
    await expect(attacked).toBeInViewport({ ratio: 1 })
    const line = await attacked.boundingBox()
    const dock = await page.getByTestId('hand-dock').boundingBox()
    expect(line && dock && line.y + line.height <= dock.y, 'what the bias did is above the dock, not under it').toBe(true)
    await expect(page.getByTestId('dock-resolve').locator('[data-hit]')).toBeAttached()
    await expect(replay).toHaveAttribute('data-show', 'done', { timeout: 6000 })
    await expect(page.getByTestId('intent-compact')).toContainText(`Next: Guard ${moves[1].guard}`)
    await expect(page.getByTestId('end-turn')).toBeInViewport()
    await expect(page.getByTestId('dock-resolve')).toHaveCount(0)
  })

  test('a hit of 20 or more lands bolder, and the cracks it leaves run dark across the frame', async ({ page }) => {
    const run = inFirstBattle(183, (b) => ({ ...b, enemy: { ...b.enemy, health: 80, maxHealth: 80 }, hand: cards(['smoking_gun']), focus: 3 }))
    await fresh(page, 183, true)
    await load(page, run)
    await hand(page).first().click()
    expect(Number(await page.getByTestId('damage-preview').innerText())).toBeGreaterThanOrEqual(20)
    await page.getByTestId('end-turn').click()
    await expect(page.locator('section[data-big-hit]')).toBeAttached({ timeout: 6000 })
    await expect(page.getByTestId('last-round')).toHaveAttribute('data-show', 'done', { timeout: 6000 })
    await expect(page.locator('section[data-big-hit]')).toHaveCount(0)
    const cracks = page.getByTestId('portrait').getByTestId('cracks')
    await expect(cracks).toHaveAttribute('data-cracks', '1')
    expect(await cracks.locator('rect[fill="var(--tp-text)"]').count(), 'dark crack pixels over the paper and frame').toBeGreaterThan(3)
  })

  test('a Gentle bias states its halfway mark, and the preview says what the mark stops becomes Unsettle', async ({ page }) => {
    const def = getEnemyDef('sunk_cost')
    const half = Math.floor(def.health / 2)
    const run = inFirstBattle(184, (b) => ({ ...b, halfway: true, enemy: { ...b.enemy, id: def.id, health: half + 1, maxHealth: def.health, moveIndex: 0 }, hand: cards(['observation']), focus: 3 }))
    await fresh(page, 184, true)
    await load(page, run)
    await expect(page.getByTestId('enemy-rule')).toContainText(`its halfway mark (${half}) stops any round`)
    await hand(page).first().click()
    const step = page.getByTestId('equation').getByTestId('chain-step')
    await expect(step).toContainText(`Its halfway mark (${half}) stops this round. Your extra`)
    await expect(step).toContainText('unsettles it: Unsettle +')
    await expect(page.getByTestId('damage-preview')).toHaveText('1')
  })

  test('a first Gentle walk brings one new idea per fight, each said once in a plain line', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const run = newRun('empiricist', 185, 'gentle', [], undefined, 'short')
    const battleAt = (row: number) => run.map.find((n) => n.row === row && n.type === 'battle') as MapNode
    const before = (node: MapNode) => run.map.find((n) => n.next.includes(node.id)) as MapNode
    const second = battleAt(1)
    expect(second.enemyId).toBe('rumination')
    await fresh(page, 185, true)
    await load(page, { ...run, position: before(second).id, visited: [before(second).id] })
    await page.locator('button[data-available]').and(page.getByTestId('node-battle')).first().click()
    const lesson = page.getByTestId('lesson')
    await expect(lesson).toHaveCount(1)
    await expect(lesson).toHaveText(/^New: Unsettle\. /)
    await expect(page.getByTestId('enemy-rule')).not.toContainText('halfway mark')
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.seen, INSIGHT_KEY)).toEqual(['unsettle'])
    expect(await axeViolations(page)).toEqual([])

    const third = battleAt(2)
    await load(page, { ...run, position: before(third).id, visited: [before(third).id] })
    await page.locator('button[data-available]').and(page.getByTestId('node-battle')).first().click()
    await expect(page.getByTestId('lesson')).toHaveText(/^New: The halfway mark\. /)
    await expect(page.getByTestId('enemy-rule')).toContainText('halfway mark')

    await load(page, { ...run, position: before(second).id, visited: [before(second).id] })
    await page.locator('button[data-available]').and(page.getByTestId('node-battle')).first().click()
    await expect(page.getByTestId('enemy-name')).toHaveText(getEnemyDef('rumination').name)
    await expect(page.getByTestId('lesson')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })

  test('a player who has finished a walk is not shown the new-idea lines', async ({ page }) => {
    const run = newRun('empiricist', 186, 'gentle', [], undefined, 'short')
    const second = run.map.find((n) => n.row === 1 && n.type === 'battle') as MapNode
    const before = run.map.find((n) => n.next.includes(second.id)) as MapNode
    await page.goto(URL)
    await page.evaluate((key) => {
      localStorage.removeItem('thought-pockets-run')
      localStorage.setItem(key, JSON.stringify({ state: { beaten: [], finishedWith: ['empiricist'], tutorialDone: true, rigorWon: 0 }, version: 0 }))
    }, INSIGHT_KEY)
    await load(page, { ...run, position: before.id, visited: [before.id] })
    await page.locator('button[data-available]').and(page.getByTestId('node-battle')).first().click()
    await expect(page.getByTestId('enemy-name')).toHaveText(getEnemyDef('rumination').name)
    await expect(page.getByTestId('lesson')).toHaveCount(0)
  })

  test('a Short walk’s quiet place first offers one card to build on, then the rest', async ({ page }) => {
    const { run } = standingBefore(newRun('skeptic', 187, 'gentle', [], undefined, 'short'), 'rest')
    await fresh(page, 187, true)
    await load(page, run)
    await expect(page.getByTestId('rest-legend')).toContainText('First, one card to build on')
    await page.locator('button[data-available]').and(page.getByTestId('node-rest')).first().click()
    await expect(page.getByRole('heading', { name: 'A quiet place' })).toBeVisible()
    await expect(page.getByTestId('study-note')).toBeVisible()
    const choices = page.getByTestId('card-choices').getByRole('button')
    await expect(choices).toHaveCount(3)
    await expect(page.getByTestId('continue')).toHaveText('Skip the card and rest')
    await expect(page.getByRole('button', { name: /skip/i })).toHaveCount(1)
    expect(await axeViolations(page)).toEqual([])
    await choices.first().click()
    await expect(page.getByTestId('continue')).toHaveText('On to rest')
    await page.getByTestId('continue').click()
    await expect(page.getByTestId('rest-heal')).toBeVisible()
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) as string).state.run as RunState, RUN_KEY)
    expect(saved.deck).toHaveLength(run.deck.length + 1)
  })
})
