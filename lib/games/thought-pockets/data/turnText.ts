import { ArgumentPreview, RoundReport } from '@/types/thought-pockets'
import { releaseLeftover } from './enemies'

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

/** What a problem's Shaken does as it changes: "−10 Resolve at once, and Unsettle +5 for next turn". */
export function releaseWords(shaken: number): string {
  const left = releaseLeftover(shaken)
  return `−${shaken} Resolve at once${left > 0 ? `, and Unsettle +${left} for next turn` : ''}`
}

/**
 * How the round that ended a fight is introduced, from what really ended it: the argument alone, the argument
 * and then Unsettle, Unsettle with no argument at all, or a problem's Shaken landing as it changed.
 */
export function finalRoundWords(report: RoundReport): { title: string; noArgument: string } {
  const noArgument = `You made no argument this round${report.unsettleLoss > 0 ? `: Unsettle ${report.unsettleLoss} took the last of its Resolve` : ''}.`
  if (report.phaseChanged && report.released > 0) return { title: `Shaken ${report.released} landed at once and finished it`, noArgument }
  if (report.unsettleLoss === 0) return { title: 'Your winning argument', noArgument }
  if (report.steps.length === 0) return { title: 'Unsettle had the last word', noArgument }
  return { title: `Your argument, then Unsettle ${report.unsettleLoss}, finished it`, noArgument }
}
