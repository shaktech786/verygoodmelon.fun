import { NextRequest, NextResponse } from 'next/server'
import { GEMINI_MODEL, MINIMAL_THINKING, getGemini } from '@/lib/ai/gemini'
import { plainSpeech, clampToSentences } from '@/app/api/mind-debate/text'
import { MECHANIC_CATEGORIES, MECHANIC_OPTIONS, type MechanicCategory, type PlayStyle } from '@/app/games/the-mutation/engine/types'

const MECHANIC_DESCRIPTIONS: Record<string, string> = {
  arrow_keys: 'The orb moves with the arrow keys or WASD, with a little drift.',
  mouse_follow: 'The orb glides after the pointer or a finger.',
  stars: 'Small stars appear and bob gently. Touch one to gather it.',
  pulse_gems: 'Gems slowly brighten and dim. Gather one while it shines.',
  chasers: 'Shy round shadows wander slowly through the field on their own paths. Bumping one only nudges the orb away; nothing is lost.',
  sweepers: 'Slow tides of light sweep across and carry the orb along; nothing is lost.',
  blaster: 'The orb sends out light. Light gathers the stars it reaches and turns shadows into stars.',
  phase_dash: 'The orb can glide quickly. Gliding through a shadow turns it into a star.',
  combo_chain: 'Gathering in a steady rhythm grows a glow multiplier. A pause only lowers it one step.',
  gravity_well: 'Lights near the orb drift toward it on their own.',
  score_rush: 'The bloom: every shadow turns to light and stars come thick and bright for the final moments.',
}

const PLAY_STYLES: readonly PlayStyle[] = ['gentle', 'explorer', 'collector', 'bold']

const STYLE_NOTES: Record<PlayStyle, string> = {
  gentle: 'moves little and lets things come to them',
  explorer: 'roams the whole space',
  collector: 'gathers lights steadily',
  bold: 'goes toward the shadows and turns them into stars',
}

// Words that would make an announcement feel threatening or judge the player
const UNKIND = /\b(lethal|kill\w*|destroy\w*|destruct\w*|devastat\w*|obliterat\w*|enem(y|ies)|attack\w*|die|dies|death|dead\w*|danger\w*|panic\w*|surviv\w*|weapon\w*|shoot\w*|bullet\w*|gun\w*|blast\w*|hurt\w*|pain\w*|lazy|lazier|loser\w*|fail\w*|refus\w*|barely|pathetic|stupid)\b/i

const TITLE_MAX = 28
const DESCRIPTION_MAX = 120
const FLAVOR_MAX = 100
const NAME_MAX = 32
const TAGLINE_MAX = 110
const HISTORY_TITLE_MAX = 40

interface PlayerPicture {
  style: PlayStyle
  history: Array<{ id: string; title: string }>
  active: string[]
}

function isCategory(value: unknown): value is MechanicCategory {
  return typeof value === 'string' && (MECHANIC_CATEGORIES as readonly string[]).includes(value)
}

function readPicture(body: Record<string, unknown>): PlayerPicture {
  const profile = typeof body.profile === 'object' && body.profile !== null ? body.profile as Record<string, unknown> : {}
  const style = PLAY_STYLES.find(s => s === profile.playStyle) ?? 'gentle'
  const history = (Array.isArray(body.mutations) ? body.mutations : [])
    .slice(0, MECHANIC_CATEGORIES.length)
    .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null && typeof m.id === 'string' && m.id in MECHANIC_DESCRIPTIONS)
    .map(m => ({ id: m.id as string, title: typeof m.title === 'string' ? plainSpeech(m.title).slice(0, HISTORY_TITLE_MAX) : '' }))
  const active = (Array.isArray(body.activeMechanics) ? body.activeMechanics : [])
    .filter((id): id is string => typeof id === 'string' && id in MECHANIC_DESCRIPTIONS)
  return { style, history, active }
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(999, Math.floor(value))) : 0
}

function shortTitle(text: string, max: number): string {
  const plain = plainSpeech(text).toUpperCase()
  if (plain.length <= max) return plain
  const cut = plain.slice(0, max + 1)
  const space = cut.lastIndexOf(' ')
  return (space > 0 ? cut.slice(0, space) : plain.slice(0, max)).trim()
}

function line(value: unknown, max: number): string {
  return typeof value === 'string' ? clampToSentences(plainSpeech(value), max) : ''
}

function readJson(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in reply')
  return JSON.parse(match[0])
}

