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
]

export function getEventDef(eventId: EventId): EventDef {
  const event = EVENTS.find((candidate) => candidate.id === eventId)
  if (!event) throw new Error(`Unknown event: ${eventId}`)
  return event
}
