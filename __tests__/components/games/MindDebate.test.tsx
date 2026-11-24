import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import MindDebate from '@/components/games/MindDebate'
import { CareModeProvider } from '@/components/games/CareMode'

const REFUSAL = /will not hold, whoever is asking/

const fetchMock = vi.fn()

function startDebate(topic: string, first = 'Socrates', second = 'Nietzsche') {
  render(
    <CareModeProvider>
      <MindDebate />
    </CareModeProvider>,
  )
  fireEvent.change(screen.getByLabelText('First debater'), { target: { value: first } })
  fireEvent.change(screen.getByLabelText('Second debater'), { target: { value: second } })
  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: topic } })
  fireEvent.click(screen.getByRole('button', { name: 'Begin' }))
}

const careStored = () => localStorage.getItem('verygoodmelon:care') !== null

describe('The Arena, when a written question sounds like someone in danger', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('meets the question with the helplines first, never the refusal, and sends nothing', () => {
    startDebate('Should I just end my life tonight?')

    const support = screen.getByRole('region', { name: 'Support' })
    expect(support).toContainElement(screen.getByRole('link', { name: '988' }))
    expect(screen.getByRole('heading', { name: "You don't have to hold this alone" })).toHaveFocus()
    expect(screen.queryByText(REFUSAL)).not.toBeInTheDocument()
    expect(screen.queryByText(/end my life/)).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(careStored()).toBe(true)
  })

  it('checks the debaters’ names too', () => {
    startDebate('Is free will an illusion?', 'Socrates', 'I want to kill myself')

    expect(screen.getByRole('link', { name: '988' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clears the words that called for care on the way back to the start', () => {
    startDebate('Should I just end my life tonight?')
    fireEvent.click(screen.getByRole('button', { name: 'Back to the start' }))

    expect(screen.getByLabelText('Topic')).toHaveValue('')
    expect(screen.getByLabelText('First debater')).toHaveValue('Socrates')
  })

  it('renders a care reply from the server the same caring way', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ declined: true, reason: 'care' }) })
    startDebate('Is it ever right to give up?')

    expect(await screen.findByRole('link', { name: '988' })).toBeInTheDocument()
    expect(screen.queryByText(REFUSAL)).not.toBeInTheDocument()
    expect(careStored()).toBe(true)
  })

  it('still refuses a topic the server sets aside for other reasons', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ declined: true, reason: 'topic' }) })
    startDebate('Which group deserves less?')

    expect(await screen.findByText(REFUSAL)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '988' })).not.toBeInTheDocument()
    expect(careStored()).toBe(false)
  })
})
