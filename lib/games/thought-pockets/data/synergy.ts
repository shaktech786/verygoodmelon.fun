import { CardDef, CardInstance, RelicId, School } from '@/types/thought-pockets'
import { getCardDef } from './cards'
import { getRelicDef } from './relics'
import { getSchoolDef } from './schools'

/** What a build runs on: a card can use one of these, and another card, a relic or a school can supply it. */
export type Resource = 'doubt' | 'guard' | 'unsettle' | 'evidence' | 'logic' | 'length'

/** What a card's numbers grow with. */
export function uses(card: CardDef): Resource[] {
  const found: Resource[] = []
  if (card.weightPerDoubtInHand || card.guardPerDoubtInHand || card.multiplierPerDoubtInHand) found.push('doubt')
  if (card.weightPerGuard || card.multiplierPerGuardCard) found.push('guard')
  if (card.weightPerUnsettle || card.unsettleLasts) found.push('unsettle')
  if (card.weightPerOtherEvidence || card.multiplierPerEvidence || card.guardPerEvidence || card.weightPerEarlierEvidence) found.push('evidence')
  if (card.multiplierPerOtherLogic) found.push('logic')
  if (card.multiplierPerEarlierCard || card.unsettlePerCard) found.push('length')
  return found
}

const GUARD_MAKER = 3

/** What a card supplies to the cards that use it. */
export function makes(card: CardDef): Resource[] {
  const found: Resource[] = []
  if (card.addDoubt) found.push('doubt')
  if ((card.guard ?? 0) >= GUARD_MAKER || card.guardPerEvidence || card.guardPerDoubtInHand) found.push('guard')
  if (card.unsettle || card.unsettlePerCard) found.push('unsettle')
  if (card.type === 'evidence') found.push('evidence')
  if (card.type === 'logic') found.push('logic')
  if (card.draw || card.focus || card.nextTurnFocus) found.push('length')
  return found
}

const RELIC_USES: Partial<Record<RelicId, Resource>> = { marginalia: 'guard', footnotes: 'length', still_water: 'unsettle' }
const RELIC_MAKES: Partial<Record<RelicId, Resource>> = { seed_of_doubt: 'unsettle', sundial: 'length' }

/** What each school's passive runs on, and how a reward names it. */
const SCHOOL_USES: Record<School, { resource: Resource; name: string }> = {
  empiricist: { resource: 'evidence', name: 'Empiricist Evidence' },
  rationalist: { resource: 'logic', name: 'Rationalist Logic' },
  pragmatist: { resource: 'guard', name: 'Pragmatist Guard' },
  absurdist: { resource: 'doubt', name: 'Absurdist Doubts' },
  skeptic: { resource: 'unsettle', name: 'Skeptic questions' },
}
/** Every card supplies Evidence or Logic, so a card only fits those schools by using them. */
const COMMON_RESOURCES: Resource[] = ['evidence', 'logic']

function meets(a: Resource[], b: Resource[]): boolean {
  return a.some((r) => b.includes(r))
}

interface Owned {
  deck: CardInstance[]
  relics: RelicId[]
  school: School
}

/**
 * "Fits your Cash Value": a card on offer fits what you own when one uses what the other supplies.
 * Partners are cards you added (a starting card fits everything, so it says nothing), then relics, then your school's passive.
 */
export function fitsLabel(cardId: string, owned: Owned): string | null {
  const card = getCardDef(cardId)
  if (card.type === 'doubt') return null
  const starting = getSchoolDef(owned.school).deck
  const added = [...new Set(owned.deck.map((c) => c.cardId))].filter((id) => !starting.includes(id) && getCardDef(id).type !== 'doubt').map(getCardDef)
  const pairs = (other: CardDef) => meets(uses(card), makes(other)) || meets(uses(other), makes(card))
  const partner = added.find((other) => uses(other).length > 0 && pairs(other)) ?? added.find(pairs)
  if (partner) return `Fits your ${partner.name}`
  const relic = owned.relics.find((id) => {
    const used = RELIC_USES[id]
    const made = RELIC_MAKES[id]
    return (used !== undefined && makes(card).includes(used)) || (made !== undefined && uses(card).includes(made))
  })
  if (relic) return `Fits your ${getRelicDef(relic).name}`
  const school = SCHOOL_USES[owned.school]
  const supplies = makes(card).includes(school.resource) && !COMMON_RESOURCES.includes(school.resource)
  if (uses(card).includes(school.resource) || supplies) return `Fits your ${school.name}`
  return null
}
