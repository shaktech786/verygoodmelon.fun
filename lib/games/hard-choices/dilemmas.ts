export type ChoiceId = 'A' | 'B'

export interface Choice {
  id: ChoiceId
  text: string
  perspective: string
  /** The thing this answer protects, gathered into the player's portrait at the end. */
  value: string
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
 * Ordered to begin gently, go deepest in the middle, and end on letting go.
 * Ids are what votes and saved answers are keyed by: never change one.
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
    },
    choiceB: {
      id: 'B',
      text: 'Deep meaning, less happiness',
      perspective: 'Meaning sustains us through suffering. A deeply meaningful life can include hardship and still be worth living.',
      value: 'Meaning',
    },
    category: 'meaning',
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
    },
    choiceB: {
      id: 'B',
      text: 'Meaningful work with financial uncertainty',
      perspective: 'You spend a third of your life working. That time should feel like more than just trading hours for money.',
      value: 'Purpose',
    },
    category: 'career',
    carry: 'Neither path is permanent. People change course at every age, and this choice can be made again.',
  },
  {
    id: 'simulation-knowledge',
    scenario: 'If reality isn\'t what you think...',
    context: 'You discover evidence that we\'re living in a simulation.',
    choiceA: {
      id: 'A',
      text: 'Accept it and keep living normally',
      perspective: 'Simulated or not, your experiences feel real. Love is still love, pain still hurts. The substrate doesn\'t matter.',
      value: 'Presence',
    },
    choiceB: {
      id: 'B',
      text: 'Try to find ways to "break out" or transcend',
      perspective: 'If there\'s a higher reality, shouldn\'t we strive to reach it? Comfort shouldn\'t stop us from seeking truth.',
      value: 'Truth',
    },
    category: 'metaphysics',
    carry: 'Whatever reality turns out to be made of, the people you love are made of the same stuff you are.',
  },
  {
    id: 'love-or-freedom',
    scenario: 'What matters more to you?',
    context: 'Your soulmate wants to move abroad; you want to stay.',
    choiceA: {
      id: 'A',
      text: 'Follow love, sacrifice your roots',
      perspective: 'People are irreplaceable; places aren\'t. Love that deep is rare and worth restructuring your life around.',
      value: 'Devotion',
    },
    choiceB: {
      id: 'B',
      text: 'Stay true to yourself, even if alone',
      perspective: 'Losing yourself for someone else breeds resentment. The right person would find a way to make it work.',
      value: 'Selfhood',
    },
    category: 'love',
    carry: 'Love and selfhood are rarely true rivals. Usually the hard part is timing, and timing can be talked about.',
  },
  {
    id: 'radical-honesty',
    scenario: 'Could you live with complete transparency?',
    context: 'Everyone can see your every thought for one week.',
    choiceA: {
      id: 'A',
      text: 'Accept it—nothing to hide',
      perspective: 'Living authentically means not needing privacy for shame. This could liberate you from performing.',
      value: 'Openness',
    },
    choiceB: {
      id: 'B',
      text: 'Refuse—some thoughts are just noise',
      perspective: 'Not every passing thought reflects who we are. Privacy protects us from being judged by our worst impulses.',
      value: 'Privacy',
    },
    category: 'identity',
    carry: 'Everyone has passing thoughts they would never act on. A week of seeing them would show that about all of us at once.',
  },
  {
    id: 'trolley-personal',
    scenario: 'Would you sacrifice one to save many?',
    context: 'You can save five strangers by pushing one person in front of a train.',
    choiceA: {
      id: 'A',
      text: 'Push the one person to save five',
      perspective: 'Utilitarian math: five lives saved outweighs one lost. Sometimes the hardest choices are numerically simple.',
      value: 'The greater good',
    },
    choiceB: {
      id: 'B',
      text: 'Refuse to directly cause a death',
      perspective: 'There\'s a moral difference between letting something happen and making it happen. You didn\'t create this situation.',
      value: 'Integrity',
    },
    category: 'ethics',
    carry: 'Both answers take a life seriously. They only disagree about whether doing and allowing are the same thing.',
  },
  {
    id: 'lying-for-good',
    scenario: 'Is a lie ever truly kind?',
    context: 'A dying friend asks if they lived a meaningful life, but you think they wasted their potential.',
    choiceA: {
      id: 'A',
      text: 'Tell them what they need to hear',
      perspective: 'Truth is contextual. Bringing peace to someone\'s final moments is a gift, not a deception.',
      value: 'Comfort',
    },
    choiceB: {
      id: 'B',
      text: 'Be honest, gently',
      perspective: 'Even at the end, people deserve to be treated as capable of handling reality. Patronizing kindness isn\'t kindness.',
      value: 'Honesty',
    },
    category: 'ethics',
    carry: 'There is often a third thing to say that is both true and kind: what they meant to you.',
  },
  {
    id: 'mortality-awareness',
    scenario: 'If you knew the exact date of your death...',
    context: 'A reliable oracle offers to tell you when you will die.',
    choiceA: {
      id: 'A',
      text: 'Learn the date and live intentionally',
      perspective: 'Knowledge is power. Knowing your timeline could help you prioritize what truly matters and avoid wasting time on the trivial.',
      value: 'Clarity',
    },
    choiceB: {
      id: 'B',
      text: 'Remain uncertain and live freely',
      perspective: 'The beauty of life is in its unpredictability. Knowing might paralyze you with countdown anxiety rather than liberating you.',
      value: 'Spontaneity',
    },
    category: 'existential',
    carry: 'You already know the most useful part: the time is limited and the date is unknown. That is enough to choose by today.',
  },
  {
    id: 'legacy-vs-experience',
    scenario: 'How would you spend your final year?',
    context: 'You have one year left to live, fully healthy.',
    choiceA: {
      id: 'A',
      text: 'Create something that outlives you',
      perspective: 'Leaving a lasting impact—art, writing, a foundation—extends your influence beyond your physical existence.',
      value: 'Legacy',
    },
    choiceB: {
      id: 'B',
      text: 'Experience everything you\'ve postponed',
      perspective: 'Life is for living, not performing. The experiences you have are yours alone, and that\'s enough.',
      value: 'Experience',
    },
    category: 'existential',
    carry: 'The things that outlive us are usually made from experiences we fully had. You may not have to pick.',
  },
  {
    id: 'memory-erasure',
    scenario: 'Would you erase your most painful memory?',
    context: 'Perfect technology exists to remove one painful memory forever.',
    choiceA: {
      id: 'A',
      text: 'Yes—remove the source of suffering',
      perspective: 'Why carry unnecessary pain? The memory serves no purpose but to hurt you.',
      value: 'Relief',
    },
    choiceB: {
      id: 'B',
      text: 'No—pain is part of who I am',
      perspective: 'Our struggles shape us. Erasing the memory might erase the lessons and growth that came with it.',
      value: 'Wholeness',
    },
    category: 'identity',
    carry: 'Painful memories tend to soften with time and care, no machine needed. Nothing has to be decided about yours today.',
  },
  {
    id: 'children-climate',
    scenario: 'Would you bring new life into this world?',
    context: 'Climate change and global uncertainty weigh on you.',
    choiceA: {
      id: 'A',
      text: 'Yes—hope is an act of defiance',
      perspective: 'Every generation has faced existential threats. Children bring joy and might be the ones who solve our problems.',
      value: 'Hope',
    },
    choiceB: {
      id: 'B',
      text: 'No—it wouldn\'t be fair to them',
      perspective: 'Choosing not to create suffering is an ethical choice. There are other ways to nurture and contribute.',
      value: 'Care',
    },
    category: 'ethics',
    carry: 'Both answers come from caring about someone who does not exist yet. That care is the part worth keeping.',
  },
  {
    id: 'forgiveness-limits',
    scenario: 'Can you forgive the unforgivable?',
    context: 'Someone who deeply betrayed you genuinely seeks your forgiveness.',
    choiceA: {
      id: 'A',
      text: 'Forgive to free yourself from the weight',
      perspective: 'Holding onto anger is like drinking poison. Forgiveness is a gift to yourself, not just them.',
      value: 'Peace',
    },
    choiceB: {
      id: 'B',
      text: 'Some actions forfeit the right to forgiveness',
      perspective: 'Not all wounds heal. Pretending otherwise diminishes the gravity of what happened to you.',
      value: 'Self-respect',
    },
    category: 'relationships',
    carry: 'Forgiving can mean setting the weight down without saying it was okay. And it can wait until you are ready.',
  },
]
