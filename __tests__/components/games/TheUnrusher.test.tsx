import { render, screen, fireEvent } from '@testing-library/react'
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

  it('shows the moment, its guidance and a timer once started', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Look at One Thing'))
    expect(screen.getByRole('heading', { name: 'Look at One Thing' })).toBeInTheDocument()
    expect(screen.getByText('Its colours, then its shadow...')).toBeInTheDocument()
    expect(screen.getByText('1:00')).toBeInTheDocument()
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
    expect(screen.getByRole('img', { name: '0 of 8 seeds settled' })).toBeInTheDocument()
  })

  it('returns to the moments when stopped', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Watch the Seeds'))
    fireEvent.click(screen.getByText(/I need to stop/i))
    expect(screen.getByText('Choose a moment to savor')).toBeInTheDocument()
  })
})
