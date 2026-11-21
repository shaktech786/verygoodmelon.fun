import { describe, it, expect } from 'vitest'
import { BASE_CONCEPTS, type Concept } from '@/lib/games/idea-lab/concepts'
import { cabinetOrder, recipeFor } from '@/lib/games/idea-lab/cabinet'

const grief: Concept = { id: 'grief', name: 'Grief', emoji: '💔' }
const healing: Concept = { id: 'healing', name: 'Healing', emoji: '🌱' }
const concepts = [...BASE_CONCEPTS, grief, healing]

describe('the idea cabinet', () => {
  it('names the two ideas that first made a discovery', () => {
    const combinations = { 'death+love': 'grief', 'grief+hope': 'healing' }
    expect(recipeFor('grief', combinations, concepts)?.map(c => c.name)).toEqual(['Death', 'Love'])
    expect(recipeFor('healing', combinations, concepts)?.map(c => c.name)).toEqual(['Grief', 'Hope'])
  })

  it('has no recipe for an idea whose pair was never remembered or no longer exists', () => {
    expect(recipeFor('grief', {}, concepts)).toBeNull()
    expect(recipeFor('grief', { 'death+vanished': 'grief' }, concepts)).toBeNull()
    expect(recipeFor('grief', { 'a+b+c': 'grief' }, concepts)).toBeNull()
  })

  it('shelves the newest idea first without changing the saved order', () => {
    const discoveries = [grief, healing]
    expect(cabinetOrder(discoveries).map(c => c.id)).toEqual(['healing', 'grief'])
    expect(discoveries.map(c => c.id)).toEqual(['grief', 'healing'])
  })
})
