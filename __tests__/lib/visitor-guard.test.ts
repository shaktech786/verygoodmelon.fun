import { describe, expect, it } from 'vitest'
import { overstepsVisitor } from '@/lib/ai/visitor-guard'

describe('overstepsVisitor', () => {
  it.each([
    // Both slipped past the prompt rule in real replies
    'You reached for your mother first, and use your time well.',
    'There is no need to keep letting fear dictate your time.',
    'Say it while you still can.',
    'Tell her while there is time.',
    'Say it while there\'s still time.',
    'You still have plenty of quiet days left.',
    'Do it before it\'s too late.',
    'Life is short, so tell them.',
    'Treasure the precious time you have.',
    'It is not too late to change.',
    'None of those years were wasted.',
    'You should have said it sooner.',
    'You should’ve told her.',
    'You could have done more.',
    'You need to stop holding back.',
    'You should call your brother.',
    'Make the most of every morning.',
    'Learn to live more fully.',
    'Try to do better tomorrow.',
    'Don\'t let the days slip by.',
    'What will you do with the time you have left?',
  ])('rejects %j', (reply) => {
    expect(overstepsVisitor(reply)).toBe(true)
  })

  it.each([
    'This is about your sister, and how much she has meant to you.',
    'There is love underneath what you wrote. Someone could hear it from you today.',
    'Take your time with it.',
    'Your oak could use some color at its feet. A poppy, maybe?',
    'Butterflies love lavender. Some near the front would bring them closer.',
    'That sounds lonely. What do you miss most about her?',
    'In your time, people still wrote letters by hand.',
    'I should have listened to my wife more, and she never let me forget it.',
    'What you reached for first is worth reaching for now, in your own life.',
    'Every garden could use somewhere to sit.',
    'Both of them circled the same question: what makes a choice yours?',
    'Thank you for sitting with me a while. Go gently.',
    'At the time, Athens was a noisy, argumentative city.',
  ])('lets through %j', (reply) => {
    expect(overstepsVisitor(reply)).toBe(false)
  })
})