const VOICE = `You are the quiet narrator of THE SHAPESHIFTER, a small calm game on a website made to leave people less anxious. The game gains one new rule each wave. Nothing in this game can hurt the player and they cannot lose.
Voice: warm, playful, curious, a little poetic. Never mock or judge the player. Never use words about danger, violence, weapons, death, failure or laziness.`

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  return body.isNaming ? handleNaming(body) : handleMutation(body)
}

async function handleMutation(body: Record<string, unknown>) {
  const { wave, category } = body
  if (!isCategory(category) || typeof wave !== 'number' || !Number.isInteger(wave) || wave < 0 || wave >= MECHANIC_CATEGORIES.length) {
    return NextResponse.json({ error: 'Unknown stage' }, { status: 400 })
  }
  const options = (Array.isArray(body.options) ? body.options : [])
    .filter((id): id is string => typeof id === 'string' && MECHANIC_OPTIONS[category].includes(id))
  if (options.length === 0) {
    return NextResponse.json({ error: 'No rules offered' }, { status: 400 })
  }

  const picture = readPicture(body)

  try {
    const optionsList = options.map(id => `"${id}": ${MECHANIC_DESCRIPTIONS[id]}`).join('\n')
    const choice = options.length === 1
      ? `The new rule is "${options[0]}".`
      : `Choose the rule that would feel most delightful for this player, either one that suits how they play or a gentle surprise. Set "mechanicId" to one of: ${options.map(id => `"${id}"`).join(', ')}.`

    const prompt = `${VOICE}

Rule ${wave + 1} of ${MECHANIC_CATEGORIES.length}. The player ${STYLE_NOTES[picture.style]}.
Rules so far: ${picture.history.map(m => m.title || m.id).join(' → ') || 'none yet'}.

${optionsList}

${choice}

Announce it. Respond ONLY with JSON:
{"mechanicId": "...", "title": "2 to 4 words, ALL CAPS", "description": "what it does, one short sentence", "flavorText": "one kind, playful line about the player or the moment"}`

    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { temperature: 0.9, maxOutputTokens: 300, ...MINIMAL_THINKING },
    })
    const parsed = readJson(result.text ?? '')
    const mechanicId = options.length === 1 ? options[0] : parsed.mechanicId
    // Text written for an unknown rule would describe the wrong thing
    if (typeof mechanicId !== 'string' || !options.includes(mechanicId)) {
      return NextResponse.json({ mechanicId: options[0] })
    }

    const title = typeof parsed.title === 'string' ? shortTitle(parsed.title, TITLE_MAX) : ''
    const description = line(parsed.description, DESCRIPTION_MAX)
    const flavorText = line(parsed.flavorText, FLAVOR_MAX)
    if (!title || !description || UNKIND.test(`${title} ${description} ${flavorText}`)) {
      return NextResponse.json({ mechanicId })
    }
    return NextResponse.json({ mechanicId, title, description, flavorText })
  } catch (error) {
    console.error('Shapeshifter rule announcement failed:', error)
    // The page fills in its own wording for a bare rule id
    return NextResponse.json({ mechanicId: options[0] })
  }
}

async function handleNaming(body: Record<string, unknown>) {
  const picture = readPicture(body)
  const transformed = count(body.transformed)
  const nudges = count(body.nudges)

  try {
    const prompt = `${VOICE}

The player just finished their game. Name it.

How it grew: ${picture.history.map(m => `${m.title || m.id} (${m.id})`).join(', ') || 'six small rules'}.
The player ${STYLE_NOTES[picture.style]} (${picture.style}). They turned ${transformed} shadows into stars and were nudged ${nudges} times.

Give it a name of 2 to 4 words in ALL CAPS that sounds like a gentle retro arcade cabinet, and a one-line tagline that begins "For someone who" and kindly notices how they played.
The tagline must mention something particular to this run, such as one of its rules by name, so no two runs share a line.

Respond ONLY with JSON: {"gameName": "...", "tagline": "..."}`

    const result = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { temperature: 1.0, maxOutputTokens: 150, ...MINIMAL_THINKING },
    })
    const parsed = readJson(result.text ?? '')
    const gameName = typeof parsed.gameName === 'string' ? shortTitle(parsed.gameName, NAME_MAX) : ''
    const tagline = line(parsed.tagline, TAGLINE_MAX)
    if (!gameName || !tagline || UNKIND.test(`${gameName} ${tagline}`)) return NextResponse.json({})
    return NextResponse.json({ gameName, tagline })
  } catch (error) {
    console.error('Shapeshifter naming failed:', error)
    // The page names the game from how it was played
    return NextResponse.json({})
  }
}
