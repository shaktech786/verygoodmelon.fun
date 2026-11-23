import type { Metadata } from 'next'
import HopeDaily from '@/components/games/HopeDaily'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const metadata: Metadata = {
  title: 'The Optimist | VeryGoodMelon.Fun',
  description: 'A true piece of good news each day, with one word missing. Every guess unfolds a little more of the story.'
}

export default function TheOptimistPage() {
  return (
    <GamePageWrapper gameId="hope-daily">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        <div className="animate-fade">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
              The Optimist
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
              A true piece of good news each day, with one word missing.
            </p>
          </div>

          <HopeDaily />
        </div>
      </div>
    </GamePageWrapper>
  )
}
