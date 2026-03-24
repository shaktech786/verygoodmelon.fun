'use client'

import { useState, useEffect } from 'react'

interface TitleScreenProps {
  onStart: () => void
  retroFont: string
}

export default function TitleScreen({ onStart, retroFont }: TitleScreenProps) {
  const [visible, setVisible] = useState(false)
  const [pulseClass, setPulseClass] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    const p = setInterval(() => setPulseClass(v => !v), 800)
    return () => { clearTimeout(t); clearInterval(p) }
  }, [])

  // Start on any key or click
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') return // allow tab navigation
      onStart()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onStart])

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 rounded-lg ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ background: 'rgba(8,8,16,0.95)' }}
      onClick={onStart}
      role="dialog"
      aria-label="Cascade - Press any key to start"
    >
      {/* Glow background */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,255,136,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Title */}
      <div className="relative z-10 text-center">
        <h1
          className={`text-3xl sm:text-4xl tracking-[0.4em] mb-3 ${retroFont}`}
          style={{
            color: '#00ff88',
            textShadow: '0 0 20px rgba(0,255,136,0.5), 0 0 40px rgba(0,255,136,0.2)',
          }}
        >
          CASCADE
        </h1>

        <p
          className="text-xs sm:text-sm tracking-[0.2em] mb-1 opacity-50"
          style={{ color: '#556677', fontFamily: 'monospace' }}
        >
          the game that builds
        </p>
        <p
          className="text-xs sm:text-sm tracking-[0.2em] mb-12 opacity-50"
          style={{ color: '#556677', fontFamily: 'monospace' }}
        >
          itself
        </p>

        {/* Start prompt */}
        <button
          className={`text-xs sm:text-sm tracking-[0.15em] border-none bg-transparent cursor-pointer transition-opacity ${retroFont}`}
          style={{
            color: pulseClass ? '#00ff88' : '#00cc6a',
            textShadow: pulseClass ? '0 0 12px rgba(0,255,136,0.6)' : 'none',
          }}
          aria-label="Start game"
        >
          PRESS START
        </button>

        {/* Subtitle */}
        <p
          className="mt-10 text-[10px] tracking-[0.1em] opacity-30"
          style={{ color: '#556677', fontFamily: 'monospace' }}
        >
          every play is different.
        </p>
      </div>
    </div>
  )
}
