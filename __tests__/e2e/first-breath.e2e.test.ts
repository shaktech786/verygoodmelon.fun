import { test } from '@playwright/test'
import { describeWritingGame } from './helpers/writing-game'

/**
 * The Awakening (First Words): imagine arriving on the other side, speak first,
 * receive a reflection, and see what others said when the store is reachable.
 *
 * Run with: npx playwright test __tests__/e2e/first-breath.e2e.test.ts
 */
test.describe('The Awakening', () => {
  describeWritingGame({
    slug: 'first-breath',
    table: 'first_words',
    reflectPath: '/api/first-words/reflect',
    submitLabel: 'Share Your Vision',
    againLabel: 'Cross Over Again',
    thanksHeading: "You've arrived",
    textboxLabel: /Enter your first words/,
    cloudLabel: 'Most common first words',
    promptMarker: '✦',
  })
})
