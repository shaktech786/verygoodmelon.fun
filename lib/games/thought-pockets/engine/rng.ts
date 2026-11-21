export interface Roll {
  value: number
  rng: number
}

export function seedRng(seed: number): number {
  return (seed ^ 0x9e3779b9) >>> 0
}

export function roll(rng: number): Roll {
  const next = (rng + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, rng: next }
}

export function rollInt(rng: number, min: number, max: number): Roll {
  const r = roll(rng)
  return { value: min + Math.floor(r.value * (max - min + 1)), rng: r.rng }
}

export function shuffle<T>(items: readonly T[], rng: number): { items: T[]; rng: number } {
  const result = [...items]
  let state = rng
  for (let i = result.length - 1; i > 0; i--) {
    const r = rollInt(state, 0, i)
    state = r.rng
    ;[result[i], result[r.value]] = [result[r.value], result[i]]
  }
  return { items: result, rng: state }
}

export function pick<T>(items: readonly T[], rng: number): { item: T; rng: number } {
  const r = rollInt(rng, 0, items.length - 1)
  return { item: items[r.value], rng: r.rng }
}
