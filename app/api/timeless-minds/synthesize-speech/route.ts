import { NextRequest, NextResponse } from 'next/server'
import { avatarProviderRegistry } from '@/lib/games/timeless-minds/avatar-provider'

export async function POST(request: NextRequest) {
  try {
    const { text, thinkerId, emotion } = await request.json()

    if (!text || !thinkerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get active avatar provider
    const provider = avatarProviderRegistry.getActive()

    // Synthesize speech
    const result = await provider.synthesizeSpeech({
      text,
      thinkerId,
      emotion: emotion || 'neutral'
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Speech synthesis error:', error)
    return NextResponse.json(
      { error: 'Failed to synthesize speech' },
      { status: 500 }
    )
  }
}
