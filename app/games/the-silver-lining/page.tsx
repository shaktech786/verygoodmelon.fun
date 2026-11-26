import type { Metadata } from 'next'
import HopeDaily from '@/components/games/HopeDaily'
import { GameStage } from '@/components/seedpress/GameStage'

export const metadata: Metadata = {
  title: 'The Optimist | VeryGoodMelon.Fun',
  description: 'A true piece of good news each day, with one word missing. Every guess unfolds a little more of the story.'
}

export default function TheOptimistPage() {
  return (
    <GameStage gameId="hope-daily" title="The Optimist" lead="A true piece of good news each day, with one word missing." sound>
      <HopeDaily />
    </GameStage>
  )
}
