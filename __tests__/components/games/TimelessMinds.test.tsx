import { render, screen, waitFor } from '@testing-library/react'
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
    getRandomThinker: () => mockThinker,
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

  it('shows disclaimer text', async () => {
    render(<TimelessMinds />)
    await waitFor(() => {
      expect(screen.getByText(/AI simulation/i)).toBeInTheDocument()
    })
  })
})
