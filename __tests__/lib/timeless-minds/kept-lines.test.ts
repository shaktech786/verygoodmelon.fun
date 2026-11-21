import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  KEPT_LINES_KEY, MAX_KEPT_LINES, isKept, keepLine, loadKeptLines, parseKeptLines, removeLine, saveKeptLines, type KeptLine,
} from '@/lib/games/timeless-minds/kept-lines'

const line = (id: string, text = `Words ${id}`, thinkerId = 'socrates'): KeptLine =>
  ({ id, text, thinkerId, thinkerName: 'Socrates', keptOn: '2026-11-21' })

describe('kept lines', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('keeps the newest line first and the same words from the same thinker only once', () => {
    const first = keepLine([], line('a'))
    const second = keepLine(first, line('b'))
    expect(second.map(l => l.id)).toEqual(['b', 'a'])
    expect(keepLine(second, line('c', 'Words a'))).toEqual(second)
    expect(keepLine(second, line('d', 'Words a', 'plato')).map(l => l.id)).toEqual(['d', 'b', 'a'])
    expect(isKept(second, 'socrates', 'Words b')).toBe(true)
    expect(isKept(second, 'plato', 'Words b')).toBe(false)
  })

  it('stays small, letting the oldest go once the shelf is full', () => {
    let lines: KeptLine[] = []
    for (let i = 0; i <= MAX_KEPT_LINES; i++) lines = keepLine(lines, line(String(i)))
    expect(lines).toHaveLength(MAX_KEPT_LINES)
    expect(lines[0].id).toBe(String(MAX_KEPT_LINES))
    expect(lines.some(l => l.id === '0')).toBe(false)
  })

  it('removes one line by its id', () => {
    expect(removeLine([line('a'), line('b')], 'a').map(l => l.id)).toEqual(['b'])
  })

  it('reads back only well-formed lines from damaged saves', () => {
    expect(parseKeptLines(null)).toEqual([])
    expect(parseKeptLines('{not json')).toEqual([])
    expect(parseKeptLines('{"a":1}')).toEqual([])
    expect(parseKeptLines(JSON.stringify([line('a'), { id: 'b', text: '' }, 'nope', { ...line('c'), keptOn: 5 }])))
      .toEqual([line('a'), { ...line('c'), keptOn: '' }])
  })

  it('saves to the device, clears the key when the shelf is empty, and never throws', () => {
    expect(saveKeptLines([line('a')])).toBe(true)
    expect(loadKeptLines()).toEqual([line('a')])
    expect(saveKeptLines([])).toBe(true)
    expect(localStorage.getItem(KEPT_LINES_KEY)).toBeNull()

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(saveKeptLines([line('a')])).toBe(false)
    expect(loadKeptLines()).toEqual([])
  })
})
