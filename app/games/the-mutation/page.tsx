import type { Metadata } from 'next'
import CascadeGame from './CascadeGame'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const metadata: Metadata = {
  title: 'The Shapeshifter | VeryGoodMelon.Fun',
  description:
    'A small, calm arcade game that learns six new rules as you play, in a new order every time. Nothing in it can hurt you.',
}

export default function CascadePage() {
  return (
    <GamePageWrapper gameId="cascade">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        <CascadeGame />
      </div>
    </GamePageWrapper>
  )
}
