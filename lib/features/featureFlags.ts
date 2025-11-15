/**
 * Feature Flags System
 * Enable/disable features gradually, A/B test, or roll out to specific users
 */

export interface FeatureFlag {
  key: string
  enabled: boolean
  description: string
  rolloutPercentage?: number // 0-100
  enabledFor?: string[] // User IDs or groups
  enabledAfter?: Date // Enable after specific date
  enabledUntil?: Date // Disable after specific date
}

/**
 * Feature flag definitions
 * Add new features here
 */
export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Example features
  NEW_GAME_ENGINE: {
    key: 'new_game_engine',
    enabled: false,
    description: 'New game engine with better performance',
    rolloutPercentage: 10 // 10% of users
  },

  ADVANCED_ANALYTICS: {
    key: 'advanced_analytics',
    enabled: true,
    description: 'Advanced analytics and tracking',
  },

  EXPERIMENTAL_UI: {
    key: 'experimental_ui',
    enabled: false,
    description: 'Experimental UI improvements',
    enabledFor: ['admin', 'beta-testers']
  },

  DARK_MODE_V2: {
    key: 'dark_mode_v2',
    enabled: false,
    description: 'New dark mode with better contrast',
    rolloutPercentage: 25
  },

  AI_POWERED_HINTS: {
    key: 'ai_powered_hints',
    enabled: true,
    description: 'AI-powered game hints',
  },

  MULTIPLAYER_MODE: {
    key: 'multiplayer_mode',
    enabled: false,
    description: 'Multiplayer game mode',
    enabledAfter: new Date('2025-12-01')
  }
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  featureKey: string,
  userId?: string,
  userGroups?: string[]
): boolean {
  const feature = FEATURE_FLAGS[featureKey]

  if (!feature) {
    console.warn(`[FeatureFlags] Unknown feature: ${featureKey}`)
    return false
  }

  // Check if globally disabled
  if (!feature.enabled) {
    return false
  }

  // Check date constraints
  const now = new Date()
  if (feature.enabledAfter && now < feature.enabledAfter) {
    return false
  }
  if (feature.enabledUntil && now > feature.enabledUntil) {
    return false
  }

  // Check user/group specific enablement
  if (feature.enabledFor && feature.enabledFor.length > 0) {
    if (userId && feature.enabledFor.includes(userId)) {
      return true
    }
    if (userGroups?.some(group => feature.enabledFor?.includes(group))) {
      return true
    }
    return false
  }

  // Check rollout percentage
  if (feature.rolloutPercentage !== undefined) {
    return isInRolloutPercentage(featureKey, userId, feature.rolloutPercentage)
  }

  return true
}

/**
 * Determine if user is in rollout percentage
 * Uses consistent hashing for same user to always get same result
 */
function isInRolloutPercentage(
  featureKey: string,
  userId: string | undefined,
  percentage: number
): boolean {
  if (percentage === 0) return false
  if (percentage === 100) return true

  // Use a consistent hash based on feature + user
  const hashInput = `${featureKey}-${userId || 'anonymous'}`
  const hash = simpleHash(hashInput)
  const bucket = hash % 100

  return bucket < percentage
}

/**
 * Simple hash function for consistent bucketing
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Get all enabled features for a user
 */
export function getEnabledFeatures(
  userId?: string,
  userGroups?: string[]
): string[] {
  return Object.keys(FEATURE_FLAGS).filter(key =>
    isFeatureEnabled(key, userId, userGroups)
  )
}

/**
 * Get feature flag details
 */
export function getFeatureFlag(featureKey: string): FeatureFlag | null {
  return FEATURE_FLAGS[featureKey] || null
}

/**
 * Override feature flag (for testing/development)
 * Stored in localStorage
 */
export function overrideFeature(featureKey: string, enabled: boolean): void {
  if (typeof window === 'undefined') return

  const overrides = getFeatureOverrides()
  overrides[featureKey] = enabled
  localStorage.setItem('feature_overrides', JSON.stringify(overrides))
}

/**
 * Get feature overrides from localStorage
 */
export function getFeatureOverrides(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}

  try {
    const overrides = localStorage.getItem('feature_overrides')
    return overrides ? JSON.parse(overrides) : {}
  } catch {
    return {}
  }
}

/**
 * Clear all feature overrides
 */
export function clearFeatureOverrides(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('feature_overrides')
}

/**
 * Check if feature is enabled with override support
 */
export function isFeatureEnabledWithOverride(
  featureKey: string,
  userId?: string,
  userGroups?: string[]
): boolean {
  // Check for override first
  const overrides = getFeatureOverrides()
  if (featureKey in overrides) {
    return overrides[featureKey]
  }

  return isFeatureEnabled(featureKey, userId, userGroups)
}

/**
 * Feature flag analytics
 */
export interface FeatureFlagMetrics {
  featureKey: string
  enabled: boolean
  userId?: string
  timestamp: number
}

const metricsQueue: FeatureFlagMetrics[] = []

export function trackFeatureFlagCheck(
  featureKey: string,
  enabled: boolean,
  userId?: string
): void {
  metricsQueue.push({
    featureKey,
    enabled,
    userId,
    timestamp: Date.now()
  })

  // Flush metrics every 10 checks
  if (metricsQueue.length >= 10) {
    flushMetrics()
  }
}

function flushMetrics(): void {
  if (metricsQueue.length === 0) return

  // In production, send to analytics service
  console.log('[FeatureFlags] Metrics:', metricsQueue)

  // Clear queue
  metricsQueue.length = 0
}

// Flush metrics on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushMetrics)
}
