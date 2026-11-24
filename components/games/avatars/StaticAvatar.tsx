'use client'

import { forwardRef, useImperativeHandle, useState, useEffect, useCallback } from 'react'
import type { AvatarComponentProps, AvatarHandle } from '@/lib/games/timeless-minds/avatar-providers/types'
import type { AvatarEmotion } from '@/lib/games/timeless-minds/avatar-provider'

/**
 * A portrait photograph that fills the thinker's video tile in the Sage's call:
 * - Slow breathing pulse (scale), still with reduced motion
 * - Speaking indicator ring
 * - A soft vignette, like an old print
 */
const StaticAvatar = forwardRef<AvatarHandle, AvatarComponentProps>(
  function StaticAvatar(
    { avatarId, isActive, emotion = 'neutral', onConnectionChange, onSpeakingChange, onError, className = '' },
    ref
  ) {
    const [imageError, setImageError] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)

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
      setIsSpeaking(speaking)
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

    const emotionColor = getEmotionColor(emotion)

    return (
      <div className={`relative w-full h-full flex items-center justify-center rounded-[inherit] ${className}`}>
        {!imageError ? (
          <div className="relative w-full h-full overflow-hidden rounded-[inherit] bg-black/90">
            {/* Speaking indicator ring */}
            <div
              className={`absolute inset-0 rounded-[inherit] transition-all duration-500 z-10 pointer-events-none ${
                isSpeaking ? `ring-2 ring-inset ${emotionColor.ring} shadow-lg ${emotionColor.shadow}` : ''
              }`}
              aria-hidden="true"
            />

            {/* Portrait image with breathing animation */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarId}
              alt=""
              className="w-full h-full object-cover"
              style={{
                animation: 'avatar-breathe 4s ease-in-out infinite',
                // Portraits are tall and the call window is wide: keep the face, not the chest, in frame.
                objectPosition: 'center 22%',
              }}
              onError={() => {
                setImageError(true)
                onError?.('Failed to load avatar image')
              }}
            />

            {/* Vignette overlay for depth */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.25) 100%)',
              }}
              aria-hidden="true"
            />

            {/* Speaking glow at bottom */}
            {isSpeaking && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none z-10 transition-opacity duration-300 ${emotionColor.glow}`}
                style={{
                  background: `linear-gradient(to top, ${emotionColor.glowRgb} 0%, transparent 100%)`,
                  opacity: 0.25,
                }}
                aria-hidden="true"
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full rounded-[inherit] bg-gradient-to-br from-warm/30 to-success/30 flex items-center justify-center text-3xl lg:text-7xl">
            <span role="img" aria-label="Person silhouette">&#x1F464;</span>
          </div>
        )}

        {/* Breathing animation keyframes */}
        <style jsx>{`
          @keyframes avatar-breathe {
            0%, 100% { transform: scale(1.02); }
            50% { transform: scale(1.05); }
          }
          @media (prefers-reduced-motion: reduce) {
            img { animation: none !important; transform: scale(1.03); }
          }
        `}</style>
      </div>
    )
  }
)

function getEmotionColor(emotion: AvatarEmotion) {
  switch (emotion) {
    case 'happy':
    case 'excited':
      return {
        ring: 'ring-yellow-400/60',
        shadow: 'shadow-yellow-400/20',
        glow: 'bg-yellow-400',
        glowRgb: 'rgba(250, 204, 21, 0.3)',
      }
    case 'concerned':
    case 'sad':
      return {
        ring: 'ring-blue-400/60',
        shadow: 'shadow-blue-400/20',
        glow: 'bg-blue-400',
        glowRgb: 'rgba(96, 165, 250, 0.3)',
      }
    case 'thoughtful':
      return {
        ring: 'ring-purple-400/60',
        shadow: 'shadow-purple-400/20',
        glow: 'bg-purple-400',
        glowRgb: 'rgba(192, 132, 252, 0.3)',
      }
    default:
      return {
        ring: 'ring-green-400/60',
        shadow: 'shadow-green-400/20',
        glow: 'bg-green-400',
        glowRgb: 'rgba(74, 222, 128, 0.3)',
      }
  }
}

export default StaticAvatar
