export interface Concept {
  id: string
  name: string
  emoji: string
  description?: string
  isBase?: boolean
}

export interface Combination {
  name: string
  emoji: string
  description: string
}

export interface GoldenIdea {
  name: string
  riddle: string
}

/** The sixteen starting ideas: the lead, and the light, an alchemist begins with. */
export const BASE_CONCEPTS: Concept[] = [
  { id: 'love', name: 'Love', emoji: '💕', isBase: true },
  { id: 'fear', name: 'Fear', emoji: '😨', isBase: true },
  { id: 'time', name: 'Time', emoji: '⏳', isBase: true },
  { id: 'death', name: 'Death', emoji: '🕯️', isBase: true },
  { id: 'knowledge', name: 'Knowledge', emoji: '📚', isBase: true },
  { id: 'power', name: 'Power', emoji: '⚡', isBase: true },
  { id: 'freedom', name: 'Freedom', emoji: '🕊️', isBase: true },
  { id: 'truth', name: 'Truth', emoji: '💎', isBase: true },
  { id: 'beauty', name: 'Beauty', emoji: '🌸', isBase: true },
  { id: 'justice', name: 'Justice', emoji: '⚖️', isBase: true },
  { id: 'hope', name: 'Hope', emoji: '🌅', isBase: true },
  { id: 'chaos', name: 'Chaos', emoji: '🌀', isBase: true },
  { id: 'order', name: 'Order', emoji: '📐', isBase: true },
  { id: 'nature', name: 'Nature', emoji: '🌿', isBase: true },
  { id: 'self', name: 'Self', emoji: '🪞', isBase: true },
  { id: 'other', name: 'Other', emoji: '👥', isBase: true },
]

/**
 * The seven golds of the Great Work. Each is two steps from the starting ideas,
 * and most begin with a heavy feeling, which is the point: the hard ones are ingredients.
 */
export const GOLDEN_IDEAS: GoldenIdea[] = [
  { name: 'Healing', riddle: 'What grief becomes when hope stays close.' },
  { name: 'Acceptance', riddle: 'What anxiety becomes once it learns patience.' },
  { name: 'Courage', riddle: 'Fear, carried by hope.' },
  { name: 'Compassion', riddle: 'Empathy that has come to understand.' },
  { name: 'Meaning', riddle: 'Mortality, answered by legacy.' },
  { name: 'Intimacy', riddle: 'Vulnerability that has found trust.' },
  { name: 'Virtue', riddle: 'Wisdom with the courage to act.' },
]

