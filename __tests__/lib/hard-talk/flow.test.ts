import { describe, expect, it } from 'vitest'
import { STAGES, nextStep, previousStep, stageOf, stepPosition, stepsFor, type StepId } from '@/lib/games/hard-talk/flow'
import { TALK_KINDS } from '@/lib/games/hard-talk/content'

const DEFAULT_ORDER: StepId[] = [
  'kind', 'who', 'shoulders', 'ground', 'breath', 'understand', 'worry', 'opening', 'them', 'kindness', 'carry',
]

describe('step sequence', () => {
  it('settles the body before asking anything about the talk itself', () => {
    for (const kind of [null, ...TALK_KINDS]) {
      const steps = stepsFor(kind)
      expect(steps.indexOf('breath')).toBeLessThan(steps.indexOf('understand'))
      expect(steps.indexOf('shoulders')).toBeLessThan(steps.indexOf('breath'))
    }
  })

  it('starts by asking about the talk and always ends with one line to carry in', () => {
    for (const kind of [null, ...TALK_KINDS]) {
      const steps = stepsFor(kind)
      expect(steps[0]).toBe('kind')
      expect(steps[1]).toBe('who')
      expect(steps.at(-1)).toBe('carry')
      expect(new Set(steps).size).toBe(steps.length)
      expect([...steps].sort()).toEqual([...DEFAULT_ORDER].sort())
    }
  })

  it('uses the default order before a kind of talk is chosen and for most talks', () => {
    expect(stepsFor(null)).toEqual(DEFAULT_ORDER)
    expect(stepsFor('ask')).toEqual(DEFAULT_ORDER)
    expect(stepsFor('doctor')).toEqual(DEFAULT_ORDER)
  })

  it('thinks about the other person before the worry when saying sorry or raising a problem', () => {
    for (const kind of ['sorry', 'problem'] as const) {
      const steps = stepsFor(kind)
      expect(steps.indexOf('them')).toBe(steps.indexOf('understand') + 1)
      expect(steps.indexOf('them')).toBeLessThan(steps.indexOf('worry'))
    }
  })

  it('moves forward and back one step at a time, stopping at either end', () => {
    expect(nextStep('ask', 'kind')).toBe('who')
    expect(nextStep('ask', 'carry')).toBeNull()
    expect(previousStep('ask', 'kind')).toBeNull()
    expect(previousStep('ask', 'who')).toBe('kind')
    expect(nextStep('sorry', 'understand')).toBe('them')
    expect(previousStep('sorry', 'worry')).toBe('them')
  })

  it('walks every kind of talk from start to finish and back again', () => {
    for (const kind of TALK_KINDS) {
      const forward: StepId[] = ['kind']
      for (let step = nextStep(kind, 'kind'); step; step = nextStep(kind, step)) forward.push(step)
      expect(forward).toEqual(stepsFor(kind))

      const backward: StepId[] = ['carry']
      for (let step = previousStep(kind, 'carry'); step; step = previousStep(kind, step)) backward.push(step)
      expect(backward.reverse()).toEqual(stepsFor(kind))
    }
  })

  it('reports a one-based position for the gentle progress marker', () => {
    expect(stepPosition('ask', 'kind')).toEqual({ index: 1, total: 11 })
    expect(stepPosition('ask', 'carry')).toEqual({ index: 11, total: 11 })
    expect(stepPosition('sorry', 'them')).toEqual({ index: 7, total: 11 })
  })

  it('groups the steps into three gentle stages that only ever move forward', () => {
    expect(STAGES).toHaveLength(3)
    for (const kind of [null, ...TALK_KINDS]) {
      const stages = stepsFor(kind).map((step) => stageOf(kind, step))
      expect(stages[0]).toBe(1)
      expect(stages.at(-1)).toBe(3)
      for (let i = 1; i < stages.length; i++) expect(stages[i] - stages[i - 1]).toBeGreaterThanOrEqual(0)
      expect(new Set(stages)).toEqual(new Set([1, 2, 3]))
    }
  })

  it('keeps the body settling in the first stage and the line to carry in the last', () => {
    for (const kind of [null, ...TALK_KINDS]) {
      for (const step of ['kind', 'who', 'shoulders', 'ground', 'breath'] as const) expect(stageOf(kind, step)).toBe(1)
      expect(stageOf(kind, 'understand')).toBe(2)
      expect(stageOf(kind, 'kindness')).toBe(3)
      expect(stageOf(kind, 'carry')).toBe(3)
    }
  })
})
