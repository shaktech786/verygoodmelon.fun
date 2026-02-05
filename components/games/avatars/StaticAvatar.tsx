'use client'

import { forwardRef, useImperativeHandle, useState, useEffect, useCallback } from 'react'
import type { AvatarComponentProps, AvatarHandle } from '@/lib/games/timeless-minds/avatar-providers/types'
import type { AvatarEmotion } from '@/lib/games/timeless-minds/avatar-provider'

/**
 * Static PNG avatar with subtle speaking animations (scale + glow).
 *
 * This is the simplest provider — no WebRTC, no 3D, no TTS.
 * Audio is handled by the parent via browser TTS.
 * AvatarHandle methods are mostly no-ops.
 */
const StaticAvatar = forwardRef<AvatarHandle, AvatarComponentProps>(
  function StaticAvatar(
    { avatarId, isActive, emotion = 'neutral', onConnectionChange, onSpeakingChange, onError, className = '' },
    ref
  ) {
    const [imageError, setImageError] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)

    // Report "connected" immediately since static always works
    useEffect(() => {
      if (isActive) {
        onConnectionChange?.(true)
      }
      return () => {
        onConnectionChange?.(false)
      }
    }, [isActive, onConnectionChange])

    // Reset image error when avatarId changes
    useEffect(() => {
      setImageError(false)
    }, [avatarId])

    const handleSpeakingChange = useCallback((speaking: boolean) => {
      setIsSpeaking(speaking)
      onSpeakingChange?.(speaking)
    }, [onSpeakingChange])

    useImperativeHandle(ref, () => ({
      sendAudio: () => {
        // Static avatar can't process audio, but we animate as if speaking
        handleSpeakingChange(true)
        // Auto-stop after a reasonable duration estimate
        setTimeout(() => handleSpeakingChange(false), 3000)
      },
      speakText: () => {
        // No built-in TTS — parent handles browser TTS
        handleSpeakingChange(true)
        setTimeout(() => handleSpeakingChange(false), 3000)
      },
      clearBuffer: () => {
        handleSpeakingChange(false)
      },
      isConnected: () => isActive,
    }), [isActive, handleSpeakingChange])

    if (!isActive) return null

    const emotionGlow = getEmotionGlow(emotion)

    return (
      <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
        {!imageError ? (
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarId}
              alt="Thinker avatar"
              className={`w-full h-full object-contain transition-all duration-300 ${
                isSpeaking ? 'scale-105' : 'scale-100'
              }`}
              onError={() => {
                setImageError(true)
                onError?.('Failed to load avatar image')
              }}
            />
            {isSpeaking && (
              <div className={`absolute inset-0 blur-3xl opacity-30 ${emotionGlow}`} />
            )}
          </div>
        ) : (
          <div className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-accent/30 to-success/30 border-4 border-white/20 flex items-center justify-center text-6xl sm:text-8xl md:text-9xl backdrop-blur-sm">
            <span role="img" aria-label="Person silhouette">&#x1F464;</span>
          </div>
        )}
      </div>
    )
  }
)

function getEmotionGlow(emotion: AvatarEmotion): string {
  switch (emotion) {
    case 'happy':
    case 'excited':
      return 'bg-yellow-400'
    case 'concerned':
    case 'sad':
      return 'bg-blue-400'
    case 'thoughtful':
      return 'bg-purple-400'
    default:
      return 'bg-green-400'
  }
}

export default StaticAvatar
