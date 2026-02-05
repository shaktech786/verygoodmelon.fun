'use client'

import { forwardRef, useImperativeHandle, useEffect, useRef, useState } from 'react'
import { SimliClient } from 'simli-client'
import type { SimliClientConfig } from 'simli-client'
import type { AvatarComponentProps, AvatarHandle } from '@/lib/games/timeless-minds/avatar-providers/types'

/**
 * Simli WebRTC video avatar, wrapped to conform to AvatarComponentProps/AvatarHandle.
 *
 * The parent sends PCM16 audio via handle.sendAudio() which gets piped to
 * Simli's WebRTC connection for real-time lip-sync.
 */
const SimliAvatar = forwardRef<AvatarHandle, AvatarComponentProps>(
  function SimliAvatar(
    { avatarId, isActive, audioMuted = false, onConnectionChange, onSpeakingChange, onError, className = '' },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)
    const clientRef = useRef<SimliClient | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)

    // Stable callback refs
    const onConnectionChangeRef = useRef(onConnectionChange)
    const onSpeakingChangeRef = useRef(onSpeakingChange)
    const onErrorRef = useRef(onError)
    useEffect(() => { onConnectionChangeRef.current = onConnectionChange }, [onConnectionChange])
    useEffect(() => { onSpeakingChangeRef.current = onSpeakingChange }, [onSpeakingChange])
    useEffect(() => { onErrorRef.current = onError }, [onError])

    // Expose AvatarHandle
    useImperativeHandle(ref, () => ({
      sendAudio: (audioBuffer: ArrayBuffer) => {
        if (!clientRef.current?.isConnected()) return
        const data = new Uint8Array(audioBuffer)
        const chunkSize = 6000
        for (let offset = 0; offset < data.length; offset += chunkSize) {
          const chunk = data.slice(offset, Math.min(offset + chunkSize, data.length))
          clientRef.current.sendAudioData(chunk)
        }
      },
      speakText: () => {
        // Simli can't do built-in TTS — parent should use sendAudio path
        console.warn('[SimliAvatar] speakText not supported, use sendAudio with ElevenLabs PCM16')
      },
      clearBuffer: () => {
        clientRef.current?.ClearBuffer()
      },
      isConnected: () => clientRef.current?.isConnected() ?? false,
    }), [])

    // Simli lifecycle — debounced by 100ms for React strict mode
    useEffect(() => {
      if (!isActive || !avatarId || !videoRef.current || !audioRef.current) return

      let aborted = false
      let client: SimliClient | null = null
      const videoEl = videoRef.current
      const audioEl = audioRef.current

      const timer = setTimeout(() => {
        const initialize = async () => {
          setIsConnecting(true)
          setConnectionError(null)

          try {
            client = new SimliClient()

            const config: SimliClientConfig = {
              apiKey: process.env.NEXT_PUBLIC_SIMLI_API_KEY || '',
              faceID: avatarId,
              handleSilence: true,
              maxSessionLength: 3600,
              maxIdleTime: 300,
              videoRef: videoEl,
              audioRef: audioEl,
              enableConsoleLogs: true,
              session_token: '',
              SimliURL: '',
              maxRetryAttempts: 3,
              retryDelay_ms: 2000,
              videoReceivedTimeout: 15000,
              enableSFU: true,
              model: '',
            }

            client.Initialize(config)

            const connectionTimeout = setTimeout(() => {
              if (aborted) return
              setIsConnecting(false)
              setConnectionError('Connection timed out')
              onErrorRef.current?.('Connection timed out')
            }, 20000)

            client.on('connected', () => {
              clearTimeout(connectionTimeout)
              if (aborted) return
              clientRef.current = client
              setIsConnected(true)
              setIsConnecting(false)
              onConnectionChangeRef.current?.(true)
            })

            client.on('disconnected', () => {
              clearTimeout(connectionTimeout)
              if (aborted) return
              setIsConnected(false)
              onConnectionChangeRef.current?.(false)
            })

            client.on('failed', (reason: string) => {
              clearTimeout(connectionTimeout)
              if (aborted) return
              setIsConnecting(false)
              setIsConnected(false)
              setConnectionError(reason)
              onErrorRef.current?.(reason)
              onConnectionChangeRef.current?.(false)
            })

            client.on('speaking', () => {
              if (aborted) return
              onSpeakingChangeRef.current?.(true)
            })

            client.on('silent', () => {
              if (aborted) return
              onSpeakingChangeRef.current?.(false)
            })

            await client.start()
          } catch (err) {
            if (aborted) return
            const errorMsg = err instanceof Error ? err.message : 'Failed to connect'
            setIsConnecting(false)
            setConnectionError(errorMsg)
            onErrorRef.current?.(errorMsg)
          }
        }

        initialize()
      }, 100)

      return () => {
        clearTimeout(timer)
        aborted = true
        if (client) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = client as any
          c.videoRef = null
          c.audioRef = null
          c.config = null
          c.retryAttempt = 9999
          c.MAX_RETRY_ATTEMPTS = 0
          client.close()
        }
        clientRef.current = null
        setIsConnected(false)
        setIsConnecting(false)
      }
    }, [isActive, avatarId, retryCount])

    const handleRetry = () => setRetryCount((c) => c + 1)

    return (
      <div className={`relative w-full h-full ${className}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            isConnected ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <audio ref={audioRef} autoPlay muted={audioMuted} />

        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/80 text-sm">Connecting video...</p>
            </div>
          </div>
        )}

        {connectionError && !isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-white/60 text-xs mb-2">Live video unavailable</p>
              <button
                onClick={handleRetry}
                className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-sm">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/70 text-[10px]">LIVE</span>
          </div>
        )}
      </div>
    )
  }
)

export default SimliAvatar
