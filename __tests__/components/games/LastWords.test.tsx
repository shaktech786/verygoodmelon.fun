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
  })

  it('renders textarea for input', () => {
    render(<LastWords />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<LastWords />)
    expect(screen.getByRole('button', { name: /Leave Your Mark/i })).toBeInTheDocument()
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

  it('shows reflection prompt', () => {
    render(<LastWords />)
    // Should have the prompt section
    const prompts = screen.getAllByText(/What would you/i)
    expect(prompts.length).toBeGreaterThan(0)
  })

  it('disables submit when textarea is empty', () => {
    render(<LastWords />)
    const button = screen.getByRole('button', { name: /Leave Your Mark/i })
    expect(button).toBeDisabled()
  })

  it('enables submit when textarea has content', () => {
    render(<LastWords />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'My final words' } })
    const button = screen.getByRole('button', { name: /Leave Your Mark/i })
    expect(button).not.toBeDisabled()
  })
})
