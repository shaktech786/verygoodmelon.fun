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
  {
    id: 'the-comfort-of-routine',
    slug: 'the-comfort-of-routine',
    title: 'The Comfort of Routine',
    body: `There is a particular guilt that comes with enjoying routine. You worry it means you have stopped growing, that you are coasting, that the best parts of your life are behind you. People talk about routines like cages — things to escape from.

But a good routine is not a cage. It is a foundation. It is the steady ground that lets you look up instead of down. The morning coffee, the familiar walk, the way you always check the sky before leaving the house — these are not signs of stagnation. They are the rituals that hold the rest of your life together.

The fear of stagnation is useful in small doses. But most of the time, what feels like standing still is actually standing firm. And there is a difference.`,
    theme: 'patience',
    createdAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'what-boredom-is-asking',
    slug: 'what-boredom-is-asking',
    title: 'What Boredom Is Asking',
    body: `Boredom gets treated like a malfunction — something to fix with another scroll, another episode, another notification. But boredom is not emptiness. It is a signal. Your brain is telling you that the thing you are doing is not the thing you actually want to be doing.

That restless, itchy feeling is not a flaw. It is your mind asking for something real — something that requires enough of your attention that the rest of the noise quiets down. Not necessarily something hard. Just something honest.

The next time you are bored, try sitting with it for two minutes instead of reaching for your phone. Listen to what it is actually asking for. You might be surprised how specific the answer is.`,
    theme: 'wonder',
    createdAt: '2026-03-11T00:00:00Z',
  },
  {
    id: 'finishing-versus-starting',
    slug: 'finishing-versus-starting',
    title: 'Finishing Versus Starting',
    body: `Starting something fills you with energy. Everything is possible, nothing is ruined yet, and the gap between what you imagine and what exists feels exciting rather than discouraging. Starting is hope in motion.

Finishing is different. Finishing is quieter. There is no fanfare, just a strange mixture of pride and loss. The thing you made is now separate from you — fixed, finite, done. It will never again be the thing you are working on. It is now the thing you worked on. Past tense.

Most people think they struggle with starting. But if you look honestly at the pile of half-finished projects in your life, you might realize that starting was never the problem. The hard part was always staying long enough to see it through — and then letting it go.`,
    theme: 'creativity',
    createdAt: '2026-03-12T00:00:00Z',
  },
  {
    id: 'admitting-you-dont-know',
    slug: 'admitting-you-dont-know',
    title: 'The Strange Relief of Not Knowing',
    body: `There is a moment — usually after you have been pretending to understand something for too long — when you finally say, out loud, "I have no idea." And instead of the embarrassment you expected, what arrives is relief. A surprising, physical lightness.

Pretending to know is heavy. It takes constant maintenance. You have to monitor every conversation for the moment someone might ask a follow-up question that exposes the gap. You avoid entire topics, entire people, entire parts of yourself.

Admitting you do not know is not weakness. It is the door to the room where learning actually happens. And the people worth being around are the ones who hear "I don't know" and lean in rather than pull away.`,
    theme: 'perspective',
    createdAt: '2026-03-13T00:00:00Z',
  },
  {
    id: 'how-listening-changes-you',
    slug: 'how-listening-changes-you',
    title: 'How Listening Changes the Listener',
    body: `We talk about listening as though it is something you do for the other person — a gift you give, a courtesy you extend. And it is. But the part no one mentions is what listening does to you.

When you truly listen — not preparing your response, not filtering for relevance, just taking in what someone is saying — you become a slightly different person by the end of the conversation. Their experience rearranges something small inside you. A border shifts. A certainty softens. You walk away carrying a piece of someone else's world, and your own world is wider for it.

This is why the best listeners are rarely the same person twice. Every real conversation changes them. And they let it.`,
    theme: 'connection',
    createdAt: '2026-03-14T00:00:00Z',
  },
  {
    id: 'the-weight-of-simplicity',
    slug: 'the-weight-of-simplicity',
    title: 'The Weight of Keeping Things Simple',
    body: `Simple is hard. Anyone who has tried to explain a complex idea in one sentence, or design a room with less furniture, or say what they actually mean without hedging — they know this. Simplicity is not the absence of effort. It is the result of so much effort that the effort itself disappears.

The temptation is always to add more. More features, more words, more options, more decoration. Adding feels productive. But the real work — the work that nobody sees — is the removing. Figuring out what does not belong and having the discipline to let it go.

There is a weight to keeping things simple. It requires you to make decisions instead of deferring them. To commit to this and not that. But the lightness it creates for everyone else — the clarity, the ease, the feeling of something being exactly right — that is worth the weight.`,
    theme: 'creativity',
    createdAt: '2026-03-15T00:00:00Z',
  },
  {
    id: 'why-smells-stay',
    slug: 'why-smells-stay',
    title: 'Why We Remember Smells More Than Facts',
    body: `You can forget the year something happened, the name of the street, what you were wearing. But the smell of your grandmother's kitchen, the chlorine of a public pool from childhood, the particular rain-on-asphalt scent of a city you visited once — these remain sharp for decades.

Smells bypass the parts of your brain that organize and label. They go straight to the place where feelings live, unedited and unfiltered. A smell does not remind you of a memory. It puts you back inside it. For a half-second, you are not remembering — you are there.

This is why certain moments feel more real than others. Not because they were more important, but because they came with a scent that your brain decided to keep forever, filed under "this mattered," with no further explanation.`,
    theme: 'wonder',
    createdAt: '2026-03-16T00:00:00Z',
  },
  {
    id: 'small-repeated-actions',
    slug: 'small-repeated-actions',
    title: 'How Small Repeated Actions Build Identity',
    body: `You are not defined by your revelations. You are defined by your repetitions. The things you do every day — without thinking, without deciding — are quietly building the person you are becoming. Not the grand gestures, not the turning points. The Tuesday mornings.

The person who reads for ten minutes before bed is becoming a reader. The person who takes a walk after lunch is becoming someone who notices the world. The person who writes one sentence a day is becoming a writer. None of these people decided to transform. They just kept showing up to something small.

Identity is not a decision. It is an accumulation. And the beautiful part is that it works in both directions. You can start a new small thing today, and if you keep doing it, it will eventually stop being something you do and start being something you are.`,
    theme: 'patience',
    createdAt: '2026-03-17T00:00:00Z',
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
