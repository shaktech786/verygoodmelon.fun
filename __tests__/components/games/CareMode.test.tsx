import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'
import { CareModeProvider, useCareMode } from '@/components/games/CareMode'

function Probe() {
  const { care, enterCareMode } = useCareMode()
  return (
    <>
      <p data-testid="care">{care ? 'care' : 'calm'}</p>
      <button onClick={enterCareMode}>enter</button>
    </>
  )
}

describe('care mode', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('starts calm', () => {
    render(<CareModeProvider><Probe /></CareModeProvider>)
    expect(screen.getByTestId('care')).toHaveTextContent('calm')
  })

  it('lasts for the rest of the browser session, across a reload', () => {
    const { unmount } = render(<CareModeProvider><Probe /></CareModeProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'enter' }))
    expect(screen.getByTestId('care')).toHaveTextContent('care')
    unmount()

    render(<CareModeProvider><Probe /></CareModeProvider>)
    expect(screen.getByTestId('care')).toHaveTextContent('care')
  })

  it('still holds for this page when the browser refuses session storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    render(<CareModeProvider><Probe /></CareModeProvider>)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'enter' }))
    })
    expect(screen.getByTestId('care')).toHaveTextContent('care')
  })
})
