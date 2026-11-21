import { test } from '@playwright/test'
import { describeWritingGame } from './helpers/writing-game'

/**
 * The Final Word (Last Words): write what you would say at the end, receive a
 * reflection, and see the words others left as a cloud when the store is reachable.
 *
 * Run with: npx playwright test __tests__/e2e/final-breath.e2e.test.ts
 */
test.describe('The Final Word', () => {
  describeWritingGame({
    slug: 'final-breath',
    table: 'last_words',
    reflectPath: '/api/last-words/reflect',
    submitLabel: 'Leave Your Mark',
    againLabel: 'Reflect Again',
    thanksHeading: 'Thank you for sharing',
    textboxLabel: /Enter your last words/,
    cloudLabel: 'Most common last words',
    promptMarker: '💭',
  })
})
