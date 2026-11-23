import type { Metadata } from 'next'
import BreathingPatterns from '@/components/games/BreathingPatterns'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const metadata: Metadata = {
  title: 'The Harmonist | VeryGoodMelon.Fun',
  description:
    'Breathe along a shape: box, 4-7-8, coherent, the physiological sigh or your own pace. Each finished breath sets a seed in a melon, and with sound on, each turn of the breath sounds a soft note.',
}

export default function TheStillPointPage() {
  return (
    <GamePageWrapper gameId="breathing-patterns">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        <div className="animate-fade">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
              The Harmonist
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
              Every breath you finish becomes a seed. Leave with the pattern you made.
            </p>
          </div>

          <BreathingPatterns />
        </div>
      </div>
    </GamePageWrapper>
  )
}
