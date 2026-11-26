import { GameStage } from '@/components/seedpress/GameStage'
import { ThoughtPockets } from './components/ThoughtPockets'

export default function ThoughtPocketsPage() {
  return (
    <GameStage gameId="thought-pockets" title="The Philosopher" lead="Out-think cognitive biases, one argument at a time." wide sound>
      <ThoughtPockets />
    </GameStage>
  )
}
