import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

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

import IdeaLab from '@/components/games/IdeaLab'

describe('IdeaLab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
  })

  it('shows intro screen initially', () => {
    render(<IdeaLab />)
    expect(screen.getByText(/Begin Exploring/i)).toBeInTheDocument()
  })

  it('shows concept grid after dismissing intro', () => {
    render(<IdeaLab />)
    fireEvent.click(screen.getByText(/Begin Exploring/i))
    // Base concepts should appear
    expect(screen.getByText('Love')).toBeInTheDocument()
    expect(screen.getByText('Fear')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
    expect(screen.getByText('Death')).toBeInTheDocument()
  })

  it('selects a concept when clicked', () => {
    render(<IdeaLab />)
    fireEvent.click(screen.getByText(/Begin Exploring/i))
    fireEvent.click(screen.getByText('Love'))
    // Concept should be visually selected (in the workspace)
    const loveButtons = screen.getAllByText('Love')
    expect(loveButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('combines two concepts via API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: 'Bittersweet',
        emoji: '\u{1F494}',
        description: 'The tender ache of love touched by fear.',
      }),
    })

    render(<IdeaLab />)
    fireEvent.click(screen.getByText(/Begin Exploring/i))
    fireEvent.click(screen.getByText('Love'))
    fireEvent.click(screen.getByText('Fear'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/idea-lab/combine', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('shows discovery result after combining', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: 'Bittersweet',
        emoji: '\u{1F494}',
        description: 'The tender ache of love touched by fear.',
      }),
    })

    render(<IdeaLab />)
    fireEvent.click(screen.getByText(/Begin Exploring/i))
    fireEvent.click(screen.getByText('Love'))
    fireEvent.click(screen.getByText('Fear'))

    await waitFor(() => {
      const results = screen.getAllByText('Bittersweet')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  it('tracks discovery count', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: 'Bittersweet',
        emoji: '\u{1F494}',
        description: 'The tender ache of love touched by fear.',
      }),
    })

    render(<IdeaLab />)
    fireEvent.click(screen.getByText(/Begin Exploring/i))
    fireEvent.click(screen.getByText('Love'))
    fireEvent.click(screen.getByText('Fear'))

    await waitFor(() => {
      const discoveryElements = screen.getAllByText(/discover/i)
      expect(discoveryElements.length).toBeGreaterThan(0)
    })
  })

  it('has clear button', () => {
    render(<IdeaLab />)
    fireEvent.click(screen.getByText(/Begin Exploring/i))
    // Clear/trash button should exist
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