// Written in reading order ("love+fear"); lookups go through findKnownCombination.
const KNOWN_COMBINATIONS: Record<string, Combination> = {
  'love+fear': { name: 'Jealousy', emoji: '😒', description: 'When love fears loss, it curdles into possession.' },
  'love+death': { name: 'Grief', emoji: '💔', description: 'Love does not end where life does. It turns into longing.' },
  'love+time': { name: 'Devotion', emoji: '💍', description: 'Love that endures through time becomes unbreakable.' },
  'love+truth': { name: 'Vulnerability', emoji: '🫀', description: 'True love asks us to show who we really are.' },
  'love+freedom': { name: 'Trust', emoji: '🤝', description: 'Real love holds loosely, letting the other fly.' },
  'love+self': { name: 'Self-Compassion', emoji: '🌷', description: 'The hardest person to love gently is yourself.' },
  'love+other': { name: 'Empathy', emoji: '💗', description: 'Extending your heart beyond your own experience.' },

  'fear+death': { name: 'Mortality', emoji: '⏱️', description: 'The shared knowledge that gives life its urgency.' },
  'fear+time': { name: 'Anxiety', emoji: '😰', description: 'Fear stretched across an uncertain future.' },
  'fear+freedom': { name: 'Vertigo', emoji: '🌀', description: 'The dizziness of infinite possibility.' },
  'fear+truth': { name: 'Denial', emoji: '🙈', description: 'We fear what we refuse to see.' },
  'fear+self': { name: 'Insecurity', emoji: '😟', description: 'Doubting the ground beneath your own identity.' },

  'time+death': { name: 'Legacy', emoji: '📜', description: 'What remains after we are gone.' },
  'time+knowledge': { name: 'Wisdom', emoji: '🦉', description: 'Understanding deepened by experience.' },
  'time+hope': { name: 'Patience', emoji: '🌱', description: 'The strength to wait for what matters.' },
  'time+chaos': { name: 'Entropy', emoji: '🔥', description: 'All things tend toward disorder.' },
  'time+order': { name: 'History', emoji: '📖', description: 'The patterns we find in passing moments.' },

  'death+hope': { name: 'Renewal', emoji: '🌅', description: 'The possibility of beginning again.' },
  'death+beauty': { name: 'Impermanence', emoji: '🌸', description: 'Things are beautiful because they end.' },
  'death+self': { name: 'Ego Death', emoji: '🦋', description: 'The letting go that comes before transformation.' },

  'knowledge+power': { name: 'Expertise', emoji: '🎓', description: 'To know deeply is to influence widely.' },
  'knowledge+truth': { name: 'Enlightenment', emoji: '💡', description: 'When knowing lines up with what is.' },
  'knowledge+self': { name: 'Introspection', emoji: '🔍', description: 'Turning the mind inward to examine itself.' },
  'knowledge+other': { name: 'Understanding', emoji: '🤲', description: 'Bridging the gap between different minds.' },

  'power+freedom': { name: 'Authority', emoji: '👑', description: 'The right to shape what others may do.' },
  'power+justice': { name: 'Law', emoji: '⚖️', description: 'Power channelled through rules.' },
  'power+chaos': { name: 'Revolution', emoji: '✊', description: 'When gathered force breaks an old order.' },
  'power+self': { name: 'Autonomy', emoji: '🏔️', description: 'The power to govern yourself.' },

  'freedom+order': { name: 'Discipline', emoji: '🎯', description: 'Structure that enables rather than constrains.' },
  'freedom+truth': { name: 'Authenticity', emoji: '✨', description: 'Living as you truly are.' },
  'freedom+self': { name: 'Liberation', emoji: '🔓', description: 'Breaking chains you did not know you wore.' },
  'freedom+other': { name: 'Democracy', emoji: '🗳️', description: 'Freedom that includes everyone.' },

  'truth+beauty': { name: 'Art', emoji: '🎨', description: 'Beauty that reveals something real.' },
  'truth+justice': { name: 'Integrity', emoji: '🛡️', description: 'When words match actions match values.' },
  'truth+self': { name: 'Honesty', emoji: '🪞', description: 'Seeing yourself without filters.' },
  'truth+chaos': { name: 'Paradox', emoji: '♾️', description: 'Truths that contradict yet coexist.' },

  'beauty+chaos': { name: 'Creativity', emoji: '🌈', description: 'Order emerging from disorder.' },
  'beauty+order': { name: 'Harmony', emoji: '🎵', description: 'Elements in perfect relation.' },

  'justice+chaos': { name: 'Karma', emoji: '☯️', description: 'The world quietly balancing itself.' },

  'hope+chaos': { name: 'Faith', emoji: '🕊️', description: 'Trusting without certainty.' },
  'hope+fear': { name: 'Courage', emoji: '🦁', description: 'Acting despite fear because something matters more.' },

  'chaos+order': { name: 'Balance', emoji: '⚖️', description: 'The dance between structure and spontaneity.' },
  'chaos+nature': { name: 'Evolution', emoji: '🧬', description: 'Random change kept by what works.' },

  'nature+death': { name: 'Cycle', emoji: '🔄', description: 'All that dies feeds new life.' },
  'nature+beauty': { name: 'Wonder', emoji: '🌺', description: 'Amazement at what exists without us.' },
  'nature+self': { name: 'Instinct', emoji: '🐾', description: 'The animal wisdom within.' },

  'self+other': { name: 'Relationship', emoji: '🔗', description: 'Where I end and you begin becomes unclear.' },

  'wisdom+courage': { name: 'Virtue', emoji: '🏛️', description: 'Excellence of character, practised until it is natural.' },
  'grief+hope': { name: 'Healing', emoji: '🩹', description: 'Pain slowly becoming room to grow.' },
  'anxiety+patience': { name: 'Acceptance', emoji: '🙏', description: 'Finding peace with what cannot be changed.' },
  'mortality+legacy': { name: 'Meaning', emoji: '💫', description: 'What makes a finite life worthwhile.' },
  'empathy+understanding': { name: 'Compassion', emoji: '❤️', description: 'Feeling with others, and acting to help.' },
  'vulnerability+trust': { name: 'Intimacy', emoji: '💞', description: 'Two people meeting without armour.' },
  'authenticity+discipline': { name: 'Mastery', emoji: '🥋', description: 'Becoming fully yourself through steady practice.' },
}

const comboKey = (first: string, second: string) =>
  [first.trim().toLowerCase(), second.trim().toLowerCase()].sort().join('+')

const KNOWN_BY_SORTED_KEY = new Map<string, Combination>(
  Object.entries(KNOWN_COMBINATIONS).map(([key, combination]) => {
    const [first, second] = key.split('+')
    return [comboKey(first, second), combination]
  })
)

export function findKnownCombination(first: string, second: string): Combination | undefined {
  return KNOWN_BY_SORTED_KEY.get(comboKey(first, second))
}

export function isGolden(name: string): boolean {
  return GOLDEN_IDEAS.some(golden => golden.name.toLowerCase() === name.trim().toLowerCase())
}
