'use client'

import { forwardRef, useImperativeHandle, useState, useEffect, useCallback } from 'react'
import type { AvatarComponentProps, AvatarHandle } from '@/lib/games/timeless-minds/avatar-providers/types'
import { portraitPlates } from '@/lib/games/timeless-minds/portraits'
import { useInkTheme } from '@/lib/design/inks'
import { Icon } from '@/components/seedpress/icons/Icon'
import { cn } from '@/lib/utils/cn'
import styles from './Portrait.module.css'

/**
 * A duotone portrait that fills the thinker's video tile in the Sage's call: an ink plate with the dusk spot ink
 * printed over it. The speaking ring belongs to the tile; the portrait itself stays still.
 */
const StaticAvatar = forwardRef<AvatarHandle, AvatarComponentProps>(
  function StaticAvatar(
    { avatarId, isActive, settled = false, onConnectionChange, onSpeakingChange, onError, className = '' },
    ref
  ) {
    const [imageError, setImageError] = useState(false)
    const theme = useInkTheme()

    useEffect(() => {
      if (isActive) {
        onConnectionChange?.(true)
      }
      return () => {
        onConnectionChange?.(false)
      }
    }, [isActive, onConnectionChange])

    useEffect(() => {
      queueMicrotask(() => setImageError(false))
    }, [avatarId])

    const handleSpeakingChange = useCallback((speaking: boolean) => {
      onSpeakingChange?.(speaking)
    }, [onSpeakingChange])

    useImperativeHandle(ref, () => ({
      sendAudio: () => {
        handleSpeakingChange(true)
        setTimeout(() => handleSpeakingChange(false), 3000)
      },
      speakText: () => {
        handleSpeakingChange(true)
        setTimeout(() => handleSpeakingChange(false), 3000)
      },
      clearBuffer: () => {
        handleSpeakingChange(false)
      },
      isConnected: () => isActive,
    }), [isActive, handleSpeakingChange])

    if (!isActive) return null

    const plates = portraitPlates(avatarId, theme)

    return (
      <div className={cn(styles.frame, settled && styles.settled, className)}>
        {imageError ? (
          <div className={styles.missing}>
            <Icon name="person" size={48} />
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={plates.ink}
              alt=""
              className={styles.plate}
              onError={() => {
                setImageError(true)
                onError?.('Failed to load avatar image')
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={plates.spot} alt="" className={cn(styles.plate, styles.spot)} />
          </>
        )}
      </div>
    )
  }
)

export default StaticAvatar
