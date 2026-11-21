'use client'

import { useEffect } from 'react'
import { isControlTarget } from './controls'

interface TitleScreenProps {
  onStart: () => void
  retroFont: string
  isTouch: boolean
}

export default function TitleScreen({ onStart, retroFont, isTouch }: TitleScreenProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat || isControlTarget(e.target)) return
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      onStart()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onStart])

  return (
    <div
      className="col-start-1 row-start-1 z-20 flex flex-col items-center justify-center rounded-lg px-4 py-8 animate-fade cursor-pointer"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(0,255,136,0.06) 0%, transparent 70%), rgba(8,8,16,0.97)',
      }}
      onClick={onStart}
      role="dialog"
      aria-label="Cascade, the game that builds itself"
    >
      <div className="text-center">
        <h1
          className={`text-2xl sm:text-4xl tracking-[0.25em] sm:tracking-[0.4em] mb-3 ${retroFont}`}
          style={{
            color: '#00ff88',
            textShadow: '0 0 20px rgba(0,255,136,0.5), 0 0 40px rgba(0,255,136,0.2)',
          }}
        >
          CASCADE
        </h1>

        <p
          className="text-xs sm:text-sm tracking-[0.2em] mb-8 sm:mb-12"
          style={{ color: '#8899aa', fontFamily: 'monospace' }}
        >
          the game that builds itself
        </p>

        <button
          type="button"
          className={`text-xs sm:text-sm tracking-[0.15em] border px-5 py-3 rounded cursor-pointer ${retroFont}`}
          style={{
            color: '#00ff88',
            borderColor: 'rgba(0,255,136,0.4)',
            background: 'rgba(0,255,136,0.06)',
            textShadow: '0 0 12px rgba(0,255,136,0.6)',
          }}
        >
          PRESS START
        </button>

        <p
          className="mt-8 sm:mt-10 text-[11px] tracking-[0.1em] leading-relaxed"
          style={{ color: '#8899aa', fontFamily: 'monospace' }}
        >
          Each wave adds one new rule. No way to lose.
          <br />
          {isTouch ? 'Tap to begin.' : 'Enter, Space or click to begin.'}
        </p>
      </div>
    </div>
  )
}
