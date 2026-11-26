import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getInks, paletteName, useInks, useInkTheme, type InkContrast, type InkTheme } from '@/lib/design/inks'
import { useSense } from '@/lib/design/sense'
import { PALETTES, SENSES } from '@/lib/design/tokens'

const THEMES: InkTheme[] = ['light', 'dark']
const CONTRASTS: InkContrast[] = ['normal', 'high', 'extra-high']

describe('getInks', () => {
  it.each(THEMES.flatMap((t) => SENSES.flatMap((s) => CONTRASTS.map((c) => [t, s, c] as const))))(
    '%s, %s, %s contrast gives the palette tokens.css emits',
    (theme, sense, contrast) => {
      const dark = theme === 'dark'
      const expected =
        contrast !== 'normal' ? (dark ? PALETTES.darkHigh : PALETTES.lightHigh)
        : sense === 'quiet' ? (dark ? PALETTES.darkQuiet : PALETTES.lightQuiet)
        : dark ? PALETTES.dark : PALETTES.light
      expect(getInks(theme, sense, contrast)).toEqual(expected)
    },
  )

  it('keeps the standard inks for Lively: the dial only changes motion and texture there', () => {
    expect(paletteName('light', 'lively', 'normal')).toBe('light')
  })
})

function mockScheme(initial: { dark: boolean; reduced?: boolean }) {
  const state = { dark: initial.dark, reduced: initial.reduced ?? false }
  const listeners = new Set<() => void>()
  window.matchMedia = vi.fn((query: string) => ({
    get matches() {
      return query.includes('dark') ? state.dark : query.includes('reduce') ? state.reduced : false
    },
    media: query,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  })) as unknown as typeof window.matchMedia
  return {
    set(next: Partial<typeof state>) {
      Object.assign(state, next)
      listeners.forEach((fn) => fn())
    },
  }
}

const html = document.documentElement
const ATTRIBUTES = ['data-theme', 'data-sense', 'data-contrast', 'data-reduce-motion']

describe('useInks', () => {
  beforeEach(() => {
    for (const a of ATTRIBUTES) html.removeAttribute(a)
  })

  it('follows the media query while the theme is auto', () => {
    const scheme = mockScheme({ dark: false })
    html.setAttribute('data-theme', 'auto')
    const { result } = renderHook(() => useInks())
    expect(result.current).toEqual(PALETTES.light)
    act(() => scheme.set({ dark: true }))
    expect(result.current).toEqual(PALETTES.dark)
  })

  it('ignores the media query once a theme is chosen', () => {
    mockScheme({ dark: true })
    html.setAttribute('data-theme', 'light')
    const { result } = renderHook(() => useInks())
    expect(result.current).toEqual(PALETTES.light)
  })

  it('re-renders when html data-theme, data-sense and data-contrast change', async () => {
    mockScheme({ dark: false })
    html.setAttribute('data-theme', 'light')
    const { result } = renderHook(() => useInks())
    await act(async () => {
      html.setAttribute('data-theme', 'dark')
      await Promise.resolve()
    })
    expect(result.current).toEqual(PALETTES.dark)
    await act(async () => {
      html.setAttribute('data-sense', 'quiet')
      await Promise.resolve()
    })
    expect(result.current).toEqual(PALETTES.darkQuiet)
    await act(async () => {
      html.setAttribute('data-contrast', 'extra-high')
      await Promise.resolve()
    })
    expect(result.current).toEqual(PALETTES.darkHigh)
  })
})

describe('useInkTheme', () => {
  beforeEach(() => {
    for (const a of ATTRIBUTES) html.removeAttribute(a)
  })

  it('resolves auto from the device and follows a chosen theme', async () => {
    const scheme = mockScheme({ dark: true })
    html.setAttribute('data-theme', 'auto')
    const { result } = renderHook(() => useInkTheme())
    expect(result.current).toBe('dark')
    act(() => scheme.set({ dark: false }))
    expect(result.current).toBe('light')
    await act(async () => {
      html.setAttribute('data-theme', 'dark')
      await Promise.resolve()
    })
    expect(result.current).toBe('dark')
  })
})

describe('useSense', () => {
  beforeEach(() => {
    for (const a of ATTRIBUTES) html.removeAttribute(a)
  })

  it('is Gentle with full motion by default', () => {
    mockScheme({ dark: false })
    const { result } = renderHook(() => useSense())
    expect(result.current).toEqual({ sense: 'gentle', reducedMotion: false, motionScale: 1 })
  })

  it('scales motion to 0 in Quiet', async () => {
    mockScheme({ dark: false })
    const { result } = renderHook(() => useSense())
    await act(async () => {
      html.setAttribute('data-sense', 'quiet')
      await Promise.resolve()
    })
    expect(result.current).toEqual({ sense: 'quiet', reducedMotion: false, motionScale: 0 })
  })

  it('treats the OS setting and the site switch as reduced motion', async () => {
    const scheme = mockScheme({ dark: false, reduced: true })
    const { result } = renderHook(() => useSense())
    expect(result.current).toMatchObject({ sense: 'gentle', reducedMotion: true, motionScale: 0 })
    act(() => scheme.set({ reduced: false }))
    expect(result.current.motionScale).toBe(1)
    await act(async () => {
      html.setAttribute('data-reduce-motion', 'true')
      await Promise.resolve()
    })
    expect(result.current).toMatchObject({ reducedMotion: true, motionScale: 0 })
  })
})
