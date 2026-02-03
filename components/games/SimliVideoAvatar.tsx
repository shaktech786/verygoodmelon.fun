'use client'

import { useEffect, useRef, useState } from 'react'
import { SimliClient } from 'simli-client'
import type { SimliClientConfig } from 'simli-client'

export interface SimliVideoAvatarProps {
  faceId: string
  isActive: boolean
  onClientReady?: (client: SimliClient | null) => void
  onSpeakingChange?: (speaking: boolean) => void
  onConnectionChange?: (connected: boolean) => void
  onError?: (error: string) => void
  className?: string
}

/**
 * Real-time video avatar using Simli's WebRTC lip-sync technology.
 *
 * The parent component receives the SimliClient via onClientReady callback
 * and can call sendAudioData(Uint8Array) to pipe TTS audio for lip-sync.
 *
 * Audio format: PCM16, 16kHz, mono
 */
export default function SimliVideoAvatar({
  faceId,
  isActive,
  onClientReady,
  onSpeakingChange,
  onConnectionChange,
  onError,
  className = '',
}: SimliVideoAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const simliClientRef = useRef<SimliClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Stable callback refs to avoid stale closures without triggering re-renders
  const onClientReadyRef = useRef(onClientReady)
  const onConnectionChangeRef = useRef(onConnectionChange)
  const onErrorRef = useRef(onError)
  const onSpeakingChangeRef = useRef(onSpeakingChange)
  useEffect(() => { onClientReadyRef.current = onClientReady }, [onClientReady])
  useEffect(() => { onConnectionChangeRef.current = onConnectionChange }, [onConnectionChange])
  useEffect(() => { onErrorRef.current = onError }, [onError])
  useEffect(() => { onSpeakingChangeRef.current = onSpeakingChange }, [onSpeakingChange])

  // Single effect manages the full Simli lifecycle.
  // The `aborted` flag guards against stale callbacks from React strict mode's
  // first mount (mount → unmount → remount in dev).
  useEffect(() => {
    if (!isActive || !faceId || !videoRef.current || !audioRef.current) return

    let aborted = false
    let client: SimliClient | null = null

    const initialize = async () => {
      setIsConnecting(true)
      setConnectionError(null)

      try {
        client = new SimliClient()

        const config: SimliClientConfig = {
          apiKey: process.env.NEXT_PUBLIC_SIMLI_API_KEY || '',
          faceID: faceId,
          handleSilence: true,
          maxSessionLength: 3600,
          maxIdleTime: 300,
          videoRef: videoRef.current!,
          audioRef: audioRef.current!,
          enableConsoleLogs: false,
          session_token: '',
          SimliURL: '',
          maxRetryAttempts: 3,
          retryDelay_ms: 2000,
          videoReceivedTimeout: 15000,
          enableSFU: true,
          model: '',
        }

        client.Initialize(config)

        client.on('connected', () => {
          if (aborted) return
          simliClientRef.current = client
          setIsConnected(true)
          setIsConnecting(false)
          onConnectionChangeRef.current?.(true)
          onClientReadyRef.current?.(client)
        })

        client.on('disconnected', () => {
          if (aborted) return
          setIsConnected(false)
          onConnectionChangeRef.current?.(false)
          onClientReadyRef.current?.(null)
        })

        client.on('failed', (reason: string) => {
          if (aborted) return
          setIsConnecting(false)
          setIsConnected(false)
          setConnectionError(reason)
          onErrorRef.current?.(reason)
          onConnectionChangeRef.current?.(false)
          onClientReadyRef.current?.(null)
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

    return () => {
      aborted = true
      if (client) {
        // Fully neuter the client before closing. The SDK's close() → cleanup()
        // immediately sets videoRef.srcObject = null on the shared DOM element.
        // Additionally, start() calls this.Initialize(this.config) AFTER an await
        // (microtask boundary), which restores videoRef from config even after we
        // null it. Nullifying config prevents this restoration. Setting retryAttempt
        // high prevents zombie reconnection attempts.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = client as any
        c.videoRef = null
        c.audioRef = null
        c.config = null
        c.retryAttempt = 9999
        c.MAX_RETRY_ATTEMPTS = 0
        client.close()
      }
      simliClientRef.current = null
      onClientReadyRef.current?.(null)
      setIsConnected(false)
      setIsConnecting(false)
    }
  }, [isActive, faceId, retryCount])

  const handleRetry = () => setRetryCount((c) => c + 1)

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Video element - Simli streams to this via WebRTC */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          isConnected ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Audio element for avatar speech */}
      <audio ref={audioRef} autoPlay />

      {/* Connecting state */}
      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/80 text-sm">Connecting video...</p>
          </div>
        </div>
      )}

      {/* Error state - show static avatar fallback behind */}
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

      {/* LIVE indicator */}
      {isConnected && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-sm">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white/70 text-[10px]">LIVE</span>
        </div>
      )}
    </div>
  )
}

/**
 * Send PCM16 audio to a SimliClient in chunks.
 * Audio must be PCM16, 16kHz, mono.
 *
 * @param client - SimliClient instance
 * @param audioBuffer - ArrayBuffer of PCM16 audio data
 * @param chunkSize - Size of each chunk in bytes (default 6000 = ~187ms at 16kHz)
 */
export function sendAudioToSimli(
  client: SimliClient,
  audioBuffer: ArrayBuffer,
  chunkSize: number = 6000
): void {
  const data = new Uint8Array(audioBuffer)

  // Send in chunks to avoid overwhelming the WebRTC connection
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const chunk = data.slice(offset, Math.min(offset + chunkSize, data.length))
    client.sendAudioData(chunk)
  }
}
