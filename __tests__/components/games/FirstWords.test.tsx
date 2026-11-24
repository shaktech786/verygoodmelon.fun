import { render, screen, fireEvent, act } from '@testing-library/react'
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

  describe('the sky after speaking', () => {
    const litSky = () => document.querySelector('[data-sky].opacity-100')?.getAttribute('data-sky')

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('stays at night while the words wait to be judged, and rises only once they are safe', async () => {
      Element.prototype.scrollIntoView = vi.fn()
      let judge: (reply: unknown) => void = () => {}
      vi.stubGlobal('fetch', vi.fn((url: string) => {
        if (url.endsWith('/reflect')) {
          return new Promise((resolve) => {
            judge = (reply) => resolve({ ok: true, json: async () => reply })
          })
        }
        return Promise.resolve({ ok: false, json: async () => ({}) })
      }))

      render(<FirstWords />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Oh. It is so quiet here.' } })
      fireEvent.click(screen.getByRole('button', { name: /^Speak$/i }))

      expect(screen.getByRole('heading', { name: 'Before you wake' })).toBeInTheDocument()
      expect(litSky()).toBe('night')

      await act(async () => judge({ reflection: 'Carry it home.', intention: 'Call Mum.', safe: true }))
      expect(litSky()).toBe('dawn')
    })
  })
})
