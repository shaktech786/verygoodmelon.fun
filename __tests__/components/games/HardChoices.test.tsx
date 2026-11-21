import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

  it('shows the category label capitalised, as it is read aloud', () => {
    render(<HardChoices />)
    expect(screen.getByText('Meaning', { selector: 'span' })).toBeInTheDocument()
  })

  it('keeps the perspectives outside the choice buttons and describes each button with its own', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    render(<HardChoices />)
    fireEvent.click(screen.getByRole('button', { name: /Choice A/i }))

    const perspective = await screen.findByText(/What good is purpose/, { selector: 'li p' })
    const buttonA = screen.getByRole('button', { name: /Choice A/i })
    expect(buttonA).not.toContainElement(perspective)
    expect(buttonA).toHaveAccessibleDescription(/What good is purpose/)
    expect(screen.getByRole('button', { name: /Choice B/i })).toHaveAccessibleDescription(/Meaning sustains us/)
  })

  it('announces only the new result after a choice, never re-reading both perspectives', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    render(<HardChoices />)
    fireEvent.click(screen.getByRole('button', { name: /Choice B/i }))

    const status = screen.getByRole('status')
    await waitFor(() => expect(status).toHaveTextContent(/^You chose Meaning\./))
    expect(status).not.toHaveTextContent(/What good is purpose|Meaning sustains us/)
    // Counts that arrive later are read on their own, not with everything above them
    expect(status).toHaveAttribute('aria-atomic', 'false')
  })

  it('drops saved answers to retired dilemmas and resumes at the first unanswered one', async () => {
    mockLocalStorage.setItem('hardChoicesVotes', JSON.stringify({
      'happiness-vs-meaning': 'A', 'trolley-personal': 'B', 'memory-erasure': 'skip',
    }))
    mockLocalStorage.setItem('hardChoicesCounted', JSON.stringify(['happiness-vs-meaning', 'children-climate']))

    render(<HardChoices />)

    await waitFor(() => expect(screen.getByText('Dilemma 2 of 12')).toBeInTheDocument())
    expect(JSON.parse(mockLocalStorage.getItem('hardChoicesVotes') ?? '{}')).toEqual({ 'happiness-vs-meaning': 'A' })
    expect(JSON.parse(mockLocalStorage.getItem('hardChoicesCounted') ?? '[]')).toEqual(['happiness-vs-meaning'])
  })

  it('starts cleanly from saved answers that cannot be read', async () => {
    mockLocalStorage.setItem('hardChoicesVotes', '{not json')
    render(<HardChoices />)
    await waitFor(() => expect(screen.getByText('Dilemma 1 of 12')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Choice A/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('ends with a reading of the pattern, not just a list of words', async () => {
    const all = ['happiness-vs-meaning', 'career-passion', 'free-evening', 'love-or-freedom', 'radical-honesty',
      'friends-manuscript', 'right-or-close', 'forgiveness-limits', 'the-promotion', 'new-city', 'empty-weekend', 'last-slice']
    mockLocalStorage.setItem('hardChoicesVotes', JSON.stringify(Object.fromEntries(all.map((id) => [id, 'A']))))

    render(<HardChoices />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'What you chose to protect' })).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'A reading' })).toBeInTheDocument()
    expect(screen.getByText(/What kept returning was the people around you/)).toBeInTheDocument()
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

    await waitFor(() => expect(within(screen.getByRole('status')).getByText('Meaning')).toBeInTheDocument())
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
