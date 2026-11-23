'use client'

import { useEffect } from 'react'
import { useAmbientSound } from '@/lib/hooks/useAmbientSound'
import { offerAmbient } from '@/lib/audio/ambient-choice'

/**
 * Gives a game page its ambient soundscape. It draws nothing: the one switch for it is
 * "Ambient sound" in the settings panel, and the sound stays off until the player turns it on.
 */
export function AmbientSoundscape({ gameId }: { gameId: string }) {
  const { isPlaying, toggle } = useAmbientSound({ gameId })

  useEffect(() => offerAmbient({ isPlaying, toggle }), [isPlaying, toggle])

  return null
}
