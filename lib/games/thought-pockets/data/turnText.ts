import { ArgumentPreview } from '@/types/thought-pockets'

/**
 * The few words on the End turn button. When a rule or Guard stops part of the argument, it shows what the
 * argument would deal and what stops it, "Argue for 9 → 0 (under 12)", so a 0 is never a mystery.
 */
export function argueLabel(preview: ArgumentPreview): string {
  const brings = preview.steps.length > 0 || preview.carriedWeight + preview.doubtWeight > 0
  if (!brings) {
    const hold = preview.composure > 0 ? `Hold: ${preview.composure} Guard` : 'No argument'
    return preview.unsettleTick > 0 ? `${hold} · Unsettle ${preview.unsettleTick}` : hold
  }
  if (preview.damage === preview.raw) return `Argue for ${preview.damage}`
  let before = preview.product
  const reasons: string[] = []
  for (const step of preview.chain) {
    if (step.after < before) reasons.push(step.short)
    before = step.after
  }
  return `Argue for ${preview.raw} → ${preview.damage} (${reasons.join(', ')})`
}
