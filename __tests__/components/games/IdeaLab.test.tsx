import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

function begin() {
  render(<IdeaLab />)
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
    begin()
    await waitFor(() => expect(concept('Love')).toHaveFocus())
  })

  it('announces a new discovery politely and adds it to the concepts', async () => {
    reply('Bittersweet', 'The tender ache of love touched by fear.')
    begin()
    fireEvent.click(concept('Love'))
    fireEvent.click(concept('Fear'))

    await waitFor(() => expect(status()).toHaveTextContent('New discovery: Bittersweet. The tender ache of love touched by fear.'))
    expect(status()).toHaveAttribute('aria-live', 'polite')
    expect(concept('Bittersweet')).toBeInTheDocument()
    expect(screen.getByText('1 discovery')).toBeInTheDocument()
  })

  it('keeps loading discoveries saved before riddles and Works existed', async () => {
    mockLocalStorage.setItem('ideaLab_discoveries', JSON.stringify([{ id: 'grief', name: 'Grief', emoji: '💔', description: 'Old.' }]))
    render(<IdeaLab />)
    await waitFor(() => expect(concept('Grief')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'The seven golds' })).toBeInTheDocument()
  })

  it('surfaces a plainer clue after a few tries without gold, and says so', async () => {
    begin()
    const pairs: Array<[string, string]> = [['Love', 'Fear'], ['Time', 'Death'], ['Power', 'Truth'], ['Beauty', 'Chaos'], ['Order', 'Self']]
    expect(screen.queryByText('Plainer:')).not.toBeInTheDocument()
    for (const [i, [a, b]] of pairs.entries()) {
      reply(`Thing ${'abcde'[i]}`)
      fireEvent.click(concept(a))
      fireEvent.click(concept(b))
      await waitFor(() => expect(status()).toHaveTextContent(`New discovery: Thing ${'abcde'[i]}.`))
    }
    expect(status()).toHaveTextContent('A plainer clue has surfaced on the shelf.')
    expect(screen.getAllByText('Plainer:')).toHaveLength(7)
  })
})
