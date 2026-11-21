import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@isoterik/react-word-cloud', () => ({
  default: ({ words }: { words: Array<{ text: string; value: number }> }) => (
    <div data-testid="word-cloud">{words?.map(w => w.text).join(', ')}</div>
  ),
}))

import FirstWords from '@/components/games/FirstWords'

describe('FirstWords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('brings back an unsent draft after a reload', () => {
    const { unmount } = render(<FirstWords />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Not finished yet' } })
    unmount()

    render(<FirstWords />)
    expect(screen.getByRole('textbox')).toHaveValue('Not finished yet')
    expect(sessionStorage.getItem('verygoodmelon:first-words:draft')).toBe('Not finished yet')
  })

  it('renders textarea', () => {
    render(<FirstWords />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders the Speak button', () => {
    render(<FirstWords />)
    expect(screen.getByRole('button', { name: /^Speak$/i })).toBeInTheDocument()
  })

  it('changes the question only when asked', () => {
    render(<FirstWords />)
    expect(screen.getByText('Who do you hope is there?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Another question' }))
    expect(screen.getByText('What do you notice first?')).toBeInTheDocument()
  })

  it('shows character count starting at 0', () => {
    render(<FirstWords />)
    expect(screen.getByText(/0\/500/)).toBeInTheDocument()
  })

  it('updates character count on input', () => {
    render(<FirstWords />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Peace and light' } })
    expect(screen.getByText(/15\/500/)).toBeInTheDocument()
  })

  it('disables submit when empty', () => {
    render(<FirstWords />)
    const button = screen.getByRole('button', { name: /^Speak$/i })
    expect(button).toBeDisabled()
  })

  it('enables submit with content', () => {
    render(<FirstWords />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'I see light' } })
    const button = screen.getByRole('button', { name: /^Speak$/i })
    expect(button).not.toBeDisabled()
  })
})
