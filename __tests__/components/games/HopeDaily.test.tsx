import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

import HopeDaily from '@/components/games/HopeDaily'

const PUZZLE = {
  category: 'Energy',
  wordLength: 5,
  clue: 'Power from our nearest star',
  story: [
    [{ text: 'The first practical silicon ' }, { text: '', word: true }, { text: ' cell was ' }],
    [{ text: 'demonstrated at Bell Labs in 1954; ' }],
    [{ text: 'panels now power homes, satellites and whole towns.' }],
  ],
}

const respond = (json: unknown) => ({ ok: true, status: 200, json: async () => json })
const today = () => new Date().toISOString().slice(0, 10)

describe('HopeDaily', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockLocalStorage.clear()
    mockFetch.mockResolvedValueOnce(respond(PUZZLE))
  })

  it('opens on the first part of the story with the word left out, and the rest still folded', async () => {
    render(<HopeDaily />)
    expect(await screen.findByText('The first practical silicon')).toBeInTheDocument()
    expect(screen.getByText('(missing word)')).toBeInTheDocument()
    expect(screen.queryByText(/Bell Labs/)).not.toBeInTheDocument()
    expect(screen.getByText('2 more parts of the story are still folded.')).toBeInTheDocument()
    expect(screen.queryByText(/nearest star/)).not.toBeInTheDocument()
  })

  it('unfolds the story, then the clue, without any guess', async () => {
    render(<HopeDaily />)
    fireEvent.click(await screen.findByRole('button', { name: 'Read on' }))
    expect(screen.getByText(/Bell Labs/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('The story unfolds a little more.')

    fireEvent.click(screen.getByRole('button', { name: 'Read on' }))
    expect(screen.getByText(/nearest star/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('The clue is now showing.')
  })

  it('sends a typed guess and says how it went in plain words', async () => {
    mockFetch.mockResolvedValueOnce(respond({ isCorrect: false, inPlace: [[0, 'S']] }))
    mockFetch.mockResolvedValueOnce(respond({ commentary: 'Sunny thought.' }))

    render(<HopeDaily />)
    fireEvent.change(await screen.findByRole('textbox', { name: 'Your guess' }), { target: { value: 'sh1ne' } })
    expect(screen.getByRole('textbox', { name: 'Your guess' })).toHaveValue('SHNE')
    fireEvent.change(screen.getByRole('textbox', { name: 'Your guess' }), { target: { value: 'shine' } })
    fireEvent.submit(screen.getByRole('textbox', { name: 'Your guess' }).closest('form')!)

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('SHINE is not today’s word. Letter 1 is S. The story unfolds a little more.')
    )
    expect(mockFetch).toHaveBeenCalledWith('/api/hope-daily', expect.objectContaining({ method: 'POST' }))
    expect(await screen.findByText('Sunny thought.')).toBeInTheDocument()
  })

  it('explains a short guess without sending it', async () => {
    render(<HopeDaily />)
    fireEvent.change(await screen.findByRole('textbox', { name: 'Your guess' }), { target: { value: 'sun' } })
    fireEvent.submit(screen.getByRole('textbox', { name: 'Your guess' }).closest('form')!)

    expect(screen.getByRole('status')).toHaveTextContent('Today’s word has 5 letters.')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('never takes keys typed while focus is elsewhere on the page', async () => {
    render(<HopeDaily />)
    const input = await screen.findByRole('textbox', { name: 'Your guess' })
    fireEvent.keyDown(document.body, { key: 's' })
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(input).toHaveValue('')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('keeps a player’s place from the earlier letter-grid version of the game', async () => {
    mockLocalStorage.setItem('hope-daily-state', JSON.stringify({
      date: today(),
      guesses: [['S', 'H', 'I', 'N', 'E'].map((letter, i) => ({ letter, state: i === 0 ? 'correct' : 'absent' }))],
      gameState: 'playing',
      revealedData: null,
      hintsUsed: 0,
    }))

    render(<HopeDaily />)
    expect(await screen.findByText('SHINE')).toBeInTheDocument()
    expect(screen.getByText('Known so far: letter 1 is S.')).toBeInTheDocument()
    expect(screen.getByText(/Bell Labs/)).toBeInTheDocument()
  })
})
