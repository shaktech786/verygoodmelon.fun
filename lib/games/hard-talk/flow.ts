import type { TalkKind } from './content'

export const STEP_IDS = [
  'kind', 'who', 'shoulders', 'ground', 'breath', 'understand', 'worry', 'opening', 'them', 'kindness', 'carry',
] as const
export type StepId = (typeof STEP_IDS)[number]

// An apology or a complaint lands better when the other person's side comes
// before planning for the hard moment, so those talks meet them earlier.
const OTHER_PERSON_FIRST: readonly StepId[] = [
  'kind', 'who', 'shoulders', 'ground', 'breath', 'understand', 'them', 'worry', 'opening', 'kindness', 'carry',
]

export function stepsFor(kind: TalkKind | null): readonly StepId[] {
  return kind === 'sorry' || kind === 'problem' ? OTHER_PERSON_FIRST : STEP_IDS
}

export function nextStep(kind: TalkKind | null, step: StepId): StepId | null {
  const steps = stepsFor(kind)
  return steps[steps.indexOf(step) + 1] ?? null
}

export function previousStep(kind: TalkKind | null, step: StepId): StepId | null {
  const steps = stepsFor(kind)
  const index = steps.indexOf(step)
  return index > 0 ? steps[index - 1] : null
}

export function stepPosition(kind: TalkKind | null, step: StepId): { index: number; total: number } {
  const steps = stepsFor(kind)
  return { index: steps.indexOf(step) + 1, total: steps.length }
}

/** Eleven steps read as a long form, so progress is shown as three calm stages instead. */
export const STAGES = ['Settling in', 'Finding your words', 'Nearly there'] as const
export type Stage = 1 | 2 | 3

export function stageOf(kind: TalkKind | null, step: StepId): Stage {
  const { index } = stepPosition(kind, step)
  return index <= 5 ? 1 : index <= 8 ? 2 : 3
}
