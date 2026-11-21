import { describe, expect, it } from 'vitest'
import { playCard, previewArgument } from '@/lib/games/thought-pockets/engine/battle'
import { tutorialHint } from '@/lib/games/thought-pockets/engine/tutorial'
import { keywordText } from '@/lib/games/thought-pockets/data/keywords'
import { conclusionLine, timesWord } from '@/lib/games/thought-pockets/data/conclusion'
import { SCHOOLS } from '@/lib/games/thought-pockets/data/schools'
import { getCardDef } from '@/lib/games/thought-pockets/data/cards'
import { School } from '@/types/thought-pockets'
import { battleWith } from './helpers'

/** How many times the engine really counts a Conclusion of this card, read from the Weight or Multiplier it adds. */
function measured(school: School, cards: string[]): number {
  const start = battleWith({ hand: cards, school })
  const battle = cards.reduce((state, _, i) => playCard(state, 100 + i), start)
  const step = previewArgument(battle).steps.at(-1)
  if (!step) throw new Error('no step')
  const def = getCardDef(cards.at(-1) as string)
  const counted = def.type === 'evidence' ? step.weight / (def.weight ?? 1) : step.multiplier / (def.multiplier ?? 1)
  expect(step.times, `${school}: the step's own count matches what it adds`).toBe(counted)
  return counted
}

describe('every rules line about the Conclusion states the engine’s number, for every school', () => {
  for (const school of SCHOOLS) {
    it(`${school.name}`, () => {
      const evidence = measured(school.id, ['observation'])
      const logic = measured(school.id, ['observation', 'therefore'])
      const lines = {
        keyword: keywordText('Conclusion', school.id),
        howToPlay: conclusionLine(school.id),
        hint: tutorialHint({ ...battleWith({ hand: ['observation', 'therefore'], school: school.id }), turn: 2 }) ?? '',
      }
      for (const [where, text] of Object.entries(lines)) {
        expect(text, `${where}: Evidence counts ${evidence}`).toContain(timesWord(evidence))
        expect(text, `${where}: Logic counts ${logic}`).toContain(timesWord(logic))
        if (evidence === logic) expect(text, `${where} claims a number the engine never uses`).not.toMatch(/three times|four times/)
      }
      if (evidence !== logic) expect(school.passive).toContain(timesWord(evidence))
    })
  }

  it('the general text, before a school is chosen, names every count a school can get', () => {
    const counts = new Set(SCHOOLS.flatMap((s) => [measured(s.id, ['observation']), measured(s.id, ['observation', 'therefore'])]))
    for (const n of counts) {
      expect(keywordText('Conclusion', null)).toContain(timesWord(n))
      expect(conclusionLine(null)).toContain(timesWord(n))
    }
  })
})
