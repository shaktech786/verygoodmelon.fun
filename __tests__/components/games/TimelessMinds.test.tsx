import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock thinkers module - use importOriginal to preserve all exports
vi.mock('@/lib/games/timeless-minds/thinkers', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const mockThinker = {
    id: 'socrates',
    name: 'Socrates',
    era: '470-399 BCE',
    field: 'Philosophy',
    avatarUrl: '/avatars/socrates.jpg',
    openingLine: 'The unexamined life is not worth living.',
    topics: ['virtue', 'wisdom', 'justice'],
    gender: 'male',
  }
  return {
    ...actual,
    pickRandomThinker: () => mockThinker,
    getThinkerById: () => mockThinker,
  }
})

vi.mock('@/lib/games/timeless-minds/avatar-provider', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, resolveAvatarProvider: () => 'static' }
})

vi.mock('@/lib/games/timeless-minds/avatar-providers/resolve-avatar-id', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, resolveAvatarId: () => 'socrates' }
})

vi.mock('@/lib/games/timeless-minds/avatar-providers/registry', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, getActiveProvider: () => 'static' }
})

vi.mock('@/lib/games/timeless-minds/speech-synthesis', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    speakText: vi.fn(),
    stopSpeaking: vi.fn(),
    stopSpeech: vi.fn(),
    isSpeaking: () => false,
  }
})

vi.mock('@/lib/games/timeless-minds/speech-recognition', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    isListening: () => false,
  }
})

vi.mock('@/components/games/avatars/AvatarRenderer', () => {
  const MockAvatar = () => <div data-testid="avatar-renderer">Avatar</div>
  return { default: MockAvatar, AvatarRenderer: MockAvatar }
})

vi.mock('@/lib/features/featureFlags', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, isFeatureEnabled: () => false }
})

import TimelessMinds from '@/components/games/TimelessMinds'
import { CareModeProvider, useCareMode } from '@/components/games/CareMode'

function CareProbe() {
  return <p data-testid="care-probe">{useCareMode().care ? 'care' : 'calm'}</p>
}

const reply = (body: Record<string, unknown>) => ({ ok: true, json: async () => body })

describe('TimelessMinds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Indeed, wisdom is the highest virtue.', emotion: 'thoughtful' }),
    })
  })

  it('renders with thinker name', async () => {
    render(<TimelessMinds />)
    await waitFor(() => {
      const elements = screen.getAllByText('Socrates')
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  it('shows message input', async () => {
    render(<TimelessMinds />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type a message/i)).toBeInTheDocument()
    })
  })

  it('shows send button', async () => {
    render(<TimelessMinds />)
    await waitFor(() => {
      expect(screen.getByLabelText(/Send message/i)).toBeInTheDocument()
    })
  })

  it('displays topic suggestions', async () => {
    render(<TimelessMinds />)
    await waitFor(() => {
      expect(screen.getByText(/Try asking about/i)).toBeInTheDocument()
    })
  })

  it('renders avatar area', async () => {
    render(<TimelessMinds />)
    await waitFor(() => {
      expect(screen.getByTestId('avatar-renderer')).toBeInTheDocument()
    })
  })

  it('says plainly that the conversation is imagined, without naming the technology', async () => {
    render(<TimelessMinds />)
    await waitFor(() => {
      expect(screen.getByText(/Imagined conversations, not real quotes from the person/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/\bAI\b/)).not.toBeInTheDocument()
  })

  it('starts with the voice off until the player chooses it', async () => {
    render(<TimelessMinds />)
    const voice = await screen.findByRole('button', { name: 'Turn on thinker voice' })
    expect(voice).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not take focus when the page loads', async () => {
    render(<TimelessMinds />)
    const box = await screen.findByRole('textbox', { name: 'Message input' })
    expect(box).not.toHaveFocus()
  })

  it('reads Ready, not Listening, while the microphone is off', async () => {
    render(<TimelessMinds />)
    expect(await screen.findByText('Ready')).toBeInTheDocument()
    expect(screen.queryByText(/Listening/)).not.toBeInTheDocument()
  })

  it('announces replies once, as plain text, in a polite conversation log', async () => {
    mockFetch.mockImplementation(async (url: string) =>
      url.includes('/chat') ? reply({ response: '**Breathe.** Then tell me *more*.', emotion: 'neutral' }) : reply({})
    )
    render(<TimelessMinds />)
    const log = await screen.findByRole('log', { name: 'Conversation' })
    expect(log).toHaveAttribute('aria-live', 'polite')

    await userEvent.type(screen.getByRole('textbox', { name: 'Message input' }), 'Hello{Enter}')

    expect(await within(log).findByText('Breathe. Then tell me more.')).toBeInTheDocument()
    expect(log.textContent).not.toContain('*')
  })

  it('keeps tappable support in view for the rest of the visit once a reply calls for care', async () => {
    let call = 0
    mockFetch.mockImplementation(async (url: string) => {
      if (!url.includes('/chat')) return reply({})
      call += 1
      return call === 1
        ? reply({ response: 'I am glad you told me.', emotion: 'concerned', care: true })
        : reply({ response: 'I am still here.', emotion: 'neutral' })
    })
    render(<CareModeProvider><TimelessMinds /><CareProbe /></CareModeProvider>)
    const box = await screen.findByRole('textbox', { name: 'Message input' })
    expect(screen.queryByRole('complementary', { name: 'Support' })).not.toBeInTheDocument()

    await userEvent.type(box, 'Everyone would be fine without me{Enter}')
    const support = await screen.findByRole('complementary', { name: 'Support' })
    expect(within(support).getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988')
    expect(within(support).getByRole('link', { name: '116 123' })).toHaveAttribute('href', 'tel:116123')
    expect(within(support).getByRole('link', { name: 'findahelpline.com' })).toHaveAttribute('href', 'https://findahelpline.com')
    expect(screen.getByTestId('care-probe')).toHaveTextContent('care')

    await userEvent.type(box, 'Thank you{Enter}')
    await screen.findByText('I am still here.')
    expect(screen.getByRole('complementary', { name: 'Support' })).toBeInTheDocument()
  })
})
