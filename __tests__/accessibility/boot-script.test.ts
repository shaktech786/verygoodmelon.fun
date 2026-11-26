import { afterEach, describe, expect, it } from 'vitest'
import { ACCESSIBILITY_BOOT_SCRIPT, ACCESSIBILITY_STORAGE_KEY } from '@/lib/accessibility/boot-script'

function runBootScript() {
  new Function(ACCESSIBILITY_BOOT_SCRIPT)()
  const root = document.documentElement
  return {
    theme: root.getAttribute('data-theme'),
    textSize: root.getAttribute('data-text-size'),
    contrast: root.getAttribute('data-contrast'),
    sense: root.getAttribute('data-sense'),
    spacing: root.getAttribute('data-spacing'),
    reduceMotion: root.getAttribute('data-reduce-motion'),
  }
}

describe('accessibility boot script', () => {
  afterEach(() => {
    localStorage.clear()
    for (const name of ['data-theme', 'data-text-size', 'data-contrast', 'data-sense', 'data-spacing', 'data-reduce-motion']) document.documentElement.removeAttribute(name)
  })

  it('applies a saved dark theme, text size, contrast, sense and spacing before React mounts', () => {
    localStorage.setItem(
      ACCESSIBILITY_STORAGE_KEY,
      JSON.stringify({ theme: 'dark', textSize: 'larger', contrast: 'extra-high', sense: 'quiet', spacing: 'roomy', reduceMotion: true })
    )
    expect(runBootScript()).toEqual({ theme: 'dark', textSize: 'larger', contrast: 'extra-high', sense: 'quiet', spacing: 'roomy', reduceMotion: 'true' })
  })

  it('follows the system theme when nothing is saved', () => {
    expect(runBootScript()).toEqual({ theme: 'auto', textSize: 'default', contrast: 'normal', sense: 'gentle', spacing: 'standard', reduceMotion: 'false' })
  })

  it('ignores corrupt or unknown saved values', () => {
    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, '{not json')
    expect(runBootScript().theme).toBe('auto')

    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify({ theme: 'purple', textSize: 7 }))
    expect(runBootScript()).toEqual({ theme: 'auto', textSize: 'default', contrast: 'normal', sense: 'gentle', spacing: 'standard', reduceMotion: 'false' })
  })

  it('follows the device for reduced motion when nothing is saved, and a saved choice wins over it', () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({ matches: query.includes('prefers-reduced-motion') })) as typeof window.matchMedia
    try {
      expect(runBootScript().reduceMotion).toBe('true')
      localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify({ reduceMotion: false }))
      expect(runBootScript().reduceMotion).toBe('false')
    } finally {
      window.matchMedia = original
    }
  })
})
