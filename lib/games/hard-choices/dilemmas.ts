import type { Theme } from './reading'

export type ChoiceId = 'A' | 'B'

export interface Choice {
  id: ChoiceId
  text: string
  perspective: string
  /** The thing this answer protects, gathered into the player's portrait at the end. */
  value: string
  /** Which way the value leans, so the ending can reflect a pattern back. */
  theme: Theme
}

export interface Dilemma {
  id: string
  scenario: string
  context: string
  choiceA: Choice
  choiceB: Choice
  category: string
  /** Shown once the player has chosen: a thought that holds both answers. */
  carry: string
}

/**
 * Everyday questions about relationships, time, truth, work and self, ordered
 * to begin gently, go deepest in the middle, and end on something small and light.
 * Ids are what votes and saved answers are keyed by: a dilemma whose meaning
 * changes gets a new id, and saved answers to retired ids are dropped on load.
 */
export const DILEMMAS: Dilemma[] = [
  {
    id: 'happiness-vs-meaning',
    scenario: 'Which would you choose for your life?',
    context: 'You can only optimize for one.',
    choiceA: {
      id: 'A',
      text: 'Constant happiness, less meaning',
      perspective: 'What good is purpose if you\'re miserable? Happiness is the actual feeling of life being good.',
      value: 'Joy',
      theme: 'ease',
    },
    choiceB: {
      id: 'B',
      text: 'Deep meaning, less happiness',
      perspective: 'Meaning sustains us through hard stretches. A meaningful life can include struggle and still feel worth it.',
      value: 'Meaning',
      theme: 'growth',
    },
    category: 'Meaning',
    carry: 'Most lives that feel good to look back on hold some of each. The question is only which you reach for first on a hard day.',
  },
  {
    id: 'career-passion',
    scenario: 'How do you want to spend your working life?',
    context: 'You have two paths ahead.',
    choiceA: {
      id: 'A',
      text: 'Financial security doing unfulfilling work',
      perspective: 'Money buys freedom, safety, and options. You can find meaning outside the 9-5.',
      value: 'Security',
      theme: 'ease',
    },
    choiceB: {
      id: 'B',
      text: 'Meaningful work with financial uncertainty',
      perspective: 'You spend a third of your life working. That time should feel like more than just trading hours for money.',
      value: 'Purpose',
      theme: 'growth',
    },
    category: 'Work',
    carry: 'Neither path is permanent. People change course at every age, and this choice can be made again.',
  },
  {
    id: 'free-evening',
    scenario: 'Who gets your one free evening?',
    context: 'An old friend you have drifted from asks to meet, on the only evening this week you had kept for yourself.',
    choiceA: {
      id: 'A',
      text: 'Meet them, and let the evening be theirs',
      perspective: 'Friendships fade quietly when nobody says yes. An evening is a small price for someone coming back into your life.',
      value: 'Friendship',
      theme: 'others',
    },
    choiceB: {
      id: 'B',
      text: 'Keep the evening, and suggest another day',
      perspective: 'A friend worth keeping can wait a week. An evening you protect for yourself is what lets you show up well for everyone else.',
      value: 'Solitude',
      theme: 'self',
    },
    category: 'Time',
    carry: 'A warm "not tonight, but soon" is often heard as a yes. What matters is that the door stays open.',
  },
  {
    id: 'love-or-freedom',
    scenario: 'What matters more to you?',
    context: 'Your soulmate wants to move abroad; you want to stay.',
    choiceA: {
      id: 'A',
      text: 'Follow love, leave your roots',
      perspective: 'People are irreplaceable; places aren\'t. Love that deep is rare and worth restructuring your life around.',
      value: 'Devotion',
      theme: 'others',
    },
    choiceB: {
      id: 'B',
      text: 'Stay true to yourself, even if alone',
      perspective: 'Losing yourself for someone else breeds resentment. The right person would find a way to make it work.',
      value: 'Selfhood',
      theme: 'self',
    },
    category: 'Love',
    carry: 'Love and selfhood are rarely true rivals. Usually the hard part is timing, and timing can be talked about.',
  },
  {
    id: 'radical-honesty',
    scenario: 'Could you live with complete transparency?',
    context: 'For one week, the people close to you can hear your every thought.',
    choiceA: {
      id: 'A',
      text: 'Accept it: nothing to hide',
      perspective: 'Living openly means not needing privacy for shame. It could free you from performing for anyone.',
      value: 'Openness',
      theme: 'others',
    },
    choiceB: {
      id: 'B',
      text: 'Refuse: some thoughts are just noise',
      perspective: 'Not every passing thought reflects who we are. Privacy is room to think something through before it becomes you.',
      value: 'Privacy',
      theme: 'self',
    },
    category: 'Self',
    carry: 'Everyone has passing thoughts they would never act on. A week of hearing them would show that about all of us at once.',
  },
  {
    id: 'friends-manuscript',
    scenario: 'What do you tell a friend about their novel?',
    context: 'They spent three years writing it and ask what you honestly think. You think it is not working yet.',
    choiceA: {
      id: 'A',
      text: 'Tell them, kindly, what is not working',
      perspective: 'They asked because they want it to be good. Honest notes from someone who cares are rare, and they can still fix it.',
      value: 'Candour',
      theme: 'growth',
    },
    choiceB: {
      id: 'B',
      text: 'Tell them what you loved, and let the rest wait',
      perspective: 'Three years of work deserves to be met with warmth first. The notes can come when they ask for them a second time.',
      value: 'Encouragement',
      theme: 'others',
    },
    category: 'Truth',
    carry: 'Both answers want the same thing: for your friend to keep writing. Asking "what kind of read do you want?" can make room for both.',
  },
  {
    id: 'right-or-close',
    scenario: 'You were right. Does it matter?',
    context: 'After an argument with someone you love, you are fairly sure you were right, and they are hurt.',
    choiceA: {
      id: 'A',
      text: 'Apologise for how it went, and let the point go',
      perspective: 'Being close matters more than being correct. You can be sorry for the hurt without saying you were wrong.',
      value: 'Closeness',
      theme: 'others',
    },
    choiceB: {
      id: 'B',
      text: 'Stay gentle, but keep your ground',
      perspective: 'Giving way every time teaches both of you that your view does not count. Kindness and conviction can sit together.',
      value: 'Conviction',
      theme: 'self',
    },
    category: 'Relationships',
    carry: 'Arguments between people who love each other are rarely about the point. They are usually about feeling heard, on both sides.',
  },
  {
    id: 'forgiveness-limits',
    scenario: 'Can you forgive someone who really hurt you?',
    context: 'Someone who let you down badly is genuinely sorry and asks to make things right.',
    choiceA: {
      id: 'A',
      text: 'Forgive, and set the weight down',
      perspective: 'Holding onto anger keeps the hurt alive in you. Forgiveness is a gift to yourself, not just them.',
      value: 'Peace',
      theme: 'ease',
    },
    choiceB: {
      id: 'B',
      text: 'Some hurts do not have to be forgiven',
      perspective: 'Not every wound needs a ribbon on it. Saying "this mattered" is a way of taking yourself seriously.',
      value: 'Self-respect',
      theme: 'self',
    },
    category: 'Relationships',
    carry: 'Forgiving can mean setting the weight down without saying it was okay. And it can wait until you are ready.',
  },
  {
    id: 'the-promotion',
    scenario: 'Would you take the promotion?',
    context: 'You are offered the lead on a team you love being part of. You would stop doing the work you enjoy most.',
    choiceA: {
      id: 'A',
      text: 'Take it, and grow into something new',
      perspective: 'Some skills only appear when you are asked to stretch. You may find you love helping others do the work.',
      value: 'Challenge',
      theme: 'growth',
    },
    choiceB: {
      id: 'B',
      text: 'Stay, and keep doing what you love',
      perspective: 'Loving your daily work is rarer than a title. Not every good thing has to become a ladder.',
      value: 'Contentment',
      theme: 'ease',
    },
    category: 'Work',
    carry: 'Neither answer is about ambition. One asks what you could become, the other notices what you already have.',
  },
  {
    id: 'new-city',
    scenario: 'Start fresh, or stay known?',
    context: 'You could move to a city where nobody knows you, or stay where everyone knows your whole story.',
    choiceA: {
      id: 'A',
      text: 'Go where you can begin again',
      perspective: 'A new place lets you try on who you are becoming, without anyone expecting who you were.',
      value: 'Renewal',
      theme: 'growth',
    },
    choiceB: {
      id: 'B',
      text: 'Stay where people know you',
      perspective: 'Being known takes years to build. The people who remember your old self are also the ones who notice how you have grown.',
      value: 'Roots',
      theme: 'others',
    },
    category: 'Self',
    carry: 'Roots travel better than people expect, and new places become familiar sooner than it seems. Both can be visited again.',
  },
  {
    id: 'empty-weekend',
    scenario: 'What do you do with a weekend with no plans?',
    context: 'Two whole days, nothing booked, nobody waiting on you.',
    choiceA: {
      id: 'A',
      text: 'Finally start the thing you keep talking about',
      perspective: 'Ideas get heavier the longer they wait. Two quiet days might be exactly the room it needs to begin.',
      value: 'Making',
      theme: 'growth',
    },
    choiceB: {
      id: 'B',
      text: 'Do nothing at all, on purpose',
      perspective: 'Rest is not a reward for being productive. Empty days are where a tired mind quietly refills.',
      value: 'Rest',
      theme: 'ease',
    },
    category: 'Time',
    carry: 'A first small step on Saturday and a long nap on Sunday is also an answer.',
  },
  {
    id: 'last-slice',
    scenario: 'Who gets the last slice of watermelon?',
    context: 'It is the best one, the cold middle bit. Someone else would like it too, but they would never ask.',
    choiceA: {
      id: 'A',
      text: 'Offer it to them',
      perspective: 'Watching someone enjoy something you gave them is its own kind of sweet.',
      value: 'Generosity',
      theme: 'others',
    },
    choiceB: {
      id: 'B',
      text: 'Eat it yourself, and enjoy every bite',
      perspective: 'Small pleasures count. Letting yourself have the good piece now and then is a kindness too.',
      value: 'Self-kindness',
      theme: 'self',
    },
    category: 'Self',
    carry: 'There will be other watermelons. Whoever had this one, it was a good one.',
  },
]
