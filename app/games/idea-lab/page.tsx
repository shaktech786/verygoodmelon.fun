import { Metadata } from 'next'
import IdeaLab from '@/components/games/IdeaLab'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const metadata: Metadata = {
  title: 'The Alchemist | VeryGoodMelon.Fun',
  description: 'Mix two ideas and see what they become. Seven of them are gold, and the heaviest feelings are often the way there.',
}

export default function IdeaLabPage() {
  return (
    <GamePageWrapper gameId="idea-lab">
      <IdeaLab />
    </GamePageWrapper>
  )
}
