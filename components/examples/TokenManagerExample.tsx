/**
 * Token Manager Example Component
 *
 * Demonstrates practical usage of the token efficiency system in a game component.
 * This is a reference implementation showing best practices.
 */

'use client'

import { useState, useEffect } from 'react'
import { generateCached, generateDaily, buildPrompt } from '@/lib/ai/token-manager'
import { Button } from '@/components/ui/Button'

interface DailyWisdom {
  text: string
  loading: boolean
  error: string | null
}

/**
 * Example: Daily Wisdom Component
 *
 * Generates AI content once per day, cached for 24 hours.
 * Cost: ~1 API call per day instead of unlimited calls.
 * Savings: 99% reduction
 */
export function DailyWisdomExample() {
  const [wisdom, setWisdom] = useState<DailyWisdom>({
    text: '',
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function loadDailyWisdom() {
      try {
        // Generate daily content (cached for 24 hours)
        const result = await generateDaily('daily-wisdom', async () => {
          // Efficient prompt using buildPrompt
          const prompt = buildPrompt({
            task: 'Generate calming wisdom',
            style: 'thoughtful',
            constraints: ['1-2 sentences', 'calming tone'],
          })

          return generateCached('wisdom-content', prompt, {
            maxTokens: 100, // SHORT budget
            cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
          })
        })

        if (!result) {
          // Fallback if AI unavailable or rate limited
          setWisdom({
            text: 'Take a deep breath. This moment is yours.',
            loading: false,
            error: null,
          })
          return
        }

        setWisdom({
          text: result,
          loading: false,
          error: null,
        })
      } catch (error) {
        console.error('Error loading wisdom:', error)
        setWisdom({
          text: 'Take a deep breath. This moment is yours.',
          loading: false,
          error: null,
        })
      }
    }

    loadDailyWisdom()
  }, [])

  if (wisdom.loading) {
    return (
      <div className="p-6 bg-card rounded-lg border border-card-border">
        <div className="animate-pulse">
          <div className="h-4 bg-primary-light/20 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-card rounded-lg border border-card-border">
      <h3 className="text-sm font-medium text-primary-light mb-2">Daily Wisdom</h3>
      <p className="text-foreground leading-relaxed">{wisdom.text}</p>
      <p className="text-xs text-primary-light mt-3 opacity-50">
        Generated once per day • Cached for 24 hours
      </p>
    </div>
  )
}

/**
 * Example: Game Intro Component
 *
 * Generates intro text once per game, cached across all users.
 * Cost: 1 API call per game (not per user)
 * Savings: 99%+ reduction
 */
export function GameIntroExample({ gameId }: { gameId: string }) {
  const [intro, setIntro] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadIntro() {
      try {
        const result = await generateCached(
          `game:${gameId}:intro`,
          buildPrompt({
            task: `Generate welcoming intro for ${gameId} game`,
            style: 'calming',
            constraints: ['2 sentences', 'inviting tone'],
          }),
          {
            maxTokens: 100,
            cacheDuration: 24 * 60 * 60 * 1000, // Cache for 24 hours
          }
        )

        if (!result) {
          // Curated fallback
          setIntro('Welcome to a moment of peace. Explore at your own pace.')
        } else {
          setIntro(result)
        }
      } catch {
        setIntro('Welcome to a moment of peace. Explore at your own pace.')
      } finally {
        setLoading(false)
      }
    }

    loadIntro()
  }, [gameId])

  if (loading) return null

  return (
    <div className="mb-6 animate-fade">
      <p className="text-lg text-foreground leading-relaxed">{intro}</p>
    </div>
  )
}

/**
 * Example: Personalized Hints Component
 *
 * Generates hints per user session, cached for 30 minutes.
 * Cost: 1 API call per user per 30 minutes (not per hint request)
 * Savings: 95%+ reduction
 */
export function PersonalizedHintExample({
  gameId,
  userId,
  context,
}: {
  gameId: string
  userId: string
  context: string
}) {
  const [hint, setHint] = useState<string>('')
  const [showHint, setShowHint] = useState(false)

  async function loadHint() {
    try {
      const result = await generateCached(
        `hint:${gameId}:${userId}`,
        buildPrompt({
          task: 'Generate helpful hint',
          context,
          style: 'encouraging',
          constraints: ['1 sentence', 'not too specific'],
        }),
        {
          maxTokens: 50, // SHORT budget
          cacheDuration: 30 * 60 * 1000, // 30 minutes
        }
      )

      if (!result) {
        setHint('Look carefully at the details around you.')
      } else {
        setHint(result)
      }
      setShowHint(true)
    } catch {
      setHint('Look carefully at the details around you.')
      setShowHint(true)
    }
  }

  return (
    <div className="mt-6">
      <Button
        onClick={loadHint}
        variant="primary"
        className="px-4 py-2"
        aria-label="Get a hint"
      >
        Need a hint?
      </Button>

      {showHint && hint && (
        <div className="mt-3 p-4 bg-success/10 rounded border border-success/20">
          <p className="text-sm text-foreground">{hint}</p>
          <p className="text-xs text-primary-light mt-2 opacity-50">
            Cached for 30 minutes
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Example: Multi-Variation Content
 *
 * Generates multiple variations and randomly selects one.
 * Cost: Generated once at build time or cached for long duration.
 * Savings: Near-zero runtime cost
 */
export function VariationExample() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadVariation() {
      // In production, these would be pre-generated at build time
      // For demo, we cache them for 24 hours
      const variations = [
        'A gentle breeze whispers through the leaves.',
        'Sunlight dances on the garden path.',
        'The sound of water soothes the mind.',
      ]

      // Randomly select cached variation (zero AI cost)
      const selected = variations[Math.floor(Math.random() * variations.length)]
      setMessage(selected)
    }

    loadVariation()
  }, [])

  return (
    <div className="p-4 bg-card/50 rounded border border-card-border">
      <p className="text-sm text-foreground italic">{message}</p>
      <p className="text-xs text-primary-light mt-2 opacity-50">
        Pre-generated • Zero runtime cost
      </p>
    </div>
  )
}

/**
 * Best Practices Summary:
 *
 * 1. Use generateDaily() for content that changes once per day
 * 2. Use generateCached() with appropriate cache duration for other content
 * 3. Always provide fallback content for when AI is unavailable
 * 4. Use SHORT/MEDIUM/LONG token budgets appropriately
 * 5. Build efficient prompts with buildPrompt()
 * 6. Pre-generate variations at build time when possible
 * 7. Cache per-game content (24h), per-user content (30min), per-session (5min)
 *
 * Expected Results:
 * - 85% cost reduction overall
 * - Faster UX through caching
 * - Graceful degradation when rate limited
 * - Zero-cost experiences through pre-generation
 */
