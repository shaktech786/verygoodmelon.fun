import { describe, expect, it } from 'vitest'
import { SHOWCASE_GAMES } from '@/lib/games/config'
import { PICK_REASONS, dailyPick } from '@/lib/games/daily-pick'
import { MOODS, gamesForMood, moodHref, parseMood } from '@/lib/games/moods'

const CALM_IDS = SHOWCASE_GAMES.filter((game) => game.category === 'Calm').map((game) => game.id)

describe('daily pick', () => {
  it('is the same calm game from morning to late evening, and every calm game has a reason', () => {
    const morning = dailyPick(new Date(2026, 4, 10, 0, 5))
    const night = dailyPick(new Date(2026, 4, 10, 23, 55))
    expect(morning?.game.id).toBe(night?.game.id)
    expect(CALM_IDS).toContain(morning?.game.id)
    for (const id of CALM_IDS) expect(PICK_REASONS[id], id).toMatch(/\S/)
    expect(morning?.reason).toBe(PICK_REASONS[morning?.game.id ?? ''])
  })

  it('moves on each day and visits every calm game before repeating', () => {
    const days = CALM_IDS.map((_, i) => dailyPick(new Date(2026, 0, 10 + i, 12))?.game.id)
    expect(new Set(days).size).toBe(CALM_IDS.length)
    expect(days[0]).not.toBe(days[1])
  })

  it('stays one pick per day across a daylight-saving change', () => {
    // 29 March 2026 is a 23-hour day in much of Europe
    const before = dailyPick(new Date(2026, 2, 28, 12))?.game.id
    const after = dailyPick(new Date(2026, 2, 29, 12))?.game.id
    const next = dailyPick(new Date(2026, 2, 30, 12))?.game.id
    expect(new Set([before, after, next]).size).toBe(3)
  })
})

describe('moods', () => {
  it('reads only a known mood from the address', () => {
    expect(parseMood('restless')).toBe('restless')
    expect(parseMood('heavy')).toBe('heavy')
    expect(parseMood('play')).toBe('play')
    expect(parseMood('sideways')).toBeUndefined()
    expect(parseMood(undefined)).toBeUndefined()
    expect(parseMood(['heavy', 'play'])).toBeUndefined()
    expect(moodHref('heavy')).toBe('/games?mood=heavy')
  })

  it('points every mood at several real showcase games, never at the games about death', () => {
    for (const mood of MOODS) {
      const games = gamesForMood(mood.id)
      expect(games.map((g) => g.id), mood.id).toEqual(mood.gameIds)
      expect(games.length, mood.id).toBeGreaterThanOrEqual(4)
      expect(games.map((g) => g.id)).not.toContain('last-words')
      expect(games.map((g) => g.id)).not.toContain('first-words')
    }
  })

  it('offers the three moods the homepage names, in order', () => {
    expect(MOODS.map((m) => m.label)).toEqual(['Restless', 'Heavy', 'Want to play'])
  })
})
