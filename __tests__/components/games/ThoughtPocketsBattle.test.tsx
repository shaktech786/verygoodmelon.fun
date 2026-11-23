import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { BattleScreen } from '@/app/games/thought-pockets/components/BattleScreen'
import { newRun } from '@/lib/games/thought-pockets/engine/run'
import { useRunStore } from '@/lib/games/thought-pockets/store/runStore'
import { battleWith } from '../../lib/thought-pockets/helpers'

function LiveBattle() {
  const run = useRunStore((s) => s.run)
  return run?.battle ? <BattleScreen run={run} /> : null
}

function duplicateKeyWarnings(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((args) => args.map(String).join(' ')).filter((text) => text.includes('same key'))
}

describe('the battle screen', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.setAttribute('data-reduce-motion', 'true')
  })

  afterEach(() => {
    document.documentElement.removeAttribute('data-reduce-motion')
    useRunStore.setState({ run: null })
    vi.restoreAllMocks()
  })

  it('keeps every child key unique through a played round, even when Weight and Multiplier are the same number', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const run = newRun('rationalist', 7, 'gentle', [], undefined, 'short', false)
    const battle = battleWith({ enemyId: 'sunk_cost', hand: ['anecdote', 'therefore', 'anecdote', 'therefore', 'caveat'], school: 'rationalist' })
    useRunStore.setState({ run: { ...run, screen: 'battle', battle } })
    render(<LiveBattle />)

    for (const key of ['1', '1']) act(() => void fireEvent.keyDown(window, { key }))
    expect(screen.getByTestId('equation')).toHaveTextContent('Weight 2 × Multiplier 2')
    act(() => void fireEvent.keyDown(window, { key: '1' }))
    act(() => void fireEvent.keyDown(window, { key: 'e' }))
    act(() => void fireEvent.keyDown(window, { key: '1' }))
    act(() => void fireEvent.keyDown(window, { key: '1' }))
    expect(screen.getByTestId('equation')).toHaveTextContent(/Weight \d+ × Multiplier/)

    expect(duplicateKeyWarnings(errors)).toEqual([])
  })
})
