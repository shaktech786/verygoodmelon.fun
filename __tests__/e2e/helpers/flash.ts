/**
 * Flash measurement for the S3 moments (docs/design-system/PLAN.md section 12.1): a change is a step in
 * relative luminance (0 to 1, WCAG definition) of more than 10% between two frames, and no one second may hold more than three.
 */

export interface LuminanceSample {
  /** Milliseconds on any clock, rising. */
  at: number
  /** Relative luminance of the region, 0 (black) to 1 (white). */
  luminance: number
}

export const FLASH_STEP = 0.1
export const MAX_FLASHES_PER_SECOND = 3

/** The most large steps that fall inside any one second of the samples. */
export function mostFlashesInASecond(samples: LuminanceSample[], step = FLASH_STEP): number {
  const changes: number[] = []
  for (let i = 1; i < samples.length; i++) {
    if (Math.abs(samples[i].luminance - samples[i - 1].luminance) > step) changes.push(samples[i].at)
  }
  let most = 0
  for (let i = 0; i < changes.length; i++) {
    let j = i
    while (j < changes.length && changes[j] - changes[i] < 1000) j++
    most = Math.max(most, j - i)
  }
  return most
}

/** The biggest step between two neighbouring frames. */
export function largestStep(samples: LuminanceSample[]): number {
  let largest = 0
  for (let i = 1; i < samples.length; i++) largest = Math.max(largest, Math.abs(samples[i].luminance - samples[i - 1].luminance))
  return largest
}

/** In page: the relative luminance of 8-bit RGBA pixels, averaged over the region. */
export const MEAN_LUMINANCE_SOURCE = `(data) => {
  const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  let sum = 0
  for (let i = 0; i < data.length; i += 4) sum += 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2])
  return sum / (data.length / 4)
}`
