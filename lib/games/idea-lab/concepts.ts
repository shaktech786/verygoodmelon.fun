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

  // The second Work's golds.
  'love+impermanence': { name: 'Gratitude', emoji: '🌻', description: 'Loving what you have while you still have it.' },
  'time+courage': { name: 'Resilience', emoji: '🌳', description: 'Courage that keeps coming back, one ordinary day at a time.' },
  'justice+empathy': { name: 'Forgiveness', emoji: '🫶', description: 'Fairness that remembers the other person is human too.' },
  'balance+patience': { name: 'Serenity', emoji: '🪷', description: 'Steady between the wild and the tidy, and in no hurry.' },
  'relationship+trust': { name: 'Belonging', emoji: '🏡', description: 'The place where you stop checking whether you are welcome.' },
  'self+wisdom': { name: 'Humility', emoji: '🌾', description: 'Knowing enough to know how much you do not.' },
  'freedom+wonder': { name: 'Joy', emoji: '☀️', description: 'Wonder with nowhere else it has to be.' },

  // The rest of the first step: every pair of starting ideas has an answer written by hand.
  'love+knowledge': { name: 'Fascination', emoji: '🔭', description: 'Loving something makes you want to know everything about it.' },
  'love+power': { name: 'Protection', emoji: '🛡️', description: 'Love with strength behind it stands between its people and harm.' },
  'love+beauty': { name: 'Adoration', emoji: '😍', description: 'Love that cannot stop looking.' },
  'love+justice': { name: 'Mercy', emoji: '🤲', description: 'Fairness, softened by caring about the person in front of you.' },
  'love+hope': { name: 'Yearning', emoji: '🌠', description: 'Loving something that has not arrived yet.' },
  'love+chaos': { name: 'Passion', emoji: '🔥', description: 'Love that refuses to stay tidy.' },
  'love+order': { name: 'Commitment', emoji: '💍', description: 'Love that chooses a shape and keeps it.' },
  'love+nature': { name: 'Tenderness', emoji: '🐣', description: 'The care living things give one another without being asked.' },

  'fear+knowledge': { name: 'Caution', emoji: '🚧', description: 'Knowing enough to be careful, not enough to be certain.' },
  'fear+power': { name: 'Control', emoji: '🎛️', description: 'When we are afraid, we grip harder.' },
  'fear+beauty': { name: 'Awe', emoji: '🏔️', description: 'Beauty so large it makes you feel small, and glad to be.' },
  'fear+justice': { name: 'Conscience', emoji: '🧭', description: 'The small fear of doing wrong that keeps you honest.' },
  'fear+chaos': { name: 'Overwhelm', emoji: '🌊', description: 'Too much at once. It passes, and it always has.' },
  'fear+order': { name: 'Perfectionism', emoji: '📏', description: 'Fear, dressed up as high standards.' },
  'fear+nature': { name: 'Alertness', emoji: '🦌', description: 'The old animal part of you, keeping watch.' },
  'fear+other': { name: 'Shyness', emoji: '🙊', description: 'Wanting to be close, and worried about being seen.' },

  'time+power': { name: 'Momentum', emoji: '🚂', description: 'Small efforts, kept up, become hard to stop.' },
  'time+freedom': { name: 'Leisure', emoji: '🛶', description: 'Hours that belong to no one but you.' },
  'time+truth': { name: 'Hindsight', emoji: '🔙', description: 'The truth that only arrives once the moment has passed.' },
  'time+beauty': { name: 'Nostalgia', emoji: '📷', description: 'The past, made lovelier by distance.' },
  'time+justice': { name: 'Amends', emoji: '🧵', description: 'Time gives us the chance to put things right.' },
  'time+nature': { name: 'Seasons', emoji: '🍂', description: 'Everything has its time, and then its time again.' },
  'time+self': { name: 'Growth', emoji: '🌿', description: 'You, slowly becoming more yourself.' },
  'time+other': { name: 'Friendship', emoji: '🫂', description: 'A stranger, given enough time, becomes a friend.' },

  'death+knowledge': { name: 'Perspective', emoji: '🔭', description: 'Knowing life is short shows you what actually matters.' },
  'death+power': { name: 'Surrender', emoji: '🏳️', description: 'Even the strongest let go one day, and there is rest in that.' },
  'death+freedom': { name: 'Release', emoji: '🎈', description: 'Every ending also sets something free.' },
  'death+truth': { name: 'Clarity', emoji: '🔎', description: 'Nothing clears the mind like remembering that it ends.' },
  'death+justice': { name: 'Equality', emoji: '🟰', description: 'In the end, everyone is measured the same.' },
  'death+chaos': { name: 'Transformation', emoji: '🐛', description: 'When things fall apart, they also rearrange.' },
  'death+order': { name: 'Ritual', emoji: '🕯️', description: 'The shapes we give to goodbyes so that we can bear them.' },
  'death+other': { name: 'Mourning', emoji: '🖤', description: 'Grieving together, so no one carries it alone.' },

  'knowledge+freedom': { name: 'Curiosity', emoji: '🧐', description: 'A mind allowed to wander wherever it wants.' },
  'knowledge+beauty': { name: 'Elegance', emoji: '🪶', description: 'When the true answer is also the simplest one.' },
  'knowledge+justice': { name: 'Discernment', emoji: '🧐', description: 'Knowing the difference between what looks right and what is right.' },
  'knowledge+hope': { name: 'Vision', emoji: '🗺️', description: 'Knowing where you are, and imagining where you could be.' },
  'knowledge+chaos': { name: 'Science', emoji: '🔬', description: 'Patient questions, asked of a world that does not explain itself.' },
  'knowledge+order': { name: 'Logic', emoji: '🧩', description: 'Knowledge that holds hands, one step to the next.' },
  'knowledge+nature': { name: 'Ecology', emoji: '🌍', description: 'Learning how everything alive depends on everything else.' },

  'power+truth': { name: 'Conviction', emoji: '📣', description: 'Saying what is true, out loud, and meaning it.' },
  'power+beauty': { name: 'Grace', emoji: '🦢', description: 'Strength that does not need to show off.' },
  'power+hope': { name: 'Determination', emoji: '💪', description: 'Hope that has rolled up its sleeves.' },
  'power+order': { name: 'Leadership', emoji: '🧭', description: 'Strength given a direction, so others can follow.' },
  'power+nature': { name: 'Storm', emoji: '⛈️', description: 'Strength that asks nobody’s permission, and then passes.' },
  'power+other': { name: 'Influence', emoji: '🌐', description: 'The quiet kind of power, lent to you by people who trust you.' },

  'freedom+beauty': { name: 'Expression', emoji: '🎭', description: 'Making something lovely simply because you can.' },
  'freedom+justice': { name: 'Rights', emoji: '📜', description: 'Freedom that belongs to everyone, guarded by fairness.' },
  'freedom+hope': { name: 'Possibility', emoji: '🚪', description: 'An open door, and the feeling it could lead somewhere good.' },
  'freedom+chaos': { name: 'Spontaneity', emoji: '🎲', description: 'Saying yes before the plan is finished.' },
  'freedom+nature': { name: 'Wilderness', emoji: '🏞️', description: 'Land that is still allowed to be itself.' },

  'truth+hope': { name: 'Promise', emoji: '🤙', description: 'Hope that someone is willing to stand behind.' },
  'truth+order': { name: 'Proof', emoji: '✅', description: 'Truth, laid out so that anyone can follow it.' },
  'truth+nature': { name: 'Reality', emoji: '🪨', description: 'What is there when nobody is describing it.' },
  'truth+other': { name: 'Candour', emoji: '🗣️', description: 'Telling someone the truth because you respect them.' },

  'beauty+justice': { name: 'Dignity', emoji: '🕊️', description: 'The worth every person has, whether or not anyone notices.' },
  'beauty+hope': { name: 'Inspiration', emoji: '🎇', description: 'Seeing something lovely and wanting to make your own.' },
  'beauty+self': { name: 'Confidence', emoji: '🌞', description: 'Feeling at home in your own skin.' },
  'beauty+other': { name: 'Admiration', emoji: '👏', description: 'Seeing the best in someone else, and saying so.' },

  'justice+hope': { name: 'Reform', emoji: '🛠️', description: 'Believing things can be made fairer, and starting.' },
  'justice+order': { name: 'Fair Play', emoji: '🤾', description: 'Rules everyone can agree to, because they treat everyone the same.' },
  'justice+nature': { name: 'Consequence', emoji: '🌾', description: 'What you plant, you harvest.' },
  'justice+self': { name: 'Responsibility', emoji: '🎒', description: 'Holding yourself to the fairness you ask of others.' },
  'justice+other': { name: 'Solidarity', emoji: '✊', description: 'Standing up for someone as if their fight were yours.' },

  'hope+order': { name: 'Plan', emoji: '🗒️', description: 'Hope, written down in steps.' },
  'hope+nature': { name: 'Spring', emoji: '🌷', description: 'The world’s oldest promise that things will grow again.' },
  'hope+self': { name: 'Self-Belief', emoji: '🌟', description: 'Hoping for yourself the way a good friend would.' },
  'hope+other': { name: 'Encouragement', emoji: '📣', description: 'Lending someone your hope until they find their own.' },

  'chaos+self': { name: 'Confusion', emoji: '🧶', description: 'Not knowing who you are yet. That is allowed.' },
  'chaos+other': { name: 'Crowd', emoji: '🏙️', description: 'So many lives at once, each the centre of its own story.' },

  'nature+order': { name: 'Pattern', emoji: '🐚', description: 'The spirals and rhythms the world keeps repeating.' },
  'nature+other': { name: 'Kinship', emoji: '🐾', description: 'The feeling that every living thing is family, distantly.' },

  'order+self': { name: 'Habit', emoji: '🗓️', description: 'The small shapes you give your days, which then shape you.' },
  'order+other': { name: 'Society', emoji: '🏘️', description: 'Strangers agreeing on enough to live side by side.' },
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

const KNOWN_BY_NAME = new Map<string, Combination>(
  Object.values(KNOWN_COMBINATIONS).map(combination => [combination.name.toLowerCase(), combination])
)

/** The hand-written result with this name, so an open-ended mix that lands on it is the same concept. */
export function findKnownResult(name: string): Combination | undefined {
  return KNOWN_BY_NAME.get(name.trim().toLowerCase())
}
