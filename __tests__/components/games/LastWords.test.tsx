import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

// Mock dynamic import of WordCloud
vi.mock('@isoterik/react-word-cloud', () => ({
  default: ({ words }: { words: Array<{ text: string; value: number }> }) => (
    <div data-testid="word-cloud">{words?.map(w => w.text).join(', ')}</div>
  ),
}))

import LastWords from '@/components/games/LastWords'

describe('LastWords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('brings back an unsent draft after a reload', () => {
    const { unmount } = render(<LastWords />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Not finished yet' } })
    unmount()

    render(<LastWords />)
    expect(screen.getByRole('textbox')).toHaveValue('Not finished yet')
    expect(sessionStorage.getItem('verygoodmelon:last-words:draft')).toBe('Not finished yet')
  })

  it('renders textarea for input', () => {
    render(<LastWords />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<LastWords />)
    expect(screen.getByRole('button', { name: /Leave these words/i })).toBeInTheDocument()
  })

  it('shows character count', () => {
    render(<LastWords />)
    expect(screen.getByText(/0\/500/)).toBeInTheDocument()
  })

  it('updates character count on input', () => {
    render(<LastWords />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hello world' } })
    expect(screen.getByText(/11\/500/)).toBeInTheDocument()
  })

  it('changes the question only when asked', () => {
    render(<LastWords />)
    expect(screen.getByText('What do you want the people you love to know?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Another question' }))
    expect(screen.getByText('What took you too long to learn?')).toBeInTheDocument()
  })

  it('disables submit when textarea is empty', () => {
    render(<LastWords />)
    const button = screen.getByRole('button', { name: /Leave these words/i })
    expect(button).toBeDisabled()
  })

  it('enables submit when textarea has content', () => {
    render(<LastWords />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'My final words' } })
    const button = screen.getByRole('button', { name: /Leave these words/i })
    expect(button).not.toBeDisabled()
  })
})
