import { BattleState } from '@/types/thought-pockets'
import { resolveCard } from '../data/cards'
import { conclusionLine, timesWord } from '../data/conclusion'
import { COMPOSURE_GUARD, canPlay, playCard, previewArgument } from './battle'

/**
 * The first fight's coaching line. It only suggests a Guard card when playing one actually lowers
 * the hit and still leaves a stronger card to finish on, because the last card is the Conclusion.
 */
export function tutorialHint(battle: BattleState): string | null {
  const preview = previewArgument(battle)
  const played = battle.played.map(resolveCard)
  const playable = battle.hand.filter((c) => canPlay(battle, c.uid))
  const types = playable.map((c) => resolveCard(c).type)
  if (battle.turn === 1 && played.length === 0) return 'Play an Evidence card. It adds Weight to your argument.'
  if (preview.conclusionEmpty)
    return `Your last card has no Weight or Multiplier, so counting it ${timesWord(preview.conclusionCount)} as the Conclusion adds nothing. Undo it, or finish on a card with Weight or Multiplier.`
  if (battle.turn === 1 && !played.some((d) => d.type === 'logic') && types.includes('logic'))
    return 'Now add a Logic card. It raises the Multiplier, and the damage preview updates.'
  if (preview.enemyFalls) return 'That finishes it before it can act. Press End turn.'
  if (preview.incomingAfterGuard > 0) {
    const guardCard = playable.find((c) => resolveCard(c).type === 'guard')
    if (guardCard) {
      const after = playCard(battle, guardCard.uid)
      const lowers = previewArgument(after).incomingAfterGuard < preview.incomingAfterGuard
      const finisherLeft = after.hand.some((c) => resolveCard(c).type !== 'guard' && canPlay(after, c.uid))
      if (lowers && finisherLeft)
        return `It will hit you for ${preview.incoming}. A Guard card absorbs that this round. Play it before your strongest card, which should come last.`
    }
    if (battle.focus > 0) return `It will hit you for ${preview.incoming}. Each Focus you leave unspent becomes ${COMPOSURE_GUARD} Guard, so holding back is a choice too.`
  }
  if (battle.turn === 2 && played.length === 0) return `Your last card is your Conclusion. ${conclusionLine(battle.school)} Finish with your strongest card.`
  if (playable.length === 0 || battle.focus === 0) return 'Press End turn. Your argument lands, then it acts.'
  return null
}
