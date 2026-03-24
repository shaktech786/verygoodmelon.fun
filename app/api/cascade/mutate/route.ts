import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_MODEL = 'gemini-2.0-flash'

function getGenAI() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_GEMINI_API_KEY not configured')
  return new GoogleGenerativeAI(apiKey)
}

const MECHANIC_DESCRIPTIONS: Record<string, string> = {
  arrow_keys: 'Classic 4/8-directional movement with arrow keys or WASD. Responsive, with slight momentum.',
  mouse_follow: 'Player orb smoothly follows the mouse cursor. Intuitive and fluid.',
  stars: 'Gold stars spawn randomly. Touch to collect for points. Gentle bobbing animation.',
  pulse_gems: 'Cyan gems fade in and out. Can only be caught while glowing. Requires timing.',
  chasers: 'Red square enemies that slowly follow the player. Contact costs points.',
  sweepers: 'Orange energy beams that sweep across the arena. Contact costs points.',
  blaster: 'Press SPACE to shoot cyan projectiles toward the mouse. Destroys chasers.',
  phase_dash: 'Press SPACE to dash with brief invincibility. Dash through enemies to destroy them.',
  combo_chain: 'Chain consecutive collections/kills for a score multiplier. Getting hit resets the chain.',
  gravity_well: 'Collectibles within range are magnetically pulled toward the player.',
  score_rush: 'Everything amplified: 3x spawn rates, 3x score. A 25-second final frenzy.',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Game naming request
    if (body.isNaming) {
      return handleNaming(body)
    }

    // Mutation selection request
    return handleMutation(body)
  } catch (error) {
    console.error('Cascade mutate error:', error)
    return NextResponse.json(
      { error: 'Failed to generate mutation' },
      { status: 500 }
    )
  }
}

async function handleMutation(body: {
  wave: number
  category: string
  options: string[]
  profile: Record<string, unknown> | null
  activeMechanics: string[]
  mutations: Array<{ id: string; title: string }>
}) {
  const { wave, category, options, profile, activeMechanics, mutations } = body

  if (!options || options.length === 0) {
    return NextResponse.json({ error: 'No mechanic options provided' }, { status: 400 })
  }

  // If only one option, use it (e.g., climax = score_rush)
  if (options.length === 1) {
    const id = options[0]
    return generateFlavorText(id, category, profile, activeMechanics, mutations)
  }

  try {
    const model = getGenAI().getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
    })

    const optionsList = options.map(id =>
      `"${id}": ${MECHANIC_DESCRIPTIONS[id] || 'A game mechanic.'}`
    ).join('\n')

    const mutationHistory = mutations.length > 0
      ? `Mutations so far: ${mutations.map(m => m.title).join(' → ')}`
      : 'No mutations yet (this is the first one).'

    const profileDesc = profile
      ? `Play style: ${profile.playStyle}. Movement: ${profile.moveDistance ? 'active' : 'minimal'}. Collection rate: ${profile.collectRate || 0}/s. Kills: ${profile.killRate || 0}/s.`
      : 'New player, no data yet.'

    const prompt = `You are the Game Master of CASCADE, a self-building arcade game. A player is in wave ${wave + 1}/7 and needs a new ${category} mechanic.

${mutationHistory}
${profileDesc}
Active mechanics: ${activeMechanics.join(', ') || 'none'}

CHOOSE ONE mechanic to add:
${optionsList}

Pick whichever would be:
1. Most FUN given how they've been playing
2. Most INTERESTING with existing mechanics
3. Most SURPRISING (playfully challenge their style, or reward it)

Respond ONLY in JSON:
{
  "mechanicId": "${options[0]}" or "${options[1]}",
  "title": "A fun retro announcement (2-4 words, ALL CAPS)",
  "description": "What this does in 1 sentence",
  "flavorText": "A fun one-liner about the player or game state"
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response')

    const parsed = JSON.parse(jsonMatch[0])

    // Validate mechanic ID
    if (!options.includes(parsed.mechanicId)) {
      parsed.mechanicId = options[0]
    }

    return NextResponse.json({
      mechanicId: parsed.mechanicId,
      title: parsed.title || 'NEW MECHANIC',
      description: parsed.description || '',
      flavorText: parsed.flavorText || '',
    })
  } catch (error) {
    console.error('AI mutation selection failed:', error)
    // Fallback: pick first option
    return NextResponse.json({
      mechanicId: options[0],
      title: category.toUpperCase() + ' UNLOCKED',
      description: MECHANIC_DESCRIPTIONS[options[0]] || 'A new mechanic.',
      flavorText: '',
    })
  }
}

async function generateFlavorText(
  mechanicId: string,
  category: string,
  profile: Record<string, unknown> | null,
  activeMechanics: string[],
  mutations: Array<{ id: string; title: string }>,
) {
  try {
    const model = getGenAI().getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 1.0, maxOutputTokens: 200 },
    })

    const prompt = `You are the Game Master of CASCADE. Generate a fun announcement for the "${mechanicId}" mechanic (${category}).
${MECHANIC_DESCRIPTIONS[mechanicId]}
Active mechanics: ${activeMechanics.join(', ')}
Mutation history: ${mutations.map(m => m.title).join(' → ')}
Player style: ${profile?.playStyle || 'unknown'}

Respond ONLY in JSON:
{
  "title": "Fun retro announcement (2-4 words, ALL CAPS)",
  "description": "What this does in 1 sentence",
  "flavorText": "Fun one-liner observation"
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Parse error')

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      mechanicId,
      title: parsed.title || category.toUpperCase() + ' ACTIVATED',
      description: parsed.description || MECHANIC_DESCRIPTIONS[mechanicId] || '',
      flavorText: parsed.flavorText || '',
    })
  } catch {
    return NextResponse.json({
      mechanicId,
      title: category.toUpperCase() + ' ACTIVATED',
      description: MECHANIC_DESCRIPTIONS[mechanicId] || 'A new mechanic.',
      flavorText: '',
    })
  }
}

async function handleNaming(body: {
  mutations: Array<{ id: string; title: string }>
  score: number
  profile: Record<string, unknown> | null
}) {
  const { mutations, score, profile } = body

  try {
    const model = getGenAI().getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 1.0, maxOutputTokens: 150 },
    })

    const mutationList = mutations.map((m, i) => `${i + 1}. ${m.title} (${m.id})`).join('\n')

    const prompt = `CASCADE, a self-building arcade game, just completed. Name this unique game.

Mutations added:
${mutationList}

Final score: ${score}
Player style: ${profile?.playStyle || 'balanced'}

Give this unique game a name (2-4 words, fun and retro-sounding, ALL CAPS) and a one-sentence arcade cabinet tagline.

Respond ONLY in JSON:
{
  "gameName": "NEON HUNTER TURBO",
  "tagline": "Blast through waves in this high-octane shooter-collector."
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Parse error')

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      gameName: parsed.gameName || 'CASCADE UNKNOWN',
      tagline: parsed.tagline || 'A unique game that will never exist again.',
    })
  } catch {
    return NextResponse.json({
      gameName: 'CASCADE #' + Math.floor(Math.random() * 9999),
      tagline: 'A unique game that built itself around you.',
    })
  }
}
