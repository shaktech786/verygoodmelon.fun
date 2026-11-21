import type { Metadata } from 'next'
import Link from 'next/link'
import WorryCapsule from '@/components/games/WorryCapsule'
import { GamePageWrapper } from '@/components/games/GamePageWrapper'

export const metadata: Metadata = {
  title: 'The Keeper | VeryGoodMelon.Fun',
  description: 'Seal one worry away and choose when it comes back. When it does, see how it really turned out. Private, and kept only in your browser.'
}

export default function TheKeeperPage() {
  return (
    <GamePageWrapper gameId="worry-capsule">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        <div className="animate-fade">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-foreground">
              The Keeper
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
              Set a worry down. It will wait for you.
            </p>
          </div>

          <WorryCapsule />

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
