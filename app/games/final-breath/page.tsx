import type { Metadata } from 'next'
import LastWords from '@/components/games/LastWords'
import { GameStage } from '@/components/seedpress/GameStage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The Final Word | VeryGoodMelon.Fun',
  description: 'If you had one last thing to say to the world, what would it be? Write it, hear it back, and find out why it does not have to wait.'
}

export default function LastWordsPage() {
  return (
    <GameStage gameId="last-words" title="The Final Word" lead="If you had one last thing to say to the world, what would it be?" sound>
      <LastWords />
    </GameStage>
  )
}
