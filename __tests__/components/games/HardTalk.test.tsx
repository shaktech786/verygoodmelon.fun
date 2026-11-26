import { render, screen } from '@testing-library/react'
import HardTalk from '@/components/games/HardTalk'
import { CareModeProvider } from '@/components/games/CareMode'
import { STORAGE_KEY, newSession } from '@/lib/games/hard-talk/session'

/** Opens the game at its last step, the card to carry in, with the line written in the player's own words. */
function renderAtCarry(understand: string) {
  const now = Date.now()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...newSession(0, now), kind: 'other', step: 'carry', understand, finishedAt: now }),
  )
  render(
    <CareModeProvider>
      <HardTalk />
    </CareModeProvider>,
  )
}

const keepsakeActions = () => [
  screen.queryByRole('button', { name: /Save the card as a picture/ }),
  screen.queryByRole('button', { name: /Share/ }),
  screen.queryByRole('button', { name: /Copy as text/ }),
  screen.queryByRole('button', { name: 'Keep this on screen' }),
]

describe('The Plain Speaker, when the line sounds like someone in danger', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('puts the helplines first and makes no keepsake to save or share', async () => {
    renderAtCarry('I’m planning to kill myself after we talk')

    const helpline = await screen.findByRole('link', { name: /988/ })
    expect(helpline.closest('aside')).toHaveAccessibleName('Support')
    for (const action of keepsakeActions()) expect(action).not.toBeInTheDocument()
    expect(screen.queryByText(/planning to kill myself/i)).not.toBeInTheDocument()
    expect(localStorage.getItem('verygoodmelon:care')).not.toBeNull()
  })

  it('still makes the card for an everyday line', async () => {
    renderAtCarry('I miss how we used to talk')

    expect(await screen.findByRole('button', { name: /Save the card as a picture/ })).toBeInTheDocument()
    expect(screen.getByText('I miss how we used to talk.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /988/ })).not.toBeInTheDocument()
    expect(localStorage.getItem('verygoodmelon:care')).toBeNull()
  })
})
