import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

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

import HardChoices from '@/components/games/HardChoices'

describe('HardChoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
    // Default: no votes fetched
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choiceA: 0, choiceB: 0 }),
    })
  })

  it('renders with two choice buttons', () => {
    render(<HardChoices />)
    expect(screen.getByRole('button', { name: /Choice A/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Choice B/i })).toBeInTheDocument()
  })

  it('displays dilemma scenario text', () => {
    render(<HardChoices />)
    // Should show the title
    expect(screen.getByText('The Dilemma')).toBeInTheDocument()
  })

  it('shows category label', () => {
    render(<HardChoices />)
    // Categories like existential, ethics, meaning, etc.
    const categories = screen.getAllByText(/existential|ethics|meaning|metaphysics|love|relationships|career|identity/i)
    expect(categories.length).toBeGreaterThan(0)
  })

  it('submits vote when choice clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choiceA: 55, choiceB: 45 }),
    })

    render(<HardChoices />)
    fireEvent.click(screen.getByRole('button', { name: /Choice A/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/hard-choices/vote', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('shows vote results after voting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, results: { choiceA: 60, choiceB: 40 } }),
    })

    render(<HardChoices />)
    fireEvent.click(screen.getByRole('button', { name: /Choice A/i }))

    await waitFor(() => {
      const results = screen.getAllByText(/% chose this/i)
      expect(results.length).toBeGreaterThan(0)
    })
  })

  it('shows Next Dilemma button after voting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choiceA: 50, choiceB: 50 }),
    })

    render(<HardChoices />)
    fireEvent.click(screen.getByRole('button', { name: /Choice A/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Dilemma/i })).toBeInTheDocument()
    })
  })

  it('lets the player continue without crowd results when the vote cannot be saved', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: '' })

    render(<HardChoices />)
    fireEvent.click(screen.getByRole('button', { name: /Choice A/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Dilemma/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Choice A/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(/% chose this/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Couldn't Load/i)).not.toBeInTheDocument()
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'hardChoicesVotes',
      JSON.stringify({ 'happiness-vs-meaning': 'A' })
    )
  })

  it('shows a previously made choice without crowd results when results cannot be loaded', async () => {
    mockLocalStorage.setItem('hardChoicesVotes', JSON.stringify({ 'happiness-vs-meaning': 'B' }))
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: '' })

    render(<HardChoices />)

    // The game resumes at the first unanswered dilemma; step back to the answered one
    await waitFor(() => {
      expect(screen.getByText('Dilemma 2 of 12')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Previous/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Dilemma/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Choice B/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(/% chose this/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Couldn't Load/i)).not.toBeInTheDocument()
  })

  it('navigates to next dilemma', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choiceA: 50, choiceB: 50 }),
    })

    render(<HardChoices />)
    fireEvent.click(screen.getByRole('button', { name: /Choice A/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Next Dilemma/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Next Dilemma/i }))

    // Should show new choice buttons (not results)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Choice A/i })).toBeInTheDocument()
    })
  })

  it('names what the choice protects and offers a thought that holds both sides', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    render(<HardChoices />)
    fireEvent.click(screen.getByRole('button', { name: /Choice B/i }))

    await waitFor(() => expect(screen.getByText('Meaning')).toBeInTheDocument())
    expect(screen.getByText(/which you reach for first on a hard day/)).toBeInTheDocument()
  })

  it('lets the player change an answer without counting it again', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, results: { choiceA: 1, choiceB: 0 } }),
    })
    render(<HardChoices />)
    fireEvent.click(screen.getByRole('button', { name: /Choice A/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Change my answer' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Change my answer' }))
    expect(screen.getByRole('button', { name: /Choice A/i })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: /Choice B/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Choice B/i })).toHaveAttribute('aria-pressed', 'true'))
    const votePosts = mockFetch.mock.calls.filter(([url]) => url === '/api/hard-choices/vote')
    expect(votePosts).toHaveLength(1)
  })

  it('lets a question pass and moves on without sending anything', async () => {
    render(<HardChoices />)
    fireEvent.click(screen.getByRole('button', { name: 'Let this one pass' }))

    await waitFor(() => expect(screen.getByText('Dilemma 2 of 12')).toBeInTheDocument())
    expect(mockFetch).not.toHaveBeenCalledWith('/api/hard-choices/vote', expect.anything())
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('hardChoicesVotes', JSON.stringify({ 'happiness-vs-meaning': 'skip' }))
  })
})
