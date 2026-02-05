/**
 * TalkingHead GLB Model Mapping
 *
 * Maps thinker IDs to Mixamo-compatible GLB models with ARKit/Oculus viseme blend shapes.
 * Starts with generic models; custom per-thinker models can be added later.
 *
 * Models must have:
 * - ARKit or Oculus blend shapes for lip-sync
 * - Bone structure compatible with Mixamo animations
 */

export interface TalkingHeadModelConfig {
  /** URL to the GLB model file */
  modelUrl: string
  /** Display-friendly label */
  label: string
  /** Body type hint for animation selection */
  bodyType: 'male' | 'female'
  /** Age bracket for voice/animation tuning */
  ageGroup: 'young' | 'adult' | 'elder'
}

/**
 * Generic starter models hosted in /public/games/timeless-minds/models/.
 * These are placeholders — replace with actual GLB models.
 *
 * Good sources for compatible models:
 * - Ready Player Me (free, has ARKit blend shapes)
 * - Mixamo (free, rigged)
 * - TalkingHead repo examples
 */
const GENERIC_MODELS: Record<string, TalkingHeadModelConfig> = {
  'male-elder': {
    modelUrl: '/games/timeless-minds/models/male-elder.glb',
    label: 'Elder Male',
    bodyType: 'male',
    ageGroup: 'elder',
  },
  'male-adult': {
    modelUrl: '/games/timeless-minds/models/male-adult.glb',
    label: 'Adult Male',
    bodyType: 'male',
    ageGroup: 'adult',
  },
  'female-adult': {
    modelUrl: '/games/timeless-minds/models/female-adult.glb',
    label: 'Adult Female',
    bodyType: 'female',
    ageGroup: 'adult',
  },
}

/** Map thinker IDs to a model key from GENERIC_MODELS */
const THINKER_MODEL_MAP: Record<string, string> = {
  // Ancient — elder males
  'socrates': 'male-elder',
  'plato': 'male-elder',
  'aristotle': 'male-elder',
  'buddha': 'male-adult',

  // Renaissance & Enlightenment
  'leonardo-da-vinci': 'male-elder',
  'shakespeare': 'male-adult',
  'isaac-newton': 'male-adult',
  'benjamin-franklin': 'male-elder',

  // 19th Century
  'marie-curie': 'female-adult',
  'abraham-lincoln': 'male-elder',
  'charles-darwin': 'male-elder',
  'harriet-tubman': 'female-adult',
  'frederick-douglass': 'male-adult',
  'mark-twain': 'male-elder',
  'vincent-van-gogh': 'male-adult',
  'nikola-tesla': 'male-adult',

  // 20th Century
  'mahatma-gandhi': 'male-elder',
  'albert-einstein': 'male-elder',
  'virginia-woolf': 'female-adult',
  'eleanor-roosevelt': 'female-adult',
  'martin-luther-king-jr': 'male-adult',
  'nelson-mandela': 'male-elder',
  'malcolm-x': 'male-adult',
  'rosa-parks': 'female-adult',
  'mother-teresa': 'female-adult',
  'maya-angelou': 'female-adult',
  'james-baldwin': 'male-adult',
  'frida-kahlo': 'female-adult',
  'carl-sagan': 'male-adult',
  'stephen-hawking': 'male-adult',
  'steve-jobs': 'male-adult',
  'anne-frank': 'female-adult',
  'ruth-bader-ginsburg': 'female-adult',
  'cesar-chavez': 'male-adult',
  'helen-keller': 'female-adult',
  'muhammad-ali': 'male-adult',
  'bruce-lee': 'male-adult',
  'bob-marley': 'male-adult',
  'oscar-wilde': 'male-adult',
}

const DEFAULT_MODEL = 'male-adult'

/** Get the TalkingHead model config for a thinker */
export function getTalkingHeadModel(thinkerId: string): TalkingHeadModelConfig {
  const modelKey = THINKER_MODEL_MAP[thinkerId] || DEFAULT_MODEL
  return GENERIC_MODELS[modelKey] || GENERIC_MODELS[DEFAULT_MODEL]
}

/** Get all available model configs (for preloading) */
export function getAllModels(): Record<string, TalkingHeadModelConfig> {
  return { ...GENERIC_MODELS }
}
