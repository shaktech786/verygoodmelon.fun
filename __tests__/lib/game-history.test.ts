import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_VISITS, useGameHistory } from '@/lib/stores/game-history'

describe('game history', () => {
  beforeEach(() => {
    localStorage.clear()
    useGameHistory.setState({ visits: [] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps only the most recent visits so it never grows without bound', () => {
    const { recordVisit } = useGameHistory.getState()
    for (let i = 0; i < MAX_VISITS + 25; i++) recordVisit(i === MAX_VISITS + 24 ? 'idea-lab' : 'hope-daily')

    const { visits } = useGameHistory.getState()
    expect(visits).toHaveLength(MAX_VISITS)
    expect(visits[visits.length - 1].gameId).toBe('idea-lab')
  })

  it('keeps working in memory when the browser refuses to store anything', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })

    expect(() => useGameHistory.getState().recordVisit('hope-daily')).not.toThrow()
    expect(useGameHistory.getState().getLastPlayed()).toBe('hope-daily')
  })
})
