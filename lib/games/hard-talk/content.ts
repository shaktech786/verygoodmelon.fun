export const TALK_KINDS = ['ask', 'tell', 'sorry', 'problem', 'ending', 'doctor', 'other'] as const
export type TalkKind = (typeof TALK_KINDS)[number]

export const WHO_MAX = 40
export const TEXT_MAX = 280

export interface Prompt {
  line: string
  sub: string
}

export interface Worry {
  id: string
  label: string
  response: string
}

export interface TalkContent {
  label: string
  detail: string
  understand: { heading: string; example: string }
  worries: readonly [Worry, Worry, Worry]
  openings: readonly [string, string, string]
  /** `named` holds {who}, the name or role the player typed: one person or several, so no verb may need to agree with it. */
  them: { named: string; unnamed: string; listen: string }
  carry: readonly string[]
}

export const TALKS: Record<TalkKind, TalkContent> = {
  ask: {
    label: 'Asking for something',
    detail: 'A raise, some help, a change',
    understand: {
      heading: 'What do you most want them to understand?',
      example: '“I’ve taken on more, and I’d like my pay to reflect it.”',
    },
    worries: [
      { id: 'no', label: 'They say no', response: 'A no today isn’t a no forever. You can ask, “What would need to change for this to be a yes?”' },
      { id: 'why', label: 'They ask me to justify it', response: 'You don’t need a speech; two real examples are plenty. It’s also fine to say, “Let me come back to you on that.”' },
      { id: 'nerve', label: 'I lose my nerve', response: 'Then say your first sentence anyway, slowly. Nerves can come along without doing the talking.' },
    ],
    openings: [
      'There’s something I’d like to ask for. Is now a good time?',
      'I’ve been thinking about this for a while, and I’d like to ask you something.',
      'Could we have ten minutes? There’s something I’d like to ask for.',
    ],
    them: {
      named: 'For {who}, today comes with its own pressures too.',
      unnamed: 'They’re a person too, with their own pressures today.',
      listen: 'When they answer, hear all of it before you reply.',
    },
    carry: ['Ask clearly, then let them answer.', 'You’re allowed to ask.', 'Say what you want, then listen.'],
  },
  tell: {
    label: 'Telling someone something hard',
    detail: 'News, a truth, a feeling',
    understand: {
      heading: 'What’s the one thing you need them to hear?',
      example: '“I’ve been struggling, and I didn’t want to hide it from you.”',
    },
    worries: [
      { id: 'reaction', label: 'How they’ll react', response: 'Their first reaction isn’t their last. You can let it land and say, “Take your time.”' },
      { id: 'words', label: 'Finding the words', response: 'Plain words are kind words. “This is hard to say” is a fine place to begin.' },
      { id: 'after', label: 'What happens after', response: 'You don’t have to solve what comes next in one talk. Telling them is plenty for one day.' },
    ],
    openings: [
      'There’s something I want to tell you, and it isn’t easy to say.',
      'I’d like to talk about something important. Can we sit for a minute?',
      'I care about you, so I want to be honest about something.',
    ],
    them: {
      named: '{who} might need a moment with what you say.',
      unnamed: 'They might need a moment with what you say.',
      listen: 'Let there be quiet afterwards. Quiet isn’t a bad sign.',
    },
    carry: ['Say it plainly, then give it room.', 'Honest and kind can go together.', 'Tell it simply. Let it land.'],
  },
  sorry: {
    label: 'Saying sorry',
    detail: 'Making something right',
    understand: {
      heading: 'What are you sorry for, in plain words?',
      example: '“I wasn’t there when you needed me.”',
    },
    worries: [
      { id: 'excuses', label: 'I start explaining myself', response: 'Say sorry first, then pause for a breath. Reasons can wait until they ask.' },
      { id: 'forgive', label: 'They don’t forgive me', response: 'An apology is something you give, not a trade. Their answer is allowed to take time.' },
      { id: 'angry', label: 'They’re angry', response: 'Anger often means it mattered to them. You can listen without defending: “You’re right to be upset.”' },
    ],
    openings: [
      'I owe you an apology, and I’d like to say it properly.',
      'I’m sorry. I’ve been thinking about what I did.',
      'Before anything else, I want to say sorry.',
    ],
    them: {
      named: 'It hurt {who}, and those feelings get to be what they are.',
      unnamed: 'They were hurt, and they get to feel how they feel.',
      listen: 'Listen for what it was like for them. That’s most of an apology.',
    },
    carry: ['Say sorry, then listen.', 'Own it, then let them speak.', 'No “but”. Just sorry, and listening.'],
  },
  problem: {
    label: 'Raising a problem',
    detail: 'Something that keeps bothering you',
    understand: {
      heading: 'What do you want them to understand?',
      example: '“When plans change last minute, I end up feeling like an afterthought.”',
    },
    worries: [
      { id: 'defensive', label: 'They get defensive', response: 'Talk about what happened and how it felt, not who they are. “When this happened, I felt…”' },
      { id: 'backdown', label: 'I back down', response: 'You can say, “I’d like to finish my thought.” Your point can wait a breath, not forever.' },
      { id: 'fight', label: 'It turns into a fight', response: 'You can stop and say, “Let’s take a break and come back to this.” Stepping away is allowed.' },
    ],
    openings: [
      'Something’s been on my mind, and I’d like us to sort it out together.',
      'Can we talk about something that’s been bothering me? I’d like to fix it, not fight.',
      'I want to bring something up, because this matters to me.',
    ],
    them: {
      named: '{who} probably didn’t set out to upset you.',
      unnamed: 'They probably didn’t set out to upset you.',
      listen: 'Ask how it looks from their side, and really listen.',
    },
    carry: ['Talk about what happened, not who they are.', 'Say what you need, then listen.', 'Fix the problem together.'],
  },
  ending: {
    label: 'Ending or changing something',
    detail: 'A relationship, a job, a plan',
    understand: {
      heading: 'What do you most want them to understand?',
      example: '“This is my decision, and it isn’t about one thing you did.”',
    },
    worries: [
      { id: 'hurt', label: 'Seeing them hurt', response: 'You can be kind and clear at the same time. Being vague usually hurts for longer.' },
      { id: 'persuaded', label: 'Being talked out of it', response: 'You’ve already thought this through. It’s okay to say, “I’ve thought about this a lot, and I’ve decided.”' },
      { id: 'guilt', label: 'Feeling like the bad guy', response: 'Ending something honestly isn’t cruel. Caring how they feel is a sign you aren’t.' },
    ],
    openings: [
      'I need to talk with you about something big, and I want to be honest.',
      'This is hard to say, and I’ve thought about it a lot.',
      'I care about you, and I’ve made a decision I need to share.',
    ],
    them: {
      named: '{who} will have their own feelings about this, and that’s okay.',
      unnamed: 'They’ll have their own feelings about this, and that’s okay.',
      listen: 'You don’t have to fix how they feel. Listening is enough.',
    },
    carry: ['Kind and clear can go together.', 'Be clear, be kind, be brief.', 'Honest is the kind way.'],
  },
  doctor: {
    label: 'A doctor or appointment',
    detail: 'Being heard about your health',
    understand: {
      heading: 'What’s the main thing you want them to know?',
      example: '“The pain is worse at night, and it’s been three weeks.”',
    },
    worries: [
      { id: 'forget', label: 'I forget what to ask', response: 'Write your questions on your phone. Reading from a list is completely normal.' },
      { id: 'rushed', label: 'Feeling rushed', response: 'You can say, “Before we finish, I have one more question.” Your questions are part of the appointment.' },
      { id: 'dismissed', label: 'Not being taken seriously', response: 'Describe what you notice and how it affects your days. It’s okay to ask, “What else could it be?”' },
    ],
    openings: [
      'The main thing I’d like help with today is…',
      'Before we start, there are a few things I want to make sure we cover.',
      'Something’s been worrying me, and I’d like to understand it.',
    ],
    them: {
      named: 'With {who}, your questions are welcome. They’re part of why you’re there.',
      unnamed: 'They’re there to help, and your questions are welcome.',
      listen: 'If something isn’t clear, it’s fine to ask them to say it again.',
    },
    carry: ['Your questions belong in the room.', 'Ask until it makes sense.', 'You know your body. Say what you notice.'],
  },
  other: {
    label: 'Something else',
    detail: 'Any talk that’s on your mind',
    understand: {
      heading: 'What do you most want them to understand?',
      example: '“This matters to me, and I’d like us to talk it through.”',
    },
    worries: [
      { id: 'reaction', label: 'How they’ll react', response: 'Their first reaction isn’t their last. You can give them a moment, and yourself one too.' },
      { id: 'words', label: 'Finding the words', response: 'Plain words are kind words. “This is hard to say” is a fine place to begin.' },
      { id: 'blank', label: 'My mind going blank', response: 'Then pause. Silence feels longer to you than to them, and “Give me a second” always works.' },
    ],
    openings: [
      'There’s something I’d like to talk about. Is now a good time?',
      'This matters to me, so I want to say it clearly.',
      'This is a little hard for me to say, so bear with me.',
    ],
    them: {
      named: 'On the other side, {who} may be a little nervous as well.',
      unnamed: 'They’re a whole person too, maybe a little nervous as well.',
      listen: 'When they speak, try to hear them out before you answer.',
    },
    carry: ['Lead with what you want, then listen.', 'Say it simply. Then listen.', 'One true sentence, then listen.'],
  },
}

