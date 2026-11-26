import { Metadata } from 'next'
import IdeaLab from '@/components/games/IdeaLab'
import { GameStage } from '@/components/seedpress/GameStage'

export const metadata: Metadata = {
  title: 'The Alchemist | VeryGoodMelon.Fun',
  description: 'Mix two ideas and see what they become. Seven of them are gold, and the heaviest feelings are often the way there.',
}

export default function IdeaLabPage() {
  return (
    <GameStage gameId="idea-lab" title="The Alchemist" lead="Mix two ideas and see what they become." wide sound>
      <IdeaLab />
    </GameStage>
  )
}
