'use client'

import { useEffect } from 'react'
import { Stamp } from '@/components/seedpress/Stamp'
import { useAmbientSound } from '@/lib/hooks/useAmbientSound'
import { offerAmbient } from '@/lib/audio/ambient-choice'

interface AmbientSoundscapeProps {
  gameId: string
  /** Also shows a "Sound" stamp beside the title. It switches the same soundscape as the settings panel. */
  stamp?: boolean
}

/**
 * Gives a game page its ambient soundscape. The sound stays off until the player turns it on,
 * from "Ambient sound" in the settings panel or from the page's Sound stamp.
 */
export function AmbientSoundscape({ gameId, stamp = false }: AmbientSoundscapeProps) {
  const { isPlaying, toggle } = useAmbientSound({ gameId })

  useEffect(() => offerAmbient({ isPlaying, toggle }), [isPlaying, toggle])

  if (!stamp) return null
  return (
    <Stamp icon={isPlaying ? 'sound-on' : 'sound-off'} aria-pressed={isPlaying} onClick={toggle}>
      Sound
    </Stamp>
  )
}
