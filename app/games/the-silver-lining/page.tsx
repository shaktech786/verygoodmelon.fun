import type { Metadata } from 'next'
import Link from 'next/link'
import HopeDaily from '@/components/games/HopeDaily'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const metadata: Metadata = {
  title: 'The Optimist | VeryGoodMelon.Fun',
  description: 'One word a day about how the world is getting better. Guess it, then read the good news behind it.'
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
              One word a day, and the good news behind it.
            </p>
          </div>

          <HopeDaily />

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-card-bg text-foreground border border-card-border rounded-lg font-medium hover:bg-hover-bg transition-colors text-sm sm:text-base"
            >
              &larr; Back Home
            </Link>
          </div>
        </div>
      </div>
    </GamePageWrapper>
  )
}
