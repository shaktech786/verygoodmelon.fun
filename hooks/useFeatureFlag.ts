'use client'

import { useEffect, useState } from 'react'
import {
  isFeatureEnabledWithOverride,
  getEnabledFeatures,
  trackFeatureFlagCheck
} from '@/lib/features/featureFlags'

/**
 * Hook to check if a feature is enabled
 *
 * @example
 * const isNewUIEnabled = useFeatureFlag('experimental_ui')
 *
 * if (isNewUIEnabled) {
 *   return <NewUI />
 * }
 */
export function useFeatureFlag(
  featureKey: string,
  userId?: string,
  userGroups?: string[]
): boolean {
  const [isEnabled, setIsEnabled] = useState(() =>
    isFeatureEnabledWithOverride(featureKey, userId, userGroups)
  )

  useEffect(() => {
    const enabled = isFeatureEnabledWithOverride(featureKey, userId, userGroups)
    setIsEnabled(enabled)

    // Track feature flag check
    trackFeatureFlagCheck(featureKey, enabled, userId)

    // Listen for storage changes (for override updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'feature_overrides') {
        const newEnabled = isFeatureEnabledWithOverride(featureKey, userId, userGroups)
        setIsEnabled(newEnabled)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [featureKey, userId, userGroups])

  return isEnabled
}

/**
 * Hook to get all enabled features
 *
 * @example
 * const enabledFeatures = useEnabledFeatures()
 * console.log('Enabled features:', enabledFeatures)
 */
export function useEnabledFeatures(
  userId?: string,
  userGroups?: string[]
): string[] {
  const [features, setFeatures] = useState(() =>
    getEnabledFeatures(userId, userGroups)
  )

  useEffect(() => {
    setFeatures(getEnabledFeatures(userId, userGroups))
  }, [userId, userGroups])

  return features
}

/**
 * Hook to check multiple features at once
 *
 * @example
 * const { experimental_ui, dark_mode_v2 } = useFeatureFlags([
 *   'experimental_ui',
 *   'dark_mode_v2'
 * ])
 */
export function useFeatureFlags(
  featureKeys: string[],
  userId?: string,
  userGroups?: string[]
): Record<string, boolean> {
  const [flags, setFlags] = useState(() => {
    const initial: Record<string, boolean> = {}
    featureKeys.forEach(key => {
      initial[key] = isFeatureEnabledWithOverride(key, userId, userGroups)
    })
    return initial
  })

  useEffect(() => {
    const newFlags: Record<string, boolean> = {}
    featureKeys.forEach(key => {
      newFlags[key] = isFeatureEnabledWithOverride(key, userId, userGroups)
      trackFeatureFlagCheck(key, newFlags[key], userId)
    })
    setFlags(newFlags)
  }, [featureKeys, userId, userGroups])

  return flags
}
