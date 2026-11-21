import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'
import { CARE_LASTS_MS, CareModeProvider, useCareMode } from '@/components/games/CareMode'

function Probe() {
  const { care, enterCareMode } = useCareMode()
  return (
    <>
      <p data-testid="care">{care ? 'care' : 'calm'}</p>
      <button onClick={enterCareMode}>enter</button>
    </>
  )
}

const enter = () => fireEvent.click(screen.getByRole('button', { name: 'enter' }))

describe('care mode', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
    localStorage.clear()
  })

  it('starts calm', () => {
    render(<CareModeProvider><Probe /></CareModeProvider>)
    expect(screen.getByTestId('care')).toHaveTextContent('calm')
  })

  it('lasts across a reload', () => {
    const { unmount } = render(<CareModeProvider><Probe /></CareModeProvider>)
    enter()
    expect(screen.getByTestId('care')).toHaveTextContent('care')
    unmount()

    render(<CareModeProvider><Probe /></CareModeProvider>)
    expect(screen.getByTestId('care')).toHaveTextContent('care')
  })

  it('carries over to a new tab, which starts with empty session storage', () => {
    const { unmount } = render(<CareModeProvider><Probe /></CareModeProvider>)
    enter()
    unmount()
    sessionStorage.clear()

    render(<CareModeProvider><Probe /></CareModeProvider>)
    expect(screen.getByTestId('care')).toHaveTextContent('care')
  })

  it('reaches a tab that is already open', () => {
    render(<CareModeProvider><Probe /></CareModeProvider>)
    localStorage.setItem('verygoodmelon:care', JSON.stringify({ until: Date.now() + 60_000 }))
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'verygoodmelon:care' }))
    })
    expect(screen.getByTestId('care')).toHaveTextContent('care')
  })

  it('clears itself after a few hours, so it never follows someone for days', () => {
    const now = Date.now()
    const { unmount } = render(<CareModeProvider><Probe /></CareModeProvider>)
    enter()
    unmount()

    vi.spyOn(Date, 'now').mockReturnValue(now + CARE_LASTS_MS - 60_000)
    const { unmount: unmountLater } = render(<CareModeProvider><Probe /></CareModeProvider>)
    expect(screen.getByTestId('care')).toHaveTextContent('care')
    unmountLater()

    vi.spyOn(Date, 'now').mockReturnValue(now + CARE_LASTS_MS + 60_000)
    render(<CareModeProvider><Probe /></CareModeProvider>)
    expect(screen.getByTestId('care')).toHaveTextContent('calm')
  })

  it('ignores a damaged stored value', () => {
    localStorage.setItem('verygoodmelon:care', '{not json')
    render(<CareModeProvider><Probe /></CareModeProvider>)
    expect(screen.getByTestId('care')).toHaveTextContent('calm')
  })

  it('falls back to session storage when local storage is refused', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const { unmount } = render(<CareModeProvider><Probe /></CareModeProvider>)
    enter()
    unmount()
    expect(sessionStorage.getItem('verygoodmelon:care')).toBe('1')

    render(<CareModeProvider><Probe /></CareModeProvider>)
    expect(screen.getByTestId('care')).toHaveTextContent('care')
  })

  it('still holds for this page when the browser refuses all storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    render(<CareModeProvider><Probe /></CareModeProvider>)
    act(() => {
      enter()
    })
    expect(screen.getByTestId('care')).toHaveTextContent('care')
  })
})
