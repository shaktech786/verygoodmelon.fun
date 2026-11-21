import { EventId } from '@/types/thought-pockets'

export interface EventChoiceDef {
  id: string
  label: string
  detail: string
}

export interface EventDef {
  id: EventId
  name: string
  text: string
  choices: EventChoiceDef[]
}

export const LECTURE_COST = 6
export const LIBRARY_REST = 12
export const BOOKSELLER_PRICE = 30
export const BOOKSELLER_PAY = 35
export const FRIEND_MAX = 5
export const FRIEND_GOLD = 40
export const MIRROR_MAX_LOSS = 5
export const CAFE_PRICE = 25
export const CAFE_HEAL = 18
export const JOURNAL_COST = 5
export const ARCHIVE_COST = 8
export const COPY_PRICE = 25
export const ARGUE_COST = 10
export const LET_GO_HEAL = 8
export const TEACH_GOLD = 25
export const QUESTION_COST = 4
export const QUESTION_MAX = 3

export const EVENTS: EventDef[] = [
  {
    id: 'lecture',
    name: 'The Lecture Hall',
    text: 'A lecture is about to start. The front row is free, but the talk will be demanding.',
    choices: [
      { id: 'attend', label: 'Sit in the front row', detail: `Lose ${LECTURE_COST} Resolve. Take one of the two cards shown.` },
      { id: 'leave', label: 'Slip out quietly', detail: 'Nothing happens.' },
    ],
  },
  {
    id: 'library',
    name: 'The Quiet Library',
    text: 'Afternoon light, a comfortable chair, and nobody asking you anything.',
    choices: [
      { id: 'study', label: 'Study', detail: 'Upgrade one card of your choice.' },
      { id: 'nap', label: 'Close your eyes', detail: `Restore ${LIBRARY_REST} Resolve.` },
    ],
  },
  {
    id: 'bookseller',
    name: 'The Bookseller',
    text: 'A bookseller will take an idea off your hands, or buy your old notes.',
    choices: [
      { id: 'remove', label: 'Part with an idea', detail: `Pay ${BOOKSELLER_PRICE} gold. Remove one card from your deck.` },
      { id: 'sell', label: 'Sell your notes', detail: `Gain ${BOOKSELLER_PAY} gold. Add a Doubt to your deck.` },
      { id: 'leave', label: 'Browse and leave', detail: 'Nothing happens.' },
    ],
  },
  {
    id: 'old_friend',
    name: 'An Old Friend',
    text: 'An old friend waves you over. "You look like you have been thinking hard. How are you, really?"',
    choices: [
      { id: 'talk', label: 'Talk it through', detail: `+${FRIEND_MAX} maximum Resolve, and restore the same.` },
      { id: 'loan', label: 'Ask for help with money', detail: `Gain ${FRIEND_GOLD} gold.` },
    ],
  },
  {
    id: 'mirror',
    name: 'The Honest Mirror',
    text: 'The mirror shows your habits, not your face. It offers to keep something for you, at a price.',
    choices: [
      { id: 'take', label: 'Take what it offers', detail: 'Gain the relic shown. Add 2 Doubts to your deck.' },
      { id: 'clear', label: 'Look away from old worries', detail: `Remove every Doubt from your deck. Lose ${MIRROR_MAX_LOSS} maximum Resolve.` },
      { id: 'leave', label: 'Walk on', detail: 'Nothing happens.' },
    ],
  },
  {
    id: 'cafe',
    name: 'The Corner Café',
    text: 'Warm light, a corner table, and the smell of coffee. Nobody here needs anything from you.',
    choices: [
      { id: 'treat', label: 'Treat yourself', detail: `Pay ${CAFE_PRICE} gold. Restore ${CAFE_HEAL} Resolve.` },
      { id: 'journal', label: 'Write in your journal', detail: `Lose ${JOURNAL_COST} Resolve. Upgrade one card of your choice.` },
      { id: 'leave', label: 'Just look in the window', detail: 'Nothing happens.' },
    ],
  },
  {
    id: 'archive',
    name: 'The Dusty Archive',
    text: 'Shelves nobody has dusted in years. Some of the ideas in here are rare, and heavy to carry out.',
    choices: [
      { id: 'dig', label: 'Dig through the stacks', detail: `Lose ${ARCHIVE_COST} Resolve. Take one of the three cards shown.` },
      { id: 'copy', label: 'Copy out your best notes', detail: `Pay ${COPY_PRICE} gold. Add a copy of one card in your deck.` },
      { id: 'leave', label: 'Sneeze and leave', detail: 'Nothing happens.' },
    ],
  },
  {
    id: 'loud_certainty',
    name: 'A Loud Certainty',
    text: 'On the corner, a man tells everyone who passes that he has never once been wrong. He has something shiny on his table.',
    choices: [
      { id: 'argue', label: 'Argue with him', detail: `Lose ${ARGUE_COST} Resolve. Gain the relic shown.` },
      { id: 'let_go', label: 'Let him be right', detail: `Restore ${LET_GO_HEAL} Resolve. Not every argument is yours to win.` },
    ],
  },
  {
    id: 'study_group',
    name: 'The Study Group',
    text: 'A few students at a long table wave you over. They could use a hand, and so could you.',
    choices: [
      { id: 'teach', label: 'Teach what you know', detail: `Remove one card from your deck. Gain ${TEACH_GOLD} gold.` },
      { id: 'learn', label: 'Learn from them', detail: 'Take one of the two cards shown. Add a Doubt to your deck.' },
      { id: 'leave', label: 'Wave back and keep walking', detail: 'Nothing happens.' },
    ],
  },
  {
    id: 'the_question',
    name: 'A Small Question',
    text: 'A child tugs your sleeve. "Why is the sky blue?"',
    choices: [
      { id: 'explain', label: 'Explain it carefully', detail: `Lose ${QUESTION_COST} Resolve. Upgrade one card of your choice.` },
      { id: 'admit', label: 'Say you do not know', detail: `+${QUESTION_MAX} maximum Resolve, and restore the same.` },
    ],
  },
]

export function getEventDef(eventId: EventId): EventDef {
  const event = EVENTS.find((candidate) => candidate.id === eventId)
  if (!event) throw new Error(`Unknown event: ${eventId}`)
  return event
}
