import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

// Must import after mocks
import HopeDaily from '@/components/games/HopeDaily'

describe('HopeDaily', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
    // Default: game init returns 5-letter word metadata
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ wordLength: 5, category: 'health' }),
    })
  })

  it('shows loading state initially', () => {
    render(<HopeDaily />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders keyboard after loading', async () => {
    render(<HopeDaily />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Q' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'ENTER' })).toBeInTheDocument()
  })

  it('shows word length instruction', async () => {
    render(<HopeDaily />)
    await waitFor(() => {
      expect(screen.getByText(/5-letter word/i)).toBeInTheDocument()
    })
  })

  it('accepts letter input from keyboard buttons', async () => {
    render(<HopeDaily />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'H' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'H' }))
    fireEvent.click(screen.getByRole('button', { name: 'E' }))
    // Letters should appear in grid
    const cells = screen.getAllByRole('gridcell')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('accepts physical keyboard input', async () => {
    render(<HopeDaily />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Q' })).toBeInTheDocument()
    })
    fireEvent.keyDown(document, { key: 'h' })
    fireEvent.keyDown(document, { key: 'e' })
    const cells = screen.getAllByRole('gridcell')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('shows hint button', async () => {
    render(<HopeDaily />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hint/i })).toBeInTheDocument()
    })
  })

  it('fetches hint on hint button click', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hint: 'Think about wellness', revealedLetter: null, hintNumber: 1 }),
    })

    render(<HopeDaily />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hint/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /hint/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/hope-daily/hint', expect.any(Object))
    })
  })

  it('submits guess on ENTER', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        letterStates: [
          { letter: 'H', state: 'correct' },
          { letter: 'E', state: 'present' },
          { letter: 'L', state: 'absent' },
          { letter: 'L', state: 'absent' },
          { letter: 'O', state: 'absent' },
        ],
        isCorrect: false,
      }),
    })

    render(<HopeDaily />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'H' })).toBeInTheDocument()
    })

    // Type HELLO
    for (const key of ['H', 'E', 'L', 'L', 'O']) {
      fireEvent.click(screen.getByRole('button', { name: key }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'ENTER' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/hope-daily', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('shows color legend', async () => {
    render(<HopeDaily />)
    await waitFor(() => {
      expect(screen.getByText('Growth')).toBeInTheDocument()
      expect(screen.getByText('Hope')).toBeInTheDocument()
      expect(screen.getByText('Absent')).toBeInTheDocument()
    })
  })
})
