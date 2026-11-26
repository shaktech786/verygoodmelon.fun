/** One item from a list, chosen by a plant's colour seed in [0, 1). */
export const pickBySeed = <T,>(list: readonly T[], seed: number): T => list[Math.min(list.length - 1, Math.floor(seed * list.length))]
