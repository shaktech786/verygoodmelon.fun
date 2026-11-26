import type { Metadata } from 'next'
import FirstWords from '@/components/games/FirstWords'
import { GameStage } from '@/components/seedpress/GameStage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The Awakening | VeryGoodMelon.Fun',
  description: 'Imagine the moment after your life ends, say your first words, and wake at dawn with one small thing to bring back into tomorrow.'
}

export default function FirstBreathPage() {
  return (
    <GameStage gameId="first-words" title="The Awakening" lead="Imagine the moment after your life ends. Say your first words, then wake up with something for tomorrow." sound>
      <FirstWords />
    </GameStage>
  )
}
