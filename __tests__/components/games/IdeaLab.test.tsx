import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch
Element.prototype.scrollIntoView = vi.fn()

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

const reply = (name: string, description = `${name}, briefly.`) =>
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ name, emoji: '✨', description }) })

const concept = (name: string) => screen.getByRole('button', { name })
const status = () => screen.getByRole('status')

// Saved progress is read in a microtask after mounting; a real player cannot click before it lands
async function begin() {
  render(<IdeaLab />)
  await act(() => Promise.resolve())
  fireEvent.click(screen.getByRole('button', { name: 'Begin Exploring' }))
}

describe('IdeaLab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
  })

  it('opens on an intro that promises no timer and plainer clues', () => {
    render(<IdeaLab />)
    expect(screen.getByText(/each hidden behind a riddle/)).toBeInTheDocument()
    expect(screen.getByText(/No timer, no wrong answers/)).toBeInTheDocument()
  })

  it('moves keyboard focus to the first concept after Begin Exploring', async () => {
    await begin()
    await waitFor(() => expect(concept('Love')).toHaveFocus())
  })

  it('answers a curated pair in the page itself, announcing the discovery politely', async () => {
    await begin()
    fireEvent.click(concept('Love'))
    fireEvent.click(concept('Fear'))

    await waitFor(() => expect(status()).toHaveTextContent('New discovery: Jealousy. When love fears loss, it curdles into possession.'))
    expect(status()).toHaveAttribute('aria-live', 'polite')
    expect(concept('Jealousy')).toBeInTheDocument()
    expect(screen.getByText('1 discovery')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('asks the server only for a pair nobody has written', async () => {
    await begin()
    fireEvent.click(concept('Love'))
    fireEvent.click(concept('Fear'))
    await waitFor(() => expect(concept('Jealousy')).toBeInTheDocument())

    reply('Restlessness', 'A heart that cannot settle.')
    fireEvent.click(concept('Jealousy'))
    fireEvent.click(concept('Chaos'))
    await waitFor(() => expect(status()).toHaveTextContent('New discovery: Restlessness. A heart that cannot settle.'))
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('keeps loading discoveries saved before riddles and Works existed', async () => {
    mockLocalStorage.setItem('ideaLab_discoveries', JSON.stringify([{ id: 'grief', name: 'Grief', emoji: '💔', description: 'Old.' }]))
    render(<IdeaLab />)
    await waitFor(() => expect(concept('Grief')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'The seven golds' })).toBeInTheDocument()
  })

  it('makes one riddle plainer after a few tries without gold, and reads it out', async () => {
    await begin()
    const pairs: Array<[string, string]> = [['Love', 'Fear'], ['Time', 'Death'], ['Power', 'Truth'], ['Beauty', 'Chaos'], ['Order', 'Self']]
    expect(screen.queryByText('Plainer:')).not.toBeInTheDocument()
    for (const [a, b] of pairs) {
      fireEvent.click(concept(a))
      fireEvent.click(concept(b))
      await waitFor(() => expect(status()).toHaveTextContent(/New discovery: /))
    }
    expect(status()).toHaveTextContent('A riddle has grown plainer: Let love meet its ending, then let the dawn sit beside it.')
    expect(screen.getAllByText('Let love meet its ending, then let the dawn sit beside it.', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Plainer:').length).toBeLessThan(7)
  })

  it('shelves each new idea in the cabinet, to be opened and read again with what made it', async () => {
    await begin()
    fireEvent.click(concept('Love'))
    fireEvent.click(concept('Fear'))
    await waitFor(() => expect(concept('Jealousy')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Your cabinet' }))
    const drawer = screen.getByRole('button', { name: 'Reread Jealousy' })
    expect(drawer).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(drawer)
    expect(drawer).toHaveAttribute('aria-expanded', 'true')
    const reading = document.getElementById(drawer.getAttribute('aria-controls') ?? '')
    expect(reading).toHaveTextContent('When love fears loss, it curdles into possession.')
    expect(reading).toHaveTextContent(/Made from .*Fear and .*Love/)
  })
})

