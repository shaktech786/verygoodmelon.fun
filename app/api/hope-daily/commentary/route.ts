import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Validate API key on initialization
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error('OPENAI_API_KEY environment variable is not configured')
}

const openai = new OpenAI({
  apiKey
})

export async function POST(request: NextRequest) {
  try {
    const { guess, isCorrect, isInvalid } = await request.json()

    if (!guess || typeof guess !== 'string') {
      return NextResponse.json({ error: 'Invalid guess' }, { status: 400 })
    }

    // Build context for AI
    let context = ''
    if (isInvalid) {
      context = `The user guessed "${guess}" which is not a valid word. Make a fun, witty remark about the word itself or how it sounds!`
    } else if (isCorrect) {
      context = `The user correctly guessed "${guess}"! Make a celebratory comment that relates to what the word "${guess}" represents!`
    } else {
      // Make commentary about the word itself
      context = `The user guessed "${guess}" in a word puzzle about global progress and positive change. Make a witty, fun comment about the word "${guess}" itself - what it means, what it represents, or something clever about it. Don't focus on whether it's right or wrong, just be playful about the word they chose!`
    }

    const systemPrompt = `You are a fun, playful commentator for a word guessing game called "Hope Daily" about global progress and positive change.
Your job is to make witty, relevant comments about the WORDS themselves, not about game mechanics.

Guidelines:
- Keep it VERY short (max 10-15 words)
- Comment on what the WORD means, represents, or is associated with
- Be light, playful, and clever
- Use emojis sparingly (max 1-2)
- Make puns, wordplay, or cultural references when appropriate
- Keep the tone positive and uplifting (matching the game's theme of hope and progress)
- Be creative and varied - don't repeat yourself
- DON'T say things like "close", "almost", "warm" unless it's a pun about the word itself

Examples for different guesses:
- User guesses "PEACE": "Inner peace or world peace? Why not both! ☮️"
- User guesses "WATER": "The universal solvent! H2O know it's important 💧"
- User guesses "SOLAR": "Bright idea! The sun is our biggest power source ☀️"
- User guesses "TREES": "Nature's air purifiers and carbon storage! 🌳"
- User guesses "QWERT": "Looks like someone keyboard-smashed! 😅"
- User guesses "HELPS": "Love the positive energy! We all need helpers 🤝"
- User guesses "UNITY": "Together we're stronger! That's the spirit ✊"
- Correct guess "CURES": "Healing the world, one cure at a time! 🎉"`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ],
      temperature: 0.9,
      max_tokens: 30
    })

    const commentary = completion.choices[0].message.content?.trim() || "Nice try! Keep going!"

    return NextResponse.json({ commentary })

  } catch (error) {
    console.error('Commentary generation error:', error)
    // Return a generic comment on error
    return NextResponse.json({ commentary: "Nice try! Keep going!" })
  }
}
