import { Metadata } from 'next'
import HardChoices from '@/components/games/HardChoices'
import { GameStage } from '@/components/seedpress/GameStage'

export const metadata: Metadata = {
  title: 'The Dilemma | VeryGoodMelon.Fun',
  description: 'Twelve everyday questions with no right answer, and a gentle reading of what your choices protect.',
}

export default function HardChoicesPage() {
  return (
    <GameStage
      gameId="hard-choices"
      title="The Dilemma"
      lead="Twelve everyday questions with no right answer. Choose, skip or change your mind, and at the end see what you chose to protect."
      sound
    >
      <HardChoices />
    </GameStage>
  )
}
