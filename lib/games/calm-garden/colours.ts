/** The garden's flower colours. */
export const PETALS = ['#e63946', '#f4845f', '#f7b267', '#d4a5f5', '#f9c6d3'] as const

/** One item from a list, chosen by a plant's colour seed in [0, 1). */
export const pickBySeed = <T,>(list: readonly T[], seed: number): T => list[Math.min(list.length - 1, Math.floor(seed * list.length))]
