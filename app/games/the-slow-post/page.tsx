import type { Metadata } from 'next'
import WorryCapsule from '@/components/games/WorryCapsule'
import { GameStage } from '@/components/seedpress/GameStage'

export const metadata: Metadata = {
  title: 'The Keeper | VeryGoodMelon.Fun',
  description: 'Seal one worry away and choose when it comes back. When it does, see how it really turned out. Private, and kept only in your browser.'
}

export default function TheKeeperPage() {
  return (
    <GameStage gameId="worry-capsule" title="The Keeper" lead="Set a worry down. It will wait for you." sound>
      <WorryCapsule />
    </GameStage>
  )
}
