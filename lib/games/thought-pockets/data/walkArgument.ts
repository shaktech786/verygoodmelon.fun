import { RoundReport, RunState } from '@/types/thought-pockets'
import { getEnemyDef } from './enemies'
import { getSchoolDef } from './schools'

function number(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/0$/, '')
}

/** One card of the argument in a few words: "Observation (Conclusion ×3: 12 Weight)". */
export function stepWords(step: RoundReport['steps'][number]): string {
  const parts: string[] = []
  if (step.weight > 0) parts.push(`${number(step.weight)} Weight`)
  if (step.multiplier > 0) parts.push(`+${number(step.multiplier)} Mult`)
  if (step.guard > 0) parts.push(`${step.guard} Guard`)
  if (step.unsettle > 0) parts.push(`Unsettle ${step.unsettle}`)
  const what = parts.join(', ')
  if (step.times > 1) return `${step.name} (Conclusion ×${step.times}${what ? `: ${what}` : ''})`
  return what ? `${step.name} (${what})` : step.name
}

/** The best argument of a walk as plain text, for the player to keep or pass on as they like: every number is the engine's own. */
export function walkArgumentText(run: Pick<RunState, 'school' | 'length' | 'mode' | 'rigor' | 'bestArgument'>): string | null {
  const best = run.bestArgument
  if (!best) return null
  const { round } = best
  const pace = run.mode === 'rigorous' ? `Rigorous ${run.rigor}` : 'Gentle'
  const walk = run.length === 'short' ? 'Short walk' : 'Long walk'
  const extras = [
    round.carriedWeight > 0 ? `leftover Guard +${round.carriedWeight} Weight` : null,
    round.doubtWeight > 0 ? `Doubts in hand +${round.doubtWeight} Weight` : null,
  ].filter((x): x is string => x !== null)
  const lines = [
    `The Philosopher · ${walk} · ${getSchoolDef(run.school).name}, ${pace}`,
    `My argument of the walk, against ${getEnemyDef(best.enemyId).name}:`,
    round.steps.map(stepWords).join(' → ') + (extras.length > 0 ? ` (with ${extras.join(', ')})` : ''),
    `Weight ${round.weight} × Multiplier ${number(round.multiplier)} = ${round.product}`,
    ...round.chain.map((step) => `→ ${step.text}: ${step.after}`),
    `${round.damage} damage`,
  ]
  return lines.join('\n')
}
