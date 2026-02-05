/**
 * Audio Utilities for Avatar Providers
 *
 * Converts ElevenLabs PCM16 audio data to Web Audio API AudioBuffer
 * for use with TalkingHead's speakAudio() method.
 */

/**
 * Convert raw PCM16 (16-bit signed, mono, 16kHz) ArrayBuffer
 * to a Web Audio AudioBuffer that TalkingHead can consume.
 */
export function pcm16ToAudioBuffer(
  pcm16Data: ArrayBuffer,
  sampleRate: number = 16000
): AudioBuffer {
  const int16Array = new Int16Array(pcm16Data)
  const audioContext = new AudioContext({ sampleRate })
  const audioBuffer = audioContext.createBuffer(1, int16Array.length, sampleRate)
  const channelData = audioBuffer.getChannelData(0)

  // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
  for (let i = 0; i < int16Array.length; i++) {
    channelData[i] = int16Array[i] / 32768
  }

  return audioBuffer
}

/**
 * Convert raw PCM16 ArrayBuffer to a Float32Array normalized to [-1.0, 1.0].
 * Simpler alternative when AudioBuffer isn't needed.
 */
export function pcm16ToFloat32(pcm16Data: ArrayBuffer): Float32Array {
  const int16Array = new Int16Array(pcm16Data)
  const float32Array = new Float32Array(int16Array.length)

  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768
  }

  return float32Array
}
