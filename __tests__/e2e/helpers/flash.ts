/**
 * Flash measurement for the S3 moments (docs/design-system/PLAN.md section 12.1). Following WCAG, a change is a swing
 * of more than 10% in relative luminance (0 to 1) from the last turning point, not a step between two frames: a strobe
 * made of small steps in one direction and a drop back is still a strobe. A slow fade is one swing. No one second may
 * hold more than three.
 */

export interface LuminanceSample {
  /** Milliseconds on any clock, rising. */
  at: number
  /** Relative luminance of the region, 0 (black) to 1 (white). */
  luminance: number
}

export const FLASH_SWING = 0.1
export const MAX_FLASHES_PER_SECOND = 3

/** When each swing of more than `swing` from the last turning point completed its turn. */
export function swingTimes(samples: LuminanceSample[], swing = FLASH_SWING): number[] {
  const times: number[] = []
  if (samples.length === 0) return times
  let direction = 0
  let extreme = samples[0].luminance
  for (const { at, luminance } of samples) {
    if (direction === 0) {
      if (Math.abs(luminance - extreme) > swing) {
        direction = Math.sign(luminance - extreme)
        extreme = luminance
        times.push(at)
      }
    } else if (direction * (luminance - extreme) > 0) {
      extreme = luminance
    } else if (Math.abs(luminance - extreme) > swing) {
      direction = -direction
      extreme = luminance
      times.push(at)
    }
  }
  return times
}

/** The most swings that fall inside any one second of the samples. */
export function mostFlashesInASecond(samples: LuminanceSample[], swing = FLASH_SWING): number {
  const times = swingTimes(samples, swing)
  let most = 0
  for (let i = 0; i < times.length; i++) {
    let j = i
    while (j < times.length && times[j] - times[i] < 1000) j++
    most = Math.max(most, j - i)
  }
  return most
}

/** In page: the relative luminance of 8-bit RGBA pixels, averaged over the region. */
export const MEAN_LUMINANCE_SOURCE = `(data) => {
  const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  let sum = 0
  for (let i = 0; i < data.length; i += 4) sum += 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2])
  return sum / (data.length / 4)
}`
