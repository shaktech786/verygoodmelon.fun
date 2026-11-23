'use client'

import { useSyncExternalStore } from 'react'
import { ambientOn, subscribeToAmbient } from '@/lib/audio/ambient-choice'

const DEFAULT_VOLUME = 70

function volumeFraction(): number {
  const root = document.documentElement
  if (root.getAttribute('data-muted') === 'true') return 0
  const volume = Number(root.getAttribute('data-volume') ?? DEFAULT_VOLUME)
  return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume / 100)) : DEFAULT_VOLUME / 100
}

/** True only when the player turned the page's ambient sound on and has not muted it in the settings panel. */
export function soundChosen(): boolean {
  return ambientOn() && volumeFraction() > 0
}

function subscribeToSoundChoice(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-muted', 'data-volume'] })
  const leave = subscribeToAmbient(onChange)
  return () => {
    observer.disconnect()
    leave()
  }
}

export function useSoundChosen(): boolean {
  return useSyncExternalStore(subscribeToSoundChoice, soundChosen, () => false)
}

/** False while the accessibility panel has the site muted or its volume at zero. */
export function useSoundAudible(): boolean {
  return useSyncExternalStore(subscribeToSoundChoice, () => volumeFraction() > 0, () => true)
}

export interface Tone {
  hz: number
  /** Glide to this pitch, so a rising or falling cue can be told apart with eyes closed. */
  toHz?: number
  /** Seconds after the call that the tone begins. */
  at?: number
  seconds: number
}

let context: AudioContext | null = null

function audio(): AudioContext {
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

/**
 * Call from a tap or key press: browsers keep audio that is first started later silent.
 * `chosen` defaults to the page's sound button; a game with its own sound choice passes that.
 */
export function wakeTones(chosen = soundChosen()) {
  if (chosen && volumeFraction() > 0) audio()
}

export function playTones(tones: Tone[], loudness: number, chosen = soundChosen()) {
  if (!chosen || volumeFraction() === 0) return
  const ctx = audio()
  const peak = loudness * volumeFraction()
  for (const tone of tones) {
    const start = ctx.currentTime + (tone.at ?? 0)
    const end = start + tone.seconds
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = tone.hz
    oscillator.frequency.setValueAtTime(tone.hz, start)
    if (tone.toHz) oscillator.frequency.exponentialRampToValueAtTime(tone.toHz, start + tone.seconds * 0.7)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + 0.12)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start(start)
    oscillator.stop(end + 0.05)
  }
}

function subscribeToNothing(): () => void {
  return () => {}
}

function canBuzz(): boolean {
  return 'vibrate' in navigator && window.matchMedia('(pointer: coarse)').matches
}

/** Phones that can vibrate; desktop browsers expose the API without the hardware. */
export function useCanBuzz(): boolean {
  return useSyncExternalStore(subscribeToNothing, canBuzz, () => false)
}

export function buzz(pattern: number[]) {
  if (canBuzz()) navigator.vibrate(pattern)
}
