import { MECHANIC_OPTIONS, type MechanicCategory } from './types'

export interface PlanStep {
  category: MechanicCategory
  /** Every rule this step may bring; the first is the one this run leans toward. */
  options: string[]
}

// Moving comes first and something to gather second, or the early waves would have nothing to do.
const MIDDLE: readonly MechanicCategory[] = ['threat', 'power', 'modifier']

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function step(category: MechanicCategory, random: () => number, isTouch: boolean): PlanStep {
  if (category === 'movement' && isTouch) return { category, options: ['mouse_follow'] }
  const options = MECHANIC_OPTIONS[category]
  const lean = pick(options, random)
  return { category, options: [lean, ...options.filter(id => id !== lean)] }
}

/** The order the steps arrive in; a replay never repeats the previous one. */
export function planOrder(plan: PlanStep[]): string {
  return plan.map(s => s.category).join('>')
}

/** Which rules arrive and in what order. `avoid` is the previous run's order, so a replay always grows differently. */
export function planRun(random: () => number, isTouch: boolean, avoid?: string): PlanStep[] {
  const plan: PlanStep[] = [
    step('movement', random, isTouch),
    step('collectible', random, isTouch),
    ...shuffled(MIDDLE, random).map(category => step(category, random, isTouch)),
    step('climax', random, isTouch),
  ]
  if (planOrder(plan) !== avoid) return plan
  // A fixed or unlucky random source can repeat itself, so two middle rules trade places.
  return [plan[0], plan[1], plan[3], plan[2], plan[4], plan[5]]
}