const SOMETHING_ELSE: Worry = {
  id: 'else',
  label: 'Something else',
  response: 'Whatever it is, you don’t have to handle it perfectly. You can always pause and say, “Let me think about that.”',
}

export function worriesFor(kind: TalkKind): Worry[] {
  return [...TALKS[kind].worries, SOMETHING_ELSE]
}

export const SETTLE: { shoulders: readonly Prompt[]; ground: readonly Prompt[] } = {
  shoulders: [
    { line: 'Let your shoulders drop.', sub: 'Unclench your jaw too, if it’s holding on.' },
    { line: 'Let your shoulders fall away from your ears.', sub: 'Let your hands go loose for a moment.' },
    { line: 'Let your face soften.', sub: 'Your forehead, your jaw, the space between your eyes.' },
  ],
  ground: [
    { line: 'Feel your feet on the floor.', sub: 'The ground is holding you up, so you don’t have to.' },
    { line: 'Notice what’s holding you up.', sub: 'A chair, the floor, a wall. Lean on it for a moment.' },
    { line: 'Press your feet gently into the floor.', sub: 'Notice it pressing back.' },
  ],
}

export const KINDNESS: readonly Prompt[] = [
  { line: 'However it goes, you’re allowed to be kind to yourself afterwards.', sub: 'Hard talks are hard for nearly everyone.' },
  { line: 'You don’t have to say it perfectly.', sub: 'Saying it honestly is plenty. Nobody gets these exactly right.' },
  { line: 'Whatever they say, your feelings make sense.', sub: 'You can be gentle with yourself either way.' },
]

export const CHECK_INS = [
  { id: 'better', label: 'Better than I feared', response: 'That’s worth noticing. Your worry was trying to protect you, and you went anyway.' },
  { id: 'expected', label: 'About as I expected', response: 'You did a hard thing. That counts, whatever came of it.' },
  { id: 'hard', label: 'It was hard', response: 'Thank you for coming back. Hard talks often keep landing after they end, so go gently today.' },
  { id: 'not-yet', label: 'It hasn’t happened yet', response: 'That’s fine. Your line is still here whenever you need it.' },
] as const

export type CheckInId = (typeof CHECK_INS)[number]['id']

export function pick<T>(pool: readonly T[], run: number): T {
  return pool[Math.max(0, run) % pool.length]
}

export function themLine(kind: TalkKind, who: string): string {
  const name = who.trim()
  if (!name) return TALKS[kind].them.unnamed
  const line = TALKS[kind].them.named.replace('{who}', name)
  return line.charAt(0).toUpperCase() + line.slice(1)
}
