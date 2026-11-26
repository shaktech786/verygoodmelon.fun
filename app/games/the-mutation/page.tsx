import type { Metadata } from 'next'
import CascadeGame from './CascadeGame'
import { GameStage } from '@/components/seedpress/GameStage'

export const metadata: Metadata = {
  title: 'The Shapeshifter | VeryGoodMelon.Fun',
  description:
    'A small, calm arcade game that grows the rules you choose, or rests if you let it, and ends its own way each time. Nothing in it can hurt you.',
}

export default function CascadePage() {
  return (
    <GameStage
      gameId="cascade"
      title="The Shapeshifter"
      lead="A calm arcade game that learns six new rules, in a new order each time."
      wide
      sound
    >
      <CascadeGame />
    </GameStage>
  )
}
