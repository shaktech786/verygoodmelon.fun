'use client'

import { forwardRef, useImperativeHandle, useEffect, useRef, useState, useCallback } from 'react'
import type { AvatarComponentProps, AvatarHandle } from '@/lib/games/timeless-minds/avatar-providers/types'

/**
 * 3D lip-syncing avatar using @met4citizen/talkinghead.
 *
 * The TalkingHead library uses internal dynamic `import(variable)` calls
 * that are incompatible with Turbopack/webpack static analysis.
 * We load it at runtime via a <script> tag to completely bypass bundler analysis.
 *
 * speakText() → TalkingHead's built-in TTS (best lip-sync)
 * sendAudio() → TalkingHead's speakAudio() (approximate lip-sync)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TalkingHeadInstance = any

const TalkingHeadAvatar = forwardRef<AvatarHandle, AvatarComponentProps>(
  function TalkingHeadAvatar(
    { avatarId, isActive, audioMuted = false, onConnectionChange, onSpeakingChange, onError, className = '' },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const headRef = useRef<TalkingHeadInstance>(null)
    const [isReady, setIsReady] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Stable callback refs
    const onConnectionChangeRef = useRef(onConnectionChange)
    const onSpeakingChangeRef = useRef(onSpeakingChange)
    const onErrorRef = useRef(onError)
    useEffect(() => { onConnectionChangeRef.current = onConnectionChange }, [onConnectionChange])
    useEffect(() => { onSpeakingChangeRef.current = onSpeakingChange }, [onSpeakingChange])
    useEffect(() => { onErrorRef.current = onError }, [onError])

    const handleSpeakingStart = useCallback(() => {
      onSpeakingChangeRef.current?.(true)
    }, [])

    const handleSpeakingEnd = useCallback(() => {
      onSpeakingChangeRef.current?.(false)
    }, [])

    // Expose AvatarHandle
    useImperativeHandle(ref, () => ({
      sendAudio: async (audioBuffer: ArrayBuffer) => {
        if (!headRef.current || !isReady) return
        try {
          const { pcm16ToAudioBuffer } = await import(
            '@/lib/games/timeless-minds/avatar-providers/audio-utils'
          )
          const webAudioBuffer = pcm16ToAudioBuffer(audioBuffer)
          handleSpeakingStart()
          await headRef.current.speakAudio(webAudioBuffer)
          handleSpeakingEnd()
        } catch (err) {
          console.warn('[TalkingHead] speakAudio failed:', err)
          handleSpeakingEnd()
        }
      },
      speakText: async (text: string) => {
        if (!headRef.current || !isReady) return
        try {
          handleSpeakingStart()
          await headRef.current.speakText(text)
          handleSpeakingEnd()
        } catch (err) {
          console.warn('[TalkingHead] speakText failed:', err)
          handleSpeakingEnd()
        }
      },
      clearBuffer: () => {
        if (!headRef.current) return
        try {
          headRef.current.stop()
          handleSpeakingEnd()
        } catch {
          // Ignore cleanup errors
        }
      },
      isConnected: () => isReady,
    }), [isReady, handleSpeakingStart, handleSpeakingEnd])

    // Initialize TalkingHead when active
    useEffect(() => {
      if (!isActive || !containerRef.current) return

      let aborted = false
      const container = containerRef.current

      const init = async () => {
        setIsLoading(true)
        setLoadError(null)

        try {
          // Load TalkingHead by bypassing the bundler entirely.
          // Use Function constructor to create a dynamic import that webpack/turbopack
          // won't analyze at build time.
          const loadModule = new Function(
            'return import(/* webpackIgnore: true */ "/talkinghead/talkinghead.mjs")'
          ) as () => Promise<{ TalkingHead: new (container: HTMLElement, options: Record<string, unknown>) => TalkingHeadInstance }>

          const module = await loadModule()
          const { TalkingHead } = module

          if (aborted) return

          const head = new TalkingHead(container, {
            ttsEndpoint: null,
            cameraView: 'upper',
            cameraRotateEnable: false,
            cameraZoomEnable: false,
            cameraPanEnable: false,
            lightAmbientColor: 0xffffff,
            lightAmbientIntensity: 1.5,
            lightDirectColor: 0xffffff,
            lightDirectIntensity: 0.8,
          })

          if (aborted) {
            head.close?.()
            return
          }

          await head.showAvatar(
            { url: avatarId },
            {
              avatarMood: 'neutral',
              avatarMute: audioMuted,
            }
          )

          if (aborted) {
            head.close?.()
            return
          }

          headRef.current = head
          setIsReady(true)
          setIsLoading(false)
          onConnectionChangeRef.current?.(true)
        } catch (err) {
          if (aborted) return
          const errorMsg = err instanceof Error ? err.message : 'Failed to load 3D avatar'
          console.error('[TalkingHead] Init error:', errorMsg)
          setLoadError(errorMsg)
          setIsLoading(false)
          onErrorRef.current?.(errorMsg)
        }
      }

      init()

      return () => {
        aborted = true
        if (headRef.current) {
          try {
            headRef.current.stop()
            headRef.current.close?.()
          } catch {
            // Ignore cleanup errors
          }
          headRef.current = null
        }
        setIsReady(false)
        onConnectionChangeRef.current?.(false)
      }
    }, [isActive, avatarId, audioMuted])

    return (
      <div className={`relative w-full h-full ${className}`}>
        <div
          ref={containerRef}
          className={`w-full h-full transition-opacity duration-300 ${
            isReady ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/80 text-sm">Loading 3D avatar...</p>
            </div>
          </div>
        )}

        {loadError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-white/60 text-xs mb-2">3D avatar unavailable</p>
              <p className="text-white/40 text-[10px]">{loadError}</p>
            </div>
          </div>
        )}

        {isReady && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-sm">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-white/70 text-[10px]">3D</span>
          </div>
        )}
      </div>
    )
  }
)

export default TalkingHeadAvatar
