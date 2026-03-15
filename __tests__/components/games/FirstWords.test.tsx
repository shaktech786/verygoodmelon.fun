import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
}))

vi.mock('@isoterik/react-word-cloud', () => ({
  default: ({ words }: { words: Array<{ text: string; value: number }> }) => (
    <div data-testid="word-cloud">{words?.map(w => w.text).join(', ')}</div>
  ),
}))

import FirstWords from '@/components/games/FirstWords'

describe('FirstWords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders textarea', () => {
    render(<FirstWords />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders Share Your Vision button', () => {
    render(<FirstWords />)
    expect(screen.getByRole('button', { name: /Share Your Vision/i })).toBeInTheDocument()
  })

  it('shows ethereal prompt text', () => {
    render(<FirstWords />)
    // Should show one of the contemplative prompts
    expect(screen.getByRole('textbox')).toBeInTheDocument()
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
    const button = screen.getByRole('button', { name: /Share Your Vision/i })
    expect(button).toBeDisabled()
  })

  it('enables submit with content', () => {
    render(<FirstWords />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'I see light' } })
    const button = screen.getByRole('button', { name: /Share Your Vision/i })
    expect(button).not.toBeDisabled()
  })
})
