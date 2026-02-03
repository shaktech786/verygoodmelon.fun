import { NextResponse } from 'next/server'
import { getElevenLabsVoice } from '@/lib/games/timeless-minds/elevenlabs-voices'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

/**
 * POST /api/timeless-minds/tts
 *
 * Converts text to speech using ElevenLabs API.
 * Returns PCM16 audio data at 16kHz (required by Simli).
 *
 * Falls back to a simple response if ElevenLabs is unavailable.
 */
export async function POST(request: Request) {
  try {
    const { text, thinkerId } = await request.json()

    if (!text || !thinkerId) {
      return NextResponse.json(
        { error: 'Missing text or thinkerId' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured', fallback: true },
        { status: 503 }
      )
    }

    const voiceConfig = getElevenLabsVoice(thinkerId)

    // Call ElevenLabs TTS API
    // Use PCM 16kHz format for Simli compatibility
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceConfig.voiceId}?output_format=pcm_16000`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: voiceConfig.stability,
            similarity_boost: voiceConfig.similarityBoost,
            style: voiceConfig.style,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('ElevenLabs API error:', response.status, errorBody)

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid ElevenLabs API key', fallback: true },
          { status: 503 }
        )
      }

      if (response.status === 429) {
        return NextResponse.json(
          { error: 'ElevenLabs rate limit exceeded', fallback: true },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: 'ElevenLabs TTS failed', fallback: true },
        { status: 503 }
      )
    }

    // Return raw PCM audio as binary
    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/pcm',
        'X-Audio-Format': 'pcm_16000',
        'X-Sample-Rate': '16000',
        'X-Voice-Id': voiceConfig.voiceId,
        'X-Voice-Name': voiceConfig.voiceName,
      },
    })
  } catch (error) {
    console.error('TTS route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', fallback: true },
      { status: 500 }
    )
  }
}
