import type { Metadata } from 'next'
import BreathingPatterns from '@/components/games/BreathingPatterns'
import { GameStage } from '@/components/seedpress/GameStage'

export const metadata: Metadata = {
  title: 'The Harmonist | VeryGoodMelon.Fun',
  description:
    'Breathe along a shape: box, 4-7-8, coherent, the physiological sigh or your own pace. Each finished breath sets a seed in a melon, and with sound on, each turn of the breath sounds a soft note.',
}

export default function TheStillPointPage() {
  return (
    <GameStage gameId="breathing-patterns" title="The Harmonist" lead="Pick a rhythm and follow the dot around its shape. Each breath you finish becomes a seed." sound>
      <BreathingPatterns />
    </GameStage>
  )
}
