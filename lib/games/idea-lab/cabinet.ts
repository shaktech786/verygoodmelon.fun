import type { Concept } from './concepts'

/** The two ideas that first made this one, from the remembered combinations, or null when the pair is unknown. */
export function recipeFor(
  conceptId: string,
  combinations: Record<string, string>,
  concepts: readonly Concept[],
): [Concept, Concept] | null {
  for (const [key, resultId] of Object.entries(combinations)) {
    if (resultId !== conceptId) continue
    const parts = key.split('+')
    if (parts.length !== 2) continue
    const first = concepts.find(c => c.id === parts[0])
    const second = concepts.find(c => c.id === parts[1])
    if (first && second) return [first, second]
  }
  return null
}

/** Newest first, so the idea just made sits at the front of the cabinet. */
export function cabinetOrder(discoveries: readonly Concept[]): Concept[] {
  return [...discoveries].reverse()
}
