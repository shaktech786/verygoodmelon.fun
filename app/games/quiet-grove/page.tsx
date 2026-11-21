import type { Metadata } from 'next'
import Link from 'next/link'
import CalmGarden from '@/components/games/CalmGarden'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const metadata: Metadata = {
  title: 'The Gardener | VeryGoodMelon.Fun',
  description:
    'Plant a small meadow garden that answers what you plant and grows while you are away, then sit with it as the light changes.',
}

export default function QuietGrovePage() {
  return (
    <GamePageWrapper gameId="calm-garden">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl lg:max-w-6xl">
        <div className="animate-fade">
          <div className="text-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-semibold mb-1 text-foreground">
              The Gardener
            </h1>
            <p className="text-sm sm:text-base text-foreground/70 max-w-2xl mx-auto">
              Plant what feels right, then sit with it a while.
            </p>
          </div>

          <CalmGarden />

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
