import { EnemyDef, RoundReport } from '@/types/thought-pockets'

/** What took the last of your Resolve, from the round that did it. */
export function defeatLine(report: RoundReport, foe: EnemyDef): string {
  if (report.enemyAttack === 0)
    return `Correcting it stung: Backfire cost you ${report.selfLoss} Resolve for your ${report.selfLoss}-card argument, and that was the last of it.`
  const gamble = report.gamble === 'hit' ? 'Its gamble came off. ' : ''
  const backfire = report.selfLoss > 0 ? ` after Backfire cost you ${report.selfLoss}` : ''
  const through = report.enemyBlocked > 0 ? `Your Guard absorbed ${report.enemyBlocked}, and the ${report.playerLoss} that got through` : `All ${report.playerLoss} got through and`
  return `${gamble}${foe.name} attacked for ${report.enemyAttack}${backfire}. ${through} took the last of your Resolve.`
}
