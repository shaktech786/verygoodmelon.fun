import { Metadata } from 'next'
import HardChoices from '@/components/games/HardChoices'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const metadata: Metadata = {
  title: 'The Dilemma | VeryGoodMelon.Fun',
  description: 'Twelve everyday questions with no right answer, and a gentle reading of what your choices protect.',
}

export default function HardChoicesPage() {
  return (
    <GamePageWrapper gameId="hard-choices">
      <HardChoices />
    </GamePageWrapper>
  )
}
