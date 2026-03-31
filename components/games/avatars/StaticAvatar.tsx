'use client'

import { forwardRef, useImperativeHandle, useState, useEffect, useCallback } from 'react'
import type { AvatarComponentProps, AvatarHandle } from '@/lib/games/timeless-minds/avatar-providers/types'
import type { AvatarEmotion } from '@/lib/games/timeless-minds/avatar-provider'

/**
 * Static avatar with video-call styling.
 *
 * Uses real portrait photographs with subtle animations
 * to create a live video-call feel:
 * - Slow breathing pulse (scale)
 * - Speaking indicator ring
 * - Vignette overlay for webcam depth
 * - Live indicator dot
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
      <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
        {!imageError ? (
          <div className="relative w-full h-full overflow-hidden rounded-2xl bg-black/90">
            {/* Speaking indicator ring */}
            <div
              className={`absolute inset-0 rounded-2xl transition-all duration-500 z-10 pointer-events-none ${
                isSpeaking
                  ? `ring-2 ${emotionColor.ring} shadow-lg ${emotionColor.shadow}`
                  : 'ring-1 ring-white/10'
              }`}
              aria-hidden="true"
            />

            {/* Portrait image with breathing animation */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarId}
              alt="Thinker avatar"
              className="w-full h-full object-cover"
              style={{
                animation: 'avatar-breathe 4s ease-in-out infinite',
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
                background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
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

            {/* Live indicator */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-medium text-white/80 tracking-wider uppercase">Live</span>
            </div>
          </div>
        ) : (
          <div className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-2xl bg-gradient-to-br from-accent/30 to-success/30 border border-white/10 flex items-center justify-center text-6xl sm:text-8xl md:text-9xl backdrop-blur-sm">
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
