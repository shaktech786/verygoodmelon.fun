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

  it('renders task selection screen', () => {
    render(<TheUnrusher />)
    expect(screen.getByText('Just Breathe')).toBeInTheDocument()
    expect(screen.getByText('Watch the Seeds')).toBeInTheDocument()
    expect(screen.getByText('Listen to Silence')).toBeInTheDocument()
  })

  it('shows anti-game header', () => {
    render(<TheUnrusher />)
    expect(screen.getByText(/Anti-Game/i)).toBeInTheDocument()
  })

  it('shows philosophy text', () => {
    render(<TheUnrusher />)
    expect(screen.getByText(/slow down/i)).toBeInTheDocument()
  })

  it('starts breathing task on click', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Just Breathe'))
    // Should show breathing guidance
    expect(screen.getByText(/Inhale|Hold|Exhale/i)).toBeInTheDocument()
  })

  it('shows timer during active task', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Just Breathe'))
    expect(screen.getByText(/\d:\d{2}/)).toBeInTheDocument()
  })

  it('shows stop button during task', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Just Breathe'))
    expect(screen.getByText(/I need to stop/i)).toBeInTheDocument()
  })

  it('shows breathing circle visualization', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Just Breathe'))
    const circle = screen.getByLabelText(/Breathing circle/i)
    expect(circle).toBeInTheDocument()
  })

  it('returns to task selection on stop', () => {
    render(<TheUnrusher />)
    fireEvent.click(screen.getByText('Just Breathe'))
    fireEvent.click(screen.getByText(/I need to stop/i))
    // Should be back at task selection
    expect(screen.getByText('Just Breathe')).toBeInTheDocument()
  })
})
