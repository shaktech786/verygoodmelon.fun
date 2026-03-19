/**
 * Seed thoughts — hand-written philosophical reflections.
 *
 * Each thought is a short, warm observation on themes related to
 * patience, wonder, impermanence, creativity, rest, connection, and perspective.
 * Tone: like a thoughtful friend writing in a journal.
 */

export interface Thought {
  id: string
  slug: string
  title: string
  body: string
  theme: 'patience' | 'wonder' | 'impermanence' | 'creativity' | 'rest' | 'connection' | 'perspective'
  createdAt: string
}

export const THOUGHTS: Thought[] = [
  {
    id: 'rushing-nowhere',
    slug: 'rushing-nowhere',
    title: 'Rushing Nowhere',
    body: `There is a special kind of anxiety that comes from trying to arrive somewhere faster than time allows. You skip meals, skim paragraphs, reply before you have finished reading. The strange part is that rushing rarely delivers you anywhere sooner. It just makes the journey feel worse.

Next time you catch yourself accelerating for no clear reason, try an experiment: slow down by ten percent. Not dramatically — just enough to notice. You will probably arrive at the same moment, but you will actually remember getting there.`,
    theme: 'patience',
    createdAt: '2025-11-12T00:00:00Z',
  },
  {
    id: 'what-games-teach',
    slug: 'what-games-teach',
    title: 'What Games Teach Us About Patience',
    body: `The best games are patient with you. They let you fail, reset, and try again without judgment. They never say "you should have figured this out by now." They just wait.

We rarely extend that same patience to ourselves. We expect to understand things on the first try, to master skills overnight, to feel better immediately after deciding to feel better. But growth works more like a game — iterative, nonlinear, full of surprising detours that turn out to be the point.

Maybe the most useful thing a game can teach you is that starting over is not failure. It is just another turn.`,
    theme: 'patience',
    createdAt: '2025-11-20T00:00:00Z',
  },
  {
    id: 'the-value-of-doing-nothing',
    slug: 'the-value-of-doing-nothing',
    title: 'The Value of Doing Nothing',
    body: `Doing nothing has a terrible reputation. We treat it like laziness, like wasted time, like something to feel guilty about. But most of the ideas that actually matter — the ones that shift how you see things — arrive when you are doing precisely nothing.

Your brain needs unstructured time the way soil needs a fallow season. Not every field should be planted every year. Not every hour should be optimized.

If you spent twenty minutes today staring out a window and thinking about nothing in particular, that was not wasted time. That was maintenance.`,
    theme: 'rest',
    createdAt: '2025-12-01T00:00:00Z',
  },
  {
    id: 'why-we-fear-silence',
    slug: 'why-we-fear-silence',
    title: 'Why We Fear Silence',
    body: `Silence is not empty. That is what makes it uncomfortable. When the noise stops, you hear yourself — your worries, your doubts, the questions you have been drowning out with podcasts and notifications and background television.

But here is the thing about those worries: they were there the whole time. The noise did not make them go away. It just postponed the conversation.

Silence is not the problem. Silence is the room where you finally get to sit down with whatever has been following you. And usually, once you sit with it, it turns out to be smaller than it sounded from the hallway.`,
    theme: 'perspective',
    createdAt: '2025-12-10T00:00:00Z',
  },
  {
    id: 'digital-rest',
    slug: 'digital-rest',
    title: 'Digital Rest',
    body: `There is a kind of tiredness that sleep does not fix. It comes from too many tabs, too many feeds, too many small decisions about what deserves your attention. Your eyes are fine. Your mind is exhausted.

Digital rest is not about quitting technology. It is about noticing when you are consuming out of habit rather than interest. The scroll that continues past the point of enjoyment. The app you open and then cannot remember why.

You do not need a digital detox. You need a digital nap — short, intentional pauses where you let your attention belong to you again.`,
    theme: 'rest',
    createdAt: '2025-12-18T00:00:00Z',
  },
  {
    id: 'incomplete-things',
    slug: 'incomplete-things',
    title: 'The Beauty of Incomplete Things',
    body: `In Japanese aesthetics, there is a word — wabi-sabi — for the beauty of things that are imperfect, impermanent, and incomplete. A cracked bowl mended with gold. A garden that changes with the seasons. A conversation that trails off into comfortable silence.

We spend enormous energy trying to finish things, perfect things, seal them shut. But some of the most beautiful moments in life are the ones that feel unfinished — the book you are still thinking about weeks later, the project that keeps evolving, the friendship that is always becoming something new.

Completion is overrated. What matters is that something is alive.`,
    theme: 'impermanence',
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'small-wonders',
    slug: 'small-wonders',
    title: 'Small Wonders',
    body: `A single raindrop holds about 10 sextillion water molecules, each one having traveled through clouds, rivers, oceans, and the inside of living things before landing on your window. Every puddle is a reunion.

Wonder does not require grand landscapes or rare events. It requires attention. The ordinary world is unreasonably interesting if you look at it for more than a few seconds. A spider building a web is solving an engineering problem. The color of the sky at 6:47 PM is a color that will never exist again in exactly that way.

You do not need to go anywhere to find something astonishing. You just need to stay with what is already here a little longer.`,
    theme: 'wonder',
    createdAt: '2026-01-14T00:00:00Z',
  },
  {
    id: 'creative-permission',
    slug: 'creative-permission',
    title: 'Creative Permission',
    body: `Most people do not stop creating because they run out of ideas. They stop because they decide their ideas are not good enough. Somewhere between childhood and adulthood, we learn that making things requires justification — a purpose, an audience, a standard of quality.

But the act of making something — anything — is valuable on its own. A doodle that goes nowhere. A melody hummed in the shower. A sentence written in the margins of a notebook. These are not failed attempts at art. They are the art.

The permission to create badly is the most important creative tool you will ever own.`,
    theme: 'creativity',
    createdAt: '2026-01-22T00:00:00Z',
  },
  {
    id: 'the-people-you-almost-met',
    slug: 'the-people-you-almost-met',
    title: 'The People You Almost Met',
    body: `Every day you pass hundreds of people you will never know. Some of them would have become important to you — the friend who understands you without explanation, the stranger whose offhand comment rearranges your thinking, the person sitting three seats away who is reading the same book.

Connection is strange because it depends so heavily on proximity and timing. The people who matter most to you matter partly because you happened to be in the same place at the same time. This is not a sad thought. It is a reminder that the next important person in your life might be someone you have not spoken to yet.

Say hello a little more often. The odds are better than you think.`,
    theme: 'connection',
    createdAt: '2026-02-03T00:00:00Z',
  },
  {
    id: 'temporary-everything',
    slug: 'temporary-everything',
    title: 'Temporary Everything',
    body: `Your favorite coffee shop will close one day. The shirt you are wearing will eventually become a rag. The face you see in the mirror is not the face you had ten years ago and not the one you will have ten years from now.

This sounds melancholy, but it is actually the source of most beauty. Sunsets are beautiful because they end. Conversations matter because the moment passes. You cherish certain memories precisely because you cannot go back to them.

Impermanence is not the enemy of meaning. It is the reason meaning exists at all.`,
    theme: 'impermanence',
    createdAt: '2026-02-14T00:00:00Z',
  },
  {
    id: 'the-view-from-here',
    slug: 'the-view-from-here',
    title: 'The View from Here',
    body: `When you are in the middle of something difficult, it fills your entire field of vision. The problem becomes the world. You forget that six months ago you were worried about something completely different, and that worry eventually dissolved without the catastrophe you imagined.

Perspective is not about minimizing what you feel. It is about remembering that your current view is not the only view. The mountain looks different from the top, from the base, and from a plane. The situation you are in right now will look different from next Tuesday.

You do not need to solve the feeling. You just need to remember that feelings move.`,
    theme: 'perspective',
    createdAt: '2026-02-25T00:00:00Z',
  },
  {
    id: 'the-quiet-ones',
    slug: 'the-quiet-ones',
    title: 'The Quiet Ones',
    body: `Some of the most interesting people you know are the ones who talk the least. They are listening — not waiting for their turn, but actually taking in what you are saying and turning it over in their minds. Their silence is not absence. It is a kind of generosity.

We live in a culture that rewards the loudest voice, the fastest take, the most confident opinion. But confidence and volume are not the same as depth. The person who pauses before answering is often the person whose answer is worth waiting for.

There is courage in being quiet. It means you are willing to sit with not knowing — and that is where most real understanding begins.`,
    theme: 'connection',
    createdAt: '2026-03-08T00:00:00Z',
  },
]

/**
 * Look up a thought by slug.
 */
export function getThoughtBySlug(slug: string): Thought | undefined {
  return THOUGHTS.find((t) => t.slug === slug)
}

/**
 * Find a related thought (same theme preferred, otherwise adjacent in list).
 */
export function getRelatedThought(current: Thought): Thought | undefined {
  const sameTheme = THOUGHTS.filter((t) => t.theme === current.theme && t.id !== current.id)
  if (sameTheme.length > 0) {
    return sameTheme[Math.floor(Math.random() * sameTheme.length)]
  }
  const idx = THOUGHTS.findIndex((t) => t.id === current.id)
  const next = (idx + 1) % THOUGHTS.length
  return THOUGHTS[next]
}
