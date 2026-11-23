import { ArgumentPreview, BattleCore, CardEffects } from '@/types/thought-pockets'
import { isDoubt, resolveCard } from '../data/cards'
import { KEYWORDS } from '../data/keywords'
import { enemyRules, phaseThreshold, stopLine } from './battle'

/**
 * The ideas a Gentle walk introduces after the first fight's basics, each with one plain line said the first time it comes up.
 * The order is the order they are introduced in when several come up at once.
 */
export const LESSONS = {
  stages: {
    term: 'Stages',
    line: 'A philosophical problem stops at three quarters of its Resolve and at half, where it changes its rule. Damage a line stops shakes it instead.',
  },
  unsettle: { term: 'Unsettle', line: 'Before it acts, it loses that much Resolve, whatever its Guard. Usually the Unsettle then halves.' },
  halfway: { term: 'The halfway mark', line: 'No single round takes this bias past half its Resolve. Damage the mark stops unsettles it instead.' },
  shaken: { term: 'Shaken', line: 'Damage a line stopped, saved up. When the problem changes, it all takes that much Resolve at once.' },
  pierce: { term: 'Pierce', line: KEYWORDS.Pierce },
  keep: { term: 'Keep', line: KEYWORDS.Keep },
  once: { term: 'Once', line: KEYWORDS.Once },
  postpone: { term: 'Postpone', line: KEYWORDS.Postpone },
  doubt: { term: 'Doubt', line: KEYWORDS.Doubt },
} as const

export type Lesson = keyof typeof LESSONS
export const ALL_LESSONS = Object.keys(LESSONS) as Lesson[]

function ordered(found: Set<Lesson>): Lesson[] {
  return ALL_LESSONS.filter((lesson) => found.has(lesson))
}

function addCardLessons(found: Set<Lesson>, card: CardEffects & { type?: string }) {
  if (card.unsettle || card.unsettlePerCard) found.add('unsettle')
  if (card.pierce) found.add('pierce')
  if (card.retain) found.add('keep')
  if (card.exhaust) found.add('once')
  if (card.postpone) found.add('postpone')
  if (card.type === 'doubt' || card.addDoubt) found.add('doubt')
}

/** The ideas this fight puts in front of you right now: the bias's rules and state, your argument, and the cards in your hand. */
export function lessonsIn(core: BattleCore, preview: ArgumentPreview): Lesson[] {
  const found = new Set<Lesson>()
  if (phaseThreshold(core) !== null) found.add('stages')
  if (core.enemy.unsettle > 0 || enemyRules(core).includes('ruminates') || preview.unsettle > 0 || preview.unsettleTick > 0) found.add('unsettle')
  if (core.halfway && stopLine(core) !== null) found.add('halfway')
  if (core.enemy.shaken > 0 || preview.shaken > 0) found.add('shaken')
  if (preview.pierce) found.add('pierce')
  for (const card of core.hand) {
    if (isDoubt(card)) found.add('doubt')
    else addCardLessons(found, resolveCard(card))
  }
  return ordered(found)
}

/** The ideas the offered cards use. */
export function lessonsOnCards(cards: (CardEffects & { type?: string })[]): Lesson[] {
  const found = new Set<Lesson>()
  for (const card of cards) addCardLessons(found, card)
  return ordered(found)
}
