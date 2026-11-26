import type { Metadata } from 'next'
import CalmGarden from '@/components/games/CalmGarden'
import { GameStage } from '@/components/seedpress/GameStage'

export const metadata: Metadata = {
  title: 'The Gardener | VeryGoodMelon.Fun',
  description:
    'Plant a small meadow garden that answers what you plant and grows while you are away, then sit with it as the light changes.',
}

export default function QuietGrovePage() {
  return (
    <GameStage
      gameId="calm-garden"
      title="The Gardener"
      lead="Plant what feels right, then sit with it a while."
      keys="Tab to the garden, arrows move, Enter plants, Ctrl+Z undoes."
      wide
      sound
    >
      <CalmGarden />
    </GameStage>
  )
}
