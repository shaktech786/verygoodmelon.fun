/**
 * ElevenLabs Voice Mapping
 *
 * Maps thinker IDs to ElevenLabs voice IDs for realistic TTS.
 * Uses library voices that best approximate each historical figure's
 * expected vocal characteristics.
 */

export interface ElevenLabsVoiceConfig {
  voiceId: string
  voiceName: string
  stability: number
  similarityBoost: number
  style: number
  speed: number
}

// Default ElevenLabs voices that approximate celebrity vocal qualities
// These are from the ElevenLabs public voice library
const VOICE_CONFIGS: Record<string, ElevenLabsVoiceConfig> = {
  // Ancient thinkers - deep, measured, wise male voices
  'socrates': {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian - deep authoritative
    voiceName: 'Brian',
    stability: 0.7,
    similarityBoost: 0.8,
    style: 0.2,
    speed: 0.85,
  },
  'plato': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - calm measured
    voiceName: 'Daniel',
    stability: 0.7,
    similarityBoost: 0.75,
    style: 0.15,
    speed: 0.9,
  },
  'aristotle': {
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum - clear logical
    voiceName: 'Callum',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.1,
    speed: 0.95,
  },
  'buddha': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - serene calm
    voiceName: 'Daniel',
    stability: 0.85,
    similarityBoost: 0.7,
    style: 0.05,
    speed: 0.8,
  },

  // Renaissance - expressive, cultured
  'leonardo-da-vinci': {
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum
    voiceName: 'Callum',
    stability: 0.6,
    similarityBoost: 0.75,
    style: 0.3,
    speed: 1.0,
  },
  'shakespeare': {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian - theatrical
    voiceName: 'Brian',
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.4,
    speed: 0.95,
  },
  'isaac-newton': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
    voiceName: 'Daniel',
    stability: 0.8,
    similarityBoost: 0.75,
    style: 0.1,
    speed: 0.9,
  },
  'benjamin-franklin': {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian
    voiceName: 'Brian',
    stability: 0.65,
    similarityBoost: 0.75,
    style: 0.25,
    speed: 0.95,
  },

  // 19th Century
  'marie-curie': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - determined intelligent
    voiceName: 'Sarah',
    stability: 0.7,
    similarityBoost: 0.8,
    style: 0.15,
    speed: 0.95,
  },
  'abraham-lincoln': {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian - deep measured
    voiceName: 'Brian',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.15,
    speed: 0.85,
  },
  'charles-darwin': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
    voiceName: 'Daniel',
    stability: 0.75,
    similarityBoost: 0.75,
    style: 0.1,
    speed: 0.9,
  },
  'harriet-tubman': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - brave
    voiceName: 'Sarah',
    stability: 0.65,
    similarityBoost: 0.8,
    style: 0.3,
    speed: 0.95,
  },
  'frederick-douglass': {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian - powerful orator
    voiceName: 'Brian',
    stability: 0.6,
    similarityBoost: 0.85,
    style: 0.35,
    speed: 1.0,
  },
  'mark-twain': {
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum - witty
    voiceName: 'Callum',
    stability: 0.55,
    similarityBoost: 0.75,
    style: 0.35,
    speed: 1.05,
  },
  'vincent-van-gogh': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - passionate
    voiceName: 'Daniel',
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.4,
    speed: 0.95,
  },
  'nikola-tesla': {
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum - visionary
    voiceName: 'Callum',
    stability: 0.6,
    similarityBoost: 0.8,
    style: 0.25,
    speed: 1.0,
  },

  // 20th Century
  'mahatma-gandhi': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - peaceful
    voiceName: 'Daniel',
    stability: 0.8,
    similarityBoost: 0.75,
    style: 0.1,
    speed: 0.85,
  },
  'albert-einstein': {
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum - playful intellectual
    voiceName: 'Callum',
    stability: 0.6,
    similarityBoost: 0.8,
    style: 0.25,
    speed: 0.95,
  },
  'virginia-woolf': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - literary introspective
    voiceName: 'Sarah',
    stability: 0.55,
    similarityBoost: 0.8,
    style: 0.3,
    speed: 0.9,
  },
  'eleanor-roosevelt': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - compassionate
    voiceName: 'Sarah',
    stability: 0.7,
    similarityBoost: 0.8,
    style: 0.2,
    speed: 0.95,
  },
  'martin-luther-king-jr': {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian - powerful preacher
    voiceName: 'Brian',
    stability: 0.5,
    similarityBoost: 0.85,
    style: 0.45,
    speed: 0.9,
  },
  'nelson-mandela': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - wise patient
    voiceName: 'Daniel',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.15,
    speed: 0.85,
  },
  'malcolm-x': {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian - intense direct
    voiceName: 'Brian',
    stability: 0.5,
    similarityBoost: 0.85,
    style: 0.4,
    speed: 1.05,
  },
  'rosa-parks': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - quiet strength
    voiceName: 'Sarah',
    stability: 0.8,
    similarityBoost: 0.75,
    style: 0.1,
    speed: 0.9,
  },
  'mother-teresa': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - gentle compassionate
    voiceName: 'Sarah',
    stability: 0.85,
    similarityBoost: 0.7,
    style: 0.05,
    speed: 0.85,
  },
  'maya-angelou': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - poetic warm
    voiceName: 'Sarah',
    stability: 0.6,
    similarityBoost: 0.85,
    style: 0.35,
    speed: 0.9,
  },
  'james-baldwin': {
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum - eloquent
    voiceName: 'Callum',
    stability: 0.55,
    similarityBoost: 0.85,
    style: 0.35,
    speed: 0.95,
  },
  'frida-kahlo': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - passionate
    voiceName: 'Sarah',
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.4,
    speed: 1.0,
  },
  'carl-sagan': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - wonder-filled
    voiceName: 'Daniel',
    stability: 0.65,
    similarityBoost: 0.8,
    style: 0.25,
    speed: 0.9,
  },

  // Contemporary
  'stephen-hawking': {
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum - robotic clarity
    voiceName: 'Callum',
    stability: 0.9,
    similarityBoost: 0.7,
    style: 0.0,
    speed: 0.8,
  },
  'steve-jobs': {
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum - focused intense
    voiceName: 'Callum',
    stability: 0.6,
    similarityBoost: 0.85,
    style: 0.3,
    speed: 1.05,
  },
  'anne-frank': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - young hopeful
    voiceName: 'Sarah',
    stability: 0.65,
    similarityBoost: 0.75,
    style: 0.2,
    speed: 1.0,
  },
  'ruth-bader-ginsburg': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - precise powerful
    voiceName: 'Sarah',
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.15,
    speed: 0.9,
  },
  'cesar-chavez': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - persistent
    voiceName: 'Daniel',
    stability: 0.7,
    similarityBoost: 0.8,
    style: 0.2,
    speed: 0.95,
  },
  'helen-keller': {
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - determined
    voiceName: 'Sarah',
    stability: 0.7,
    similarityBoost: 0.75,
    style: 0.2,
    speed: 0.9,
  },
  'muhammad-ali': {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian - confident playful
    voiceName: 'Brian',
    stability: 0.45,
    similarityBoost: 0.85,
    style: 0.45,
    speed: 1.1,
  },
  'bruce-lee': {
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum - philosophical
    voiceName: 'Callum',
    stability: 0.6,
    similarityBoost: 0.8,
    style: 0.25,
    speed: 1.0,
  },
  'bob-marley': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - peaceful rhythmic
    voiceName: 'Daniel',
    stability: 0.55,
    similarityBoost: 0.75,
    style: 0.35,
    speed: 0.9,
  },
  'oscar-wilde': {
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum - witty theatrical
    voiceName: 'Callum',
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.4,
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
