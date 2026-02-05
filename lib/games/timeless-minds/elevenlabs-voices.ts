/**
 * ElevenLabs Voice Mapping
 *
 * Maps thinker IDs to ElevenLabs voice IDs for realistic TTS.
 * Uses 30+ distinct premade voices to match each historical figure's
 * gender, age, accent, and vocal characteristics.
 *
 * Voice IDs from: https://elevenlabs-sdk.mintlify.app/voices/premade-voices
 */

export interface ElevenLabsVoiceConfig {
  voiceId: string
  voiceName: string
  stability: number
  similarityBoost: number
  style: number
  speed: number
}

const VOICE_CONFIGS: Record<string, ElevenLabsVoiceConfig> = {
  // ─── Ancient Thinkers ────────────────────────────────────────────

  'socrates': {
    voiceId: 'JBFqnCBsd6RMkjVDRZzb', // George - raspy British
    voiceName: 'George',
    stability: 0.7,
    similarityBoost: 0.8,
    style: 0.2,
    speed: 0.85,
  },
  'plato': {
    voiceId: 'Zlb1dXrM653N07WRdFW3', // Joseph - dignified British
    voiceName: 'Joseph',
    stability: 0.7,
    similarityBoost: 0.75,
    style: 0.15,
    speed: 0.9,
  },
  'aristotle': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - deep logical British
    voiceName: 'Daniel',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.1,
    speed: 0.95,
  },
  'buddha': {
    voiceId: 'ZQe5CZNOzWyzPSCn5a3c', // James - calm old
    voiceName: 'James',
    stability: 0.85,
    similarityBoost: 0.7,
    style: 0.05,
    speed: 0.8,
  },

  // ─── Renaissance & Enlightenment ─────────────────────────────────

  'leonardo-da-vinci': {
    voiceId: 'zcAOhNBS3c14rBihAFp1', // Giovanni - English-Italian accent
    voiceName: 'Giovanni',
    stability: 0.6,
    similarityBoost: 0.75,
    style: 0.3,
    speed: 1.0,
  },
  'shakespeare': {
    voiceId: 'CYw3kZ02Hs0563khs1Fj', // Dave - British conversational
    voiceName: 'Dave',
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.4,
    speed: 0.95,
  },
  'isaac-newton': {
    voiceId: 'D38z5RcWu1voky8WS1ja', // Fin - old Irish
    voiceName: 'Fin',
    stability: 0.8,
    similarityBoost: 0.75,
    style: 0.1,
    speed: 0.9,
  },
  'benjamin-franklin': {
    voiceId: 't0jbNlBVZ17f02VDIeMI', // Jessie - old raspy American
    voiceName: 'Jessie',
    stability: 0.65,
    similarityBoost: 0.75,
    style: 0.25,
    speed: 0.95,
  },

  // ─── 19th Century ────────────────────────────────────────────────

  'marie-curie': {
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2', // Alice - confident British female
    voiceName: 'Alice',
    stability: 0.7,
    similarityBoost: 0.8,
    style: 0.15,
    speed: 0.95,
  },
  'abraham-lincoln': {
    voiceId: 'flq6f7yk4E4fJM5XTYuZ', // Michael - old American
    voiceName: 'Michael',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.15,
    speed: 0.85,
  },
  'charles-darwin': {
    voiceId: 'JBFqnCBsd6RMkjVDRZzb', // George - raspy British naturalist
    voiceName: 'George',
    stability: 0.75,
    similarityBoost: 0.75,
    style: 0.1,
    speed: 0.9,
  },
  'harriet-tubman': {
    voiceId: 'AZnzlk1XvdvUeBnXmlld', // Domi - strong young female
    voiceName: 'Domi',
    stability: 0.65,
    similarityBoost: 0.8,
    style: 0.3,
    speed: 0.95,
  },
  'frederick-douglass': {
    voiceId: 'pqHfZKP75CvOlQylNhV4', // Bill - strong powerful American
    voiceName: 'Bill',
    stability: 0.6,
    similarityBoost: 0.85,
    style: 0.35,
    speed: 1.0,
  },
  'mark-twain': {
    voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie - casual folksy
    voiceName: 'Charlie',
    stability: 0.55,
    similarityBoost: 0.75,
    style: 0.35,
    speed: 1.05,
  },
  'vincent-van-gogh': {
    voiceId: '29vD33N1CtxCmqQRPOHJ', // Drew - emotional range
    voiceName: 'Drew',
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.4,
    speed: 0.95,
  },
  'nikola-tesla': {
    voiceId: 'VR6AewLTigWG4xSOukaG', // Arnold - crisp precise
    voiceName: 'Arnold',
    stability: 0.6,
    similarityBoost: 0.8,
    style: 0.25,
    speed: 1.0,
  },

  // ─── 20th Century ────────────────────────────────────────────────

  'mahatma-gandhi': {
    voiceId: 'ZQe5CZNOzWyzPSCn5a3c', // James - calm peaceful
    voiceName: 'James',
    stability: 0.8,
    similarityBoost: 0.75,
    style: 0.1,
    speed: 0.85,
  },
  'albert-einstein': {
    voiceId: 'g5CIjZEefAph4nQFvHAz', // Ethan - playful curious
    voiceName: 'Ethan',
    stability: 0.6,
    similarityBoost: 0.8,
    style: 0.25,
    speed: 0.95,
  },
  'virginia-woolf': {
    voiceId: 'pFZP5JQG7iQjIQuC4Bku', // Lily - raspy British female
    voiceName: 'Lily',
    stability: 0.55,
    similarityBoost: 0.8,
    style: 0.3,
    speed: 0.9,
  },
  'eleanor-roosevelt': {
    voiceId: 'XrExE9yKIg1WjnnlVkGX', // Matilda - warm compassionate
    voiceName: 'Matilda',
    stability: 0.7,
    similarityBoost: 0.8,
    style: 0.2,
    speed: 0.95,
  },
  'martin-luther-king-jr': {
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - deep powerful American
    voiceName: 'Adam',
    stability: 0.5,
    similarityBoost: 0.85,
    style: 0.45,
    speed: 0.9,
  },
  'nelson-mandela': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - deep dignified
    voiceName: 'Daniel',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.15,
    speed: 0.85,
  },
  'malcolm-x': {
    voiceId: 'ODq5zmih8GrVes37Dizd', // Patrick - intense shouty
    voiceName: 'Patrick',
    stability: 0.5,
    similarityBoost: 0.85,
    style: 0.4,
    speed: 1.05,
  },
  'rosa-parks': {
    voiceId: 'LcfcDJNUP1GQjkzn1xUU', // Emily - calm quiet strength
    voiceName: 'Emily',
    stability: 0.8,
    similarityBoost: 0.75,
    style: 0.1,
    speed: 0.9,
  },
  'mother-teresa': {
    voiceId: 'ThT5KcBeYPX3keUQqHPh', // Dorothy - pleasant gentle British
    voiceName: 'Dorothy',
    stability: 0.85,
    similarityBoost: 0.7,
    style: 0.05,
    speed: 0.85,
  },
  'maya-angelou': {
    voiceId: 'pMsXgVXv3BLzUgSXRplE', // Serena - warm poetic
    voiceName: 'Serena',
    stability: 0.6,
    similarityBoost: 0.85,
    style: 0.35,
    speed: 0.9,
  },
  'james-baldwin': {
    voiceId: 'TxGEqnHWrfWFTfGW9XjX', // Josh - deep eloquent
    voiceName: 'Josh',
    stability: 0.55,
    similarityBoost: 0.85,
    style: 0.35,
    speed: 0.95,
  },
  'frida-kahlo': {
    voiceId: 'XB0fDUnXU5powFXDhCwa', // Charlotte - accented female
    voiceName: 'Charlotte',
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.4,
    speed: 1.0,
  },
  'carl-sagan': {
    voiceId: 'GBv7mTt0atIp3Br8iCZE', // Thomas - calm wonder
    voiceName: 'Thomas',
    stability: 0.65,
    similarityBoost: 0.8,
    style: 0.25,
    speed: 0.9,
  },

  // ─── Contemporary ────────────────────────────────────────────────

  'stephen-hawking': {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian - deep, high stability for robotic feel
    voiceName: 'Brian',
    stability: 0.9,
    similarityBoost: 0.7,
    style: 0.0,
    speed: 0.8,
  },
  'steve-jobs': {
    voiceId: 'iP95p4xoKVk53GoZ742B', // Chris - casual direct
    voiceName: 'Chris',
    stability: 0.6,
    similarityBoost: 0.85,
    style: 0.3,
    speed: 1.05,
  },
  'anne-frank': {
    voiceId: 'jsCqWAovK2LkecY7zXl4', // Freya - young expressive
    voiceName: 'Freya',
    stability: 0.65,
    similarityBoost: 0.75,
    style: 0.2,
    speed: 1.0,
  },
  'ruth-bader-ginsburg': {
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel - calm measured
    voiceName: 'Rachel',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.15,
    speed: 0.9,
  },
  'cesar-chavez': {
    voiceId: 'yoZ06aMxZJJ28mfd3POQ', // Sam - raspy determined
    voiceName: 'Sam',
    stability: 0.7,
    similarityBoost: 0.8,
    style: 0.2,
    speed: 0.95,
  },
  'helen-keller': {
    voiceId: 'oWAxZDx7w5VEj9dCyTzz', // Grace - Southern American female
    voiceName: 'Grace',
    stability: 0.7,
    similarityBoost: 0.75,
    style: 0.2,
    speed: 0.9,
  },
  'muhammad-ali': {
    voiceId: '2EiwWnXFnvU5JabPnv8n', // Clyde - confident powerful
    voiceName: 'Clyde',
    stability: 0.45,
    similarityBoost: 0.85,
    style: 0.45,
    speed: 1.1,
  },
  'bruce-lee': {
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ', // Liam - young energetic
    voiceName: 'Liam',
    stability: 0.6,
    similarityBoost: 0.8,
    style: 0.25,
    speed: 1.0,
  },
  'bob-marley': {
    voiceId: 'bVMeCyTHy58xNoL34h3p', // Jeremy - musical energy
    voiceName: 'Jeremy',
    stability: 0.55,
    similarityBoost: 0.75,
    style: 0.35,
    speed: 0.9,
  },
  'oscar-wilde': {
    voiceId: 'CYw3kZ02Hs0563khs1Fj', // Dave - British witty conversational
    voiceName: 'Dave',
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.45,
    speed: 1.0,
  },
}

// Default voice for thinkers not explicitly mapped
const DEFAULT_VOICE: ElevenLabsVoiceConfig = {
  voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
  voiceName: 'Daniel',
  stability: 0.65,
  similarityBoost: 0.75,
  style: 0.2,
  speed: 0.95,
}

/**
 * Get the ElevenLabs voice configuration for a thinker.
 */
export function getElevenLabsVoice(thinkerId: string): ElevenLabsVoiceConfig {
  return VOICE_CONFIGS[thinkerId] ?? DEFAULT_VOICE
}

/**
 * Get just the voice ID for a thinker.
 */
export function getVoiceId(thinkerId: string): string {
  return (VOICE_CONFIGS[thinkerId] ?? DEFAULT_VOICE).voiceId
}
