import type { Metadata } from 'next'
import TheUnrusher from '@/components/games/TheUnrusher'
import { GameStage } from '@/components/seedpress/GameStage'

export const metadata: Metadata = {
  title: 'The Patient One | VeryGoodMelon.Fun',
  description: 'An anti-game about noticing. Watch seeds settle while you stay still, listen to what is already there, or give one small thing a whole minute.'
}

export default function TheUnrusherPage() {
  return (
    <GameStage gameId="the-unrusher" title="The Patient One" lead="Most things get a glance. Give one of them a minute." sound>
      <TheUnrusher />
    </GameStage>
  )
}
