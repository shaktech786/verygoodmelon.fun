/**
 * Simli Face ID Mapping
 *
 * Maps thinker IDs to Simli face IDs for real-time video avatars.
 * Custom faces are created by uploading thinker portraits to Simli's API.
 * Falls back to preset faces when custom faces aren't available.
 */

// Simli preset faces as fallbacks
const SIMLI_PRESETS: Record<string, string> = {
  einstein: 'c295e3a2-ed11-48d5-a1bd-ff42ac7eac73',
  cleopatra: 'c7451e55-ea04-41c8-ab47-bdca3e4a03d8',
  doctor: 'f0ba4efe-7946-45de-9955-c04a04c367b9',
  nonna: 'c2f1d5d7-074b-405d-be4c-df52cd52166a',
  tony: 'f1abe833-b44c-4650-a01c-191b9c3c43b8',
  charlotte: 'b1f6ad8f-ed78-430b-85ef-2ec672728104',
  mark: '804c347a-26c9-4dcf-bb49-13df4bed61e8',
  sabour: '7e74d6e7-d559-4394-bd56-4923a3ab75ad',
  hank: 'dd10cb5a-d31d-4f12-b69f-6db3383c006e',
  fred: '1c6aa65c-d858-4721-a4d9-bda9fde03141',
  kate: 'd2a5c7c6-fed9-4f55-bcb3-062f7cd20103',
  laila: 'b9e5fba3-071a-4e35-896e-211c4d6eaa7b',
  tina: 'cace3ef7-a4c4-425d-a8cf-a5358eb0c427',
  zahra: 'afdb6a3e-3939-40aa-92df-01604c23101c',
  madison: '5fc23ea5-8175-4a82-aaaf-cdd8c88543dc',
}

/**
 * Custom face IDs created via Simli's generateFaceID API.
 * Run `scripts/upload-simli-faces.ts` to populate this mapping.
 * These will be loaded from a JSON file at runtime.
 */
let customFaceIds: Record<string, string> = {}

// Thinker → best preset face mapping (gender/age appropriate fallback)
const THINKER_PRESET_FALLBACKS: Record<string, string> = {
  // Male thinkers → male presets
  'socrates': SIMLI_PRESETS.hank,
  'plato': SIMLI_PRESETS.mark,
  'aristotle': SIMLI_PRESETS.tony,
  'buddha': SIMLI_PRESETS.sabour,
  'leonardo-da-vinci': SIMLI_PRESETS.hank,
  'shakespeare': SIMLI_PRESETS.mark,
  'isaac-newton': SIMLI_PRESETS.fred,
  'benjamin-franklin': SIMLI_PRESETS.hank,
  'abraham-lincoln': SIMLI_PRESETS.hank,
  'charles-darwin': SIMLI_PRESETS.hank,
  'frederick-douglass': SIMLI_PRESETS.sabour,
  'mark-twain': SIMLI_PRESETS.hank,
  'vincent-van-gogh': SIMLI_PRESETS.fred,
  'nikola-tesla': SIMLI_PRESETS.tony,
  'mahatma-gandhi': SIMLI_PRESETS.sabour,
  'albert-einstein': SIMLI_PRESETS.einstein,
  'martin-luther-king-jr': SIMLI_PRESETS.sabour,
  'nelson-mandela': SIMLI_PRESETS.sabour,
  'malcolm-x': SIMLI_PRESETS.sabour,
  'james-baldwin': SIMLI_PRESETS.sabour,
  'carl-sagan': SIMLI_PRESETS.mark,
  'stephen-hawking': SIMLI_PRESETS.fred,
  'steve-jobs': SIMLI_PRESETS.tony,
  'cesar-chavez': SIMLI_PRESETS.tony,
  'muhammad-ali': SIMLI_PRESETS.sabour,
  'bruce-lee': SIMLI_PRESETS.tony,
  'bob-marley': SIMLI_PRESETS.sabour,
  'oscar-wilde': SIMLI_PRESETS.mark,

  // Female thinkers → female presets
  'marie-curie': SIMLI_PRESETS.charlotte,
  'harriet-tubman': SIMLI_PRESETS.zahra,
  'virginia-woolf': SIMLI_PRESETS.kate,
  'eleanor-roosevelt': SIMLI_PRESETS.charlotte,
  'rosa-parks': SIMLI_PRESETS.zahra,
  'mother-teresa': SIMLI_PRESETS.nonna,
  'maya-angelou': SIMLI_PRESETS.zahra,
  'frida-kahlo': SIMLI_PRESETS.laila,
  'anne-frank': SIMLI_PRESETS.tina,
  'ruth-bader-ginsburg': SIMLI_PRESETS.nonna,
  'helen-keller': SIMLI_PRESETS.kate,
}

/**
 * Load custom face IDs from the generated mapping file.
 * Called once on module init.
 */
export async function loadCustomFaceIds(): Promise<void> {
  try {
    const response = await fetch('/api/timeless-minds/simli-faces')
    if (response.ok) {
      customFaceIds = await response.json()
    }
  } catch {
    // Custom faces not available, will use presets
  }
}

/**
 * Get the Simli face ID for a thinker.
 * Prefers custom face → preset fallback → default preset.
 */
export function getSimliFaceId(thinkerId: string): string {
  // 1. Custom uploaded face (best match)
  if (customFaceIds[thinkerId]) {
    return customFaceIds[thinkerId]
  }

  // 2. Thinker-specific preset fallback
  if (THINKER_PRESET_FALLBACKS[thinkerId]) {
    return THINKER_PRESET_FALLBACKS[thinkerId]
  }

  // 3. Default generic face
  return SIMLI_PRESETS.mark
}

/**
 * Check if a thinker has a custom (high-quality) face available.
 */
export function hasCustomFace(thinkerId: string): boolean {
  return thinkerId in customFaceIds
}

/**
 * Update face mapping with newly uploaded faces.
 */
export function setCustomFaceIds(mapping: Record<string, string>): void {
  customFaceIds = { ...customFaceIds, ...mapping }
}

/**
 * Get all face IDs (for preloading/status checking).
 */
export function getAllFaceIds(): Record<string, string> {
  return { ...THINKER_PRESET_FALLBACKS, ...customFaceIds }
}
