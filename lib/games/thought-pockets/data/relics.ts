import { RelicDef, RelicId } from '@/types/thought-pockets'

export const RELICS: RelicDef[] = [
  { id: 'ockhams_razor', name: "Ockham's Razor", text: 'An argument of exactly 2 cards gets +1 Multiplier.', flavor: 'Do not multiply things without need.' },
  { id: 'marginalia', name: 'Marginalia', text: 'Each Guard card in your argument also adds 2 Weight.', flavor: 'The best ideas are in the margins.' },
  { id: 'footnotes', name: 'Footnotes', text: 'If your argument has 4 or more cards, your Conclusion counts three times.', flavor: 'See note 14, and also note 15.' },
  { id: 'worry_stone', name: 'Worry Stone', text: 'Each Focus you leave unspent gives you 4 Guard.', flavor: 'Smooth from years of thumbs.' },
  { id: 'hourglass', name: 'Hourglass', text: 'Every third turn of a fight, gain 2 extra Focus.', flavor: 'Patience is also an argument.' },
  { id: 'lantern', name: 'Lantern', text: 'Your first argument in each fight has Pierce.', flavor: 'It does not argue with the dark.' },
  { id: 'seed_of_doubt', name: 'Seed of Doubt', text: 'Every fight starts with the enemy Unsettled 2.', flavor: 'Small, and it grows.' },
  { id: 'stoic_pebble', name: 'Stoic Pebble', text: 'You never lose more than 12 Resolve to one enemy action.', flavor: 'What is in your control, and what is not.' },
  { id: 'pocket_notebook', name: 'Pocket Notebook', text: 'Card rewards offer 1 more card.', flavor: 'Write it down before it goes.' },
  { id: 'library_card', name: 'Library Card', text: 'Shop prices are 25% lower.', flavor: 'The best deal in town.' },
  { id: 'tea_flask', name: 'Tea Flask', text: 'Restore 5 Resolve after each fight.', flavor: 'Still warm.' },
  { id: 'second_opinion', name: 'Second Opinion', text: 'On turns when the enemy is not about to attack, draw 2 more cards.', flavor: 'A quiet moment is a chance to think.' },
  { id: 'long_view', name: 'The Long View', text: 'Unspent Focus carries over to your next turn (up to 2).', flavor: 'Not everything has to happen today.' },
]

const RELIC_INDEX = new Map(RELICS.map((relic) => [relic.id, relic]))

export function getRelicDef(relicId: RelicId): RelicDef {
  const relic = RELIC_INDEX.get(relicId)
  if (!relic) throw new Error(`Unknown relic: ${relicId}`)
  return relic
}
