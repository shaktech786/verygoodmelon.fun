/**
 * SoundToggle
 *
 * A small, unobtrusive floating button for toggling ambient soundscapes
 * on game pages, stacked above the accessibility button so neither covers the other.
 *
 * - Fades in 2 seconds after mount so it does not distract from game entry.
 * - Displays a CSS-only volume wave animation when playing.
 * - Fully keyboard accessible with visible focus ring.
 * - Respects prefers-reduced-motion for the wave animation.
 */

'use client'

import { useState, useEffect } from 'react'
import { VolumeX } from 'lucide-react'
import { useAmbientSound } from '@/lib/hooks/useAmbientSound'

interface SoundToggleProps {
  /** Game ID used to select the correct soundscape preset. */
  gameId: string
}

export function SoundToggle({ gameId }: SoundToggleProps) {
  const sound = useAmbientSound({ gameId })
  const [visible, setVisible] = useState(false)

  // Fade in after 2 seconds
  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(id)
  }, [])

  return (
    <>
      {/* CSS-only wave animation styles */}
      <style>{`
        @keyframes sound-wave-1 {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
        @keyframes sound-wave-2 {
          0%, 100% { height: 6px; }
          50% { height: 16px; }
        }
        @keyframes sound-wave-3 {
          0%, 100% { height: 3px; }
          50% { height: 10px; }
        }
        .sound-wave-bar {
          width: 2px;
          border-radius: 1px;
          background: currentColor;
        }
        .sound-wave-bar:nth-child(1) {
          animation: sound-wave-1 1.2s ease-in-out infinite;
        }
        .sound-wave-bar:nth-child(2) {
          animation: sound-wave-2 1.0s ease-in-out infinite 0.15s;
        }
        .sound-wave-bar:nth-child(3) {
          animation: sound-wave-3 1.4s ease-in-out infinite 0.3s;
        }
        @media (prefers-reduced-motion: reduce) {
          .sound-wave-bar {
            animation: none !important;
            height: 8px !important;
          }
        }
      `}</style>

      <button
        onClick={sound.toggle}
        aria-label="Ambient sound"
        aria-pressed={sound.isPlaying}
        title={sound.isPlaying ? 'Turn ambient sound off' : 'Turn ambient sound on'}
        className={`
          fixed bottom-[5.25rem] right-7 sm:bottom-[5.75rem] sm:right-8 z-50
          w-10 h-10
          flex items-center justify-center
          rounded-full
          bg-card-bg/90 backdrop-blur-sm
          border border-card-border
          shadow-lg
          text-foreground hover:text-accent
          transition-all duration-300
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
        `}
      >
        {sound.isPlaying ? (
          <span className="flex items-end gap-[2px] h-4" aria-hidden="true">
            <span className="sound-wave-bar" />
            <span className="sound-wave-bar" />
            <span className="sound-wave-bar" />
          </span>
        ) : (
          <VolumeX size={18} aria-hidden="true" />
        )}
      </button>
    </>
  )
}
