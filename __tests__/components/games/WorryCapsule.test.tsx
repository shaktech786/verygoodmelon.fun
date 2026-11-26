import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { SEALED_LINES } from '@/lib/games/worry-capsule/copy'

// The jar's animation classes are irrelevant here, and a CSS module needs the PostCSS build to load
vi.mock('@/components/games/worry-capsule/Keeper.module.css', () => ({ default: new Proxy({}, { get: (_, key) => String(key) }) }))

// The Keeper's store caches its snapshot at module level, so each test starts from a fresh copy
async function renderKeeper() {
  vi.resetModules()
  const { default: WorryCapsule } = await import('@/components/games/WorryCapsule')
  const { CareModeProvider } = await import('@/components/games/CareMode')
  render(
    <CareModeProvider>
      <WorryCapsule />
    </CareModeProvider>,
  )
}

async function foldUp(worry: string) {
  await renderKeeper()
  fireEvent.change(await screen.findByLabelText('Your worry'), { target: { value: worry } })
  fireEvent.click(screen.getByRole('button', { name: 'Fold it up' }))
}

const careStored = () => localStorage.getItem('verygoodmelon:care') !== null

describe('The Keeper, when a worry sounds like someone in danger', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('puts the helplines first and holds back the seal confirmation', async () => {
    await foldUp('I don’t want to be alive anymore')

    const support = screen.getByRole('complementary', { name: 'Support' })
    const helpline = screen.getByRole('link', { name: /988/ })
    expect(support).toContainElement(helpline)
    expect(screen.queryByRole('heading', { name: 'Ready to seal it?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Seal it' })).not.toBeInTheDocument()

    // Sealing stays possible, but it comes after the support and is never the main action
    const keepAnyway = screen.getByRole('button', { name: 'Keep it in a jar anyway' })
    expect(helpline.compareDocumentPosition(keepAnyway) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(careStored()).toBe(true)
  })

  it('keeps the helplines on the sealed view, without the settling line', async () => {
    await foldUp('I don’t want to be alive anymore')
    fireEvent.click(screen.getByRole('button', { name: 'Keep it in a jar anyway' }))

    expect(await screen.findByRole('heading', { name: 'It is kept' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Support' })).toContainElement(screen.getByRole('link', { name: /988/ }))
    for (const line of SEALED_LINES) expect(screen.queryByText(line)).not.toBeInTheDocument()
  })

  it('still offers the usual seal for an everyday worry', async () => {
    await foldUp('I’m worried the presentation will go badly')

    expect(screen.getByRole('heading', { name: 'Ready to seal it?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seal it' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Support' })).not.toBeInTheDocument()
    expect(careStored()).toBe(false)
  })
})

describe('The Keeper in care mode', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('shows the helplines on the sealed view even for an everyday worry', async () => {
    localStorage.setItem('verygoodmelon:care', JSON.stringify({ until: Date.now() + 60_000 }))
    await foldUp('I’m worried the presentation will go badly')
    fireEvent.click(screen.getByRole('button', { name: 'Seal it' }))

    expect(await screen.findByRole('heading', { name: 'It is kept' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /988/ })).toBeInTheDocument()
  })
})
