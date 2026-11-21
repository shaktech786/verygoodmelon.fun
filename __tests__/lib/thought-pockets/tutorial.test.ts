import { describe, expect, it } from 'vitest'
import { playCard } from '@/lib/games/thought-pockets/engine/battle'
import { tutorialHint } from '@/lib/games/thought-pockets/engine/tutorial'
import { BattleState } from '@/types/thought-pockets'
import { battleWith } from './helpers'

function playAll(battle: BattleState, uids: number[]): BattleState {
  return uids.reduce((state, uid) => playCard(state, uid), battle)
}

describe('the first-fight hint', () => {
  it('does not push a Guard card as the last card when nothing stronger is left to finish on (regression)', () => {
    const battle = playAll(battleWith({ hand: ['observation', 'therefore', 'caveat'], school: 'skeptic' }), [100, 101])
    expect(battle.focus).toBe(1)
    expect(tutorialHint(battle)).not.toMatch(/Guard card absorbs/)
  })

  it('suggests a Guard card when it lowers the hit and an Evidence card can still come last', () => {
    const battle = playCard(battleWith({ hand: ['observation', 'caveat', 'observation'], school: 'skeptic' }), 100)
    expect(tutorialHint(battle)).toMatch(/Guard card absorbs/)
  })

  it('says so when the Conclusion counts nothing, with the count this school would give it', () => {
    const battle = playAll(battleWith({ hand: ['observation', 'caveat'], school: 'skeptic' }), [100, 101])
    expect(tutorialHint(battle)).toMatch(/counting it twice as the Conclusion adds nothing/)
    const empiricist = playAll(battleWith({ hand: ['observation', 'cash_value'], school: 'empiricist' }), [100, 101])
    expect(tutorialHint(empiricist)).toMatch(/counting it three times as the Conclusion adds nothing/)
  })

  it('opens by asking for Evidence, and says End turn when the argument will finish it', () => {
    expect(tutorialHint(battleWith({ hand: ['observation'] }))).toMatch(/Evidence/)
    const start = battleWith({ hand: ['observation', 'therefore'], school: 'skeptic' })
    const lethal = playAll({ ...start, turn: 2, enemy: { ...start.enemy, health: 5 } }, [100, 101])
    expect(tutorialHint(lethal)).toMatch(/finishes it/)
  })
})
