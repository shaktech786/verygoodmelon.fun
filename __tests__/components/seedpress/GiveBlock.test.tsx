import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CareModeProvider } from '@/components/games/CareMode'
import { GiveBlock } from '@/components/seedpress/GiveBlock'
import { GIVE, type GiveConfig } from '@/lib/give/config'

const SAMPLE: GiveConfig = {
  enabled: true,
  message: 'A sample sentence for the test only.',
  organisations: [
    { name: 'Sample Org One', href: 'https://example.test/one' },
    { name: 'Sample Org Two', href: 'https://example.test/two' },
  ],
}

describe('GiveBlock', () => {
  it('ships switched off, with no organisation chosen', () => {
    expect(GIVE).toEqual({ enabled: false, organisations: [] })
  })

  it('renders nothing while the shipped config is disabled', () => {
    const { container } = render(<GiveBlock placement="page" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing while disabled, even with organisations listed', () => {
    const { container } = render(<GiveBlock placement="footer" config={{ ...SAMPLE, enabled: false }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when enabled with nobody to give to', () => {
    const { container } = render(<GiveBlock placement="page" config={{ enabled: true, organisations: [] }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the heading, the sentence and one outside stamp link per organisation', () => {
    render(<GiveBlock placement="page" config={SAMPLE} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Give, if you can' })).toBeInTheDocument()
    expect(screen.getByText('A sample sentence for the test only.')).toBeInTheDocument()
    const one = screen.getByRole('link', { name: /^Sample Org One\s*\(opens in a new tab\)$/ })
    expect(one).toHaveAttribute('href', 'https://example.test/one')
    expect(one).toHaveAttribute('target', '_blank')
    expect(one).toHaveAttribute('rel', 'noopener noreferrer')
    expect(one).toHaveClass('sp-stamp')
    expect(one).not.toHaveAttribute('data-go')
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('has no counters, goals or urgency in what it adds', () => {
    const { container } = render(<GiveBlock placement="footer" config={SAMPLE} />)
    expect(container.textContent).not.toMatch(/\d|goal|raised|today|urgent|only .* left/i)
  })

  it('prints nothing on the server, before the browser knows whether care mode is on', () => {
    expect(renderToString(<GiveBlock placement="footer" config={SAMPLE} />)).toBe('')
    expect(renderToString(<GiveBlock placement="page" config={SAMPLE} />)).toBe('')
  })

  it('stays hidden while care mode lasts', () => {
    localStorage.setItem('verygoodmelon:care', JSON.stringify({ until: Date.now() + 60 * 60 * 1000 }))
    try {
      const { container } = render(
        <CareModeProvider>
          <GiveBlock placement="footer" config={SAMPLE} />
        </CareModeProvider>,
      )
      expect(container).toBeEmptyDOMElement()
    } finally {
      localStorage.removeItem('verygoodmelon:care')
    }
  })
})
