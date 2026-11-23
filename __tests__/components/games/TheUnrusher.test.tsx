import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'

import TheUnrusher from '@/components/games/TheUnrusher'

describe('TheUnrusher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers five noticing moments and no breathing exercise', () => {
    render(<TheUnrusher />)
    for (const title of ['Watch the Seeds', 'Listen to Silence', 'Look at One Thing', 'Notice This Moment', 'Count Three Things']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.queryByText('Just Breathe')).not.toBeInTheDocument()
  })

  it('introduces itself as an anti-game about noticing', () => {
    render(<TheUnrusher />)
    expect(screen.getByText(/anti-game about noticing/i)).toBeInTheDocument()
  })

  it('shows the moment, its guidance and a wordless ring of progress once started', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Look at One Thing'))
    expect(screen.getByRole('heading', { name: 'Look at One Thing' })).toBeInTheDocument()
    expect(screen.getByText('Its colours, then its shadow...')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'The moment has just begun' })).toBeInTheDocument()
    // No countdown is shown or read out
    expect(screen.queryByText(/^\d+:\d{2}$/)).not.toBeInTheDocument()
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
  })

  it('without sound, Listen to Silence keeps eyes open', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Listen to Silence'))
    expect(screen.getByText(/Soften your gaze/)).toBeInTheDocument()
    expect(screen.queryByText(/Close your eyes/)).not.toBeInTheDocument()
  })

  it('shows the seeds field while watching the seeds', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Watch the Seeds'))
    expect(screen.getByRole('img', { name: 'Seeds drifting, none settled yet' })).toBeInTheDocument()
  })

  it('returns to the moments when stopped', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Watch the Seeds'))
    fireEvent.click(screen.getByText(/Leave early/i))
    expect(screen.getByText('Choose a moment to savor')).toBeInTheDocument()
  })
  it('never ends a writing moment while the player is typing, and waits for Done', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Look at One Thing'))
    const input = screen.getByRole('textbox', { name: /What are you looking at/ })
    fireEvent.focus(input)
    let text = ''
    for (const letter of 'the chipped blue m') {
      text += letter
      fireEvent.change(input, { target: { value: text } })
      act(() => { vi.advanceTimersByTime(4000) })
    }
    // 72 seconds of typing: the clock rested the whole time.
    expect(screen.getByText('The time waits while you write.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Moment savored' })).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(66_000) })
    expect(screen.queryByRole('heading', { name: 'Moment savored' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Finish your thought, then press Done.')

    fireEvent.change(input, { target: { value: 'the chipped blue mug' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('heading', { name: 'Moment savored' })).toBeInTheDocument()
    expect(screen.getByText('the chipped blue mug')).toBeInTheDocument()
  })

  it('ends on its own when nothing was written', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Count Three Things'))
    act(() => { vi.advanceTimersByTime(50_400) })
    expect(screen.getByRole('heading', { name: 'Moment savored' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
  })
})
