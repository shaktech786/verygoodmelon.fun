import { RelicDef, RelicId } from '@/types/thought-pockets'
import {
  FOOTNOTES_CARDS,
  HOURGLASS_FOCUS,
  LONG_VIEW_MAX,
  MARGINALIA_WEIGHT,
  OCKHAM_MULTIPLIER,
  SECOND_OPINION_DRAW,
  SEED_UNSETTLE,
  BOOKENDS_DRAW,
  STILL_WATER_GUARD,
  STOIC_CAP,
  SUNDIAL_FOCUS,
  WORRY_STONE_GUARD,
} from '../engine/battle'
import { LIBRARY_DISCOUNT, TEA_FLASK_HEAL } from '../engine/economy'
import { FOOTNOTES_TIMES, timesWord } from './conclusion'

export const RELICS: RelicDef[] = [
  { id: 'ockhams_razor', name: "Ockham's Razor", text: `An argument of exactly 2 cards gets +${OCKHAM_MULTIPLIER} Multiplier.`, flavor: 'Do not multiply things without need.' },
  { id: 'marginalia', name: 'Marginalia', text: `Each Guard card in your argument also adds ${MARGINALIA_WEIGHT} Weight.`, flavor: 'The best ideas are in the margins.' },
  { id: 'footnotes', name: 'Footnotes', text: `If your argument has ${FOOTNOTES_CARDS} or more cards, your Conclusion counts at least ${timesWord(FOOTNOTES_TIMES)}.`, flavor: 'See note 14, and also note 15.' },
  { id: 'worry_stone', name: 'Worry Stone', text: `Leaving any Focus unspent gives ${WORRY_STONE_GUARD} more Guard, once per turn.`, flavor: 'Smooth from years of thumbs.' },
  { id: 'hourglass', name: 'Hourglass', text: `Every third turn of a fight, gain ${HOURGLASS_FOCUS} extra Focus.`, flavor: 'Patience is also an argument.' },
  { id: 'lantern', name: 'Lantern', text: 'Your first argument with any Weight in each fight has Pierce.', flavor: 'It does not argue with the dark.' },
  { id: 'seed_of_doubt', name: 'Seed of Doubt', text: `Every fight starts with the enemy Unsettled ${SEED_UNSETTLE}.`, flavor: 'Small, and it grows.' },
  { id: 'stoic_pebble', name: 'Stoic Pebble', text: `You never lose more than ${STOIC_CAP} Resolve to one enemy action.`, flavor: 'What is in your control, and what is not.' },
  { id: 'pocket_notebook', name: 'Pocket Notebook', text: 'Card rewards offer 1 more card.', flavor: 'Write it down before it goes.' },
  { id: 'library_card', name: 'Library Card', text: `Shop prices are ${Math.round((1 - LIBRARY_DISCOUNT) * 100)}% lower.`, flavor: 'The best deal in town.' },
  { id: 'tea_flask', name: 'Tea Flask', text: `Restore ${TEA_FLASK_HEAL} Resolve after each fight.`, flavor: 'Still warm.' },
  { id: 'second_opinion', name: 'Second Opinion', text: `On turns when the enemy is not about to attack, draw ${SECOND_OPINION_DRAW} more cards.`, flavor: 'A quiet moment is a chance to think.' },
  { id: 'long_view', name: 'The Long View', text: `Up to ${LONG_VIEW_MAX} unspent Focus carries over to your next turn instead of becoming Guard.`, flavor: 'Not everything has to happen today.' },
  {
    id: 'sundial',
    name: 'Sundial',
    text: `On turns the enemy shows an attack, gain ${SUNDIAL_FOCUS} more Focus; on turns it does not, ${SUNDIAL_FOCUS} less.`,
    flavor: 'Some hours are longer than others.',
    ruleBending: true,
  },
  {
    id: 'bookends',
    name: 'Bookends',
    text: `In an argument of 2 or more cards, the card at the other end from your Conclusion is a Conclusion too. You draw ${BOOKENDS_DRAW} fewer card each turn.`,
    flavor: 'Begin where you mean to finish.',
    ruleBending: true,
  },
  {
    id: 'still_water',
    name: 'Still Water',
    text: `Unsettle on an enemy never halves, but every enemy starts each fight with ${STILL_WATER_GUARD} Guard.`,
    flavor: 'A question left still does not settle.',
    ruleBending: true,
  },
]

const RELIC_INDEX = new Map(RELICS.map((relic) => [relic.id, relic]))

export function getRelicDef(relicId: RelicId): RelicDef {
  const relic = RELIC_INDEX.get(relicId)
  if (!relic) throw new Error(`Unknown relic: ${relicId}`)
  return relic
}
