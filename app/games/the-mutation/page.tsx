import type { Metadata } from 'next'
import CascadeGame from './CascadeGame'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const metadata: Metadata = {
  title: 'The Shapeshifter | VeryGoodMelon.Fun',
  description:
    'A self-building arcade game that evolves as you play. Every game is unique — no two plays are alike.',
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
